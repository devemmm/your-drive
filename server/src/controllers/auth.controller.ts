import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import { generateToken } from "../utils/generateToken";
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail, sendWebPasswordResetEmail } from "../config/email";
import { generateAvatar } from "../utils/GenerateAvatar";
import { uploadToStorage } from "../utils/storage";
import {
  AssetCategory,
  AssetType,
  Prisma,
  Status,
  User,
  UserRole,
} from "@prisma/client";
import { generateVerificationCode } from "../utils";
import { profileSelects } from "../types";
import { generateReferralCode } from "../utils/generateReferralCode";
import { matchedData } from "express-validator";
import { oAuth2Client } from "../config/google";
import { SmsService } from "../services/sms.service";
import { logger, LogLevel } from "../utils/logger";
import moment from "moment";
import { v4 } from "uuid";

export class AuthController {
  static login = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, password, role } = matchedData<{
        email: string;
        password: string;
        role?: UserRole;
      }>(req, {
        locations: ["body"],
      });
      const isEnglishPreferred = req.isEnglishPreferred;

      let message = "";
      const user = await prisma.user.findUnique({
        where: { email, isDeleted: false },
        select: { ...profileSelects, password: true },
      });

      if (!user) {
        message = isEnglishPreferred
          ? "Invalid credentials."
          : "Informations d'identification invalides.";
        return next(AppError(message, 401));
      }

      if (role && user.role !== role) {
        message = isEnglishPreferred
          ? "You are not authorized to access this resource."
          : "Vous n'êtes pas autorisé à accéder à cette ressource.";
        return next(AppError(message, 403));
      }

      if (user.status === Status.SUSPENDED) {
        return next(
          AppError(
            req.isEnglishPreferred
              ? "Your account has been suspended"
              : "Votre compte a été suspendu",
            403
          )
        );
      }

      if (!role && user.role === UserRole.ADMIN) {
        message = isEnglishPreferred
          ? "Admins are not allowed."
          : "Les administrateurs ne sont pas autorisés.";
        return next(AppError(message, 403));
      }

      // Email-based 2FA and email-verification are disabled/removed.
      const is2FA = false;
      if (!user.password) {
        return next(
          AppError(
            isEnglishPreferred
              ? "Invalid credentials. you may use google login option"
              : "Identifiants invalides. Vous pouvez utiliser l'option de connexion Google."
          )
        );
      }

      const passwordIsCorrect = await bcrypt.compare(password, user.password);
      if (!passwordIsCorrect)
        return next(
          AppError(
            isEnglishPreferred
              ? "Invalid credentials."
              : "Informations d'identification invalides.",
            401
          )
        );

      if (is2FA) {
        // no-op (kept only for backwards compatibility)
      }
      const loginLogData = {
        message: isEnglishPreferred
          ? "User logged in successfully."
          : "Utilisateur connecté avec succès.",
        action: "login",
        userId: user.id,
        meta: {
          userId: user.id,
          email: user.email,
          role: user.role,
          firsName: user.firstName,
          lastName: user.lastName,
          date: new Date().toISOString(),
        },
      };

      logger.info(loginLogData.message, {
        action: loginLogData.action,
        userId: loginLogData.userId,
        meta: loginLogData.meta,
      });
      const token = generateToken(user);
      const { password: userPasword, ...rest } = user;
      return res.status(200).json({
        success: true,
        data: { token, user: rest },
      });
    }
  );

  static register = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        firstName,
        lastName,
        email,
        password,
        referralCode,
        agreeToTerms,
        subscribeToUpdates,
      } = matchedData<{
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        agreeToTerms: boolean;
        subscribeToUpdates?: boolean;
        referralCode?: string;
      }>(req);
      let isEnglishPreferred = req.isEnglishPreferred;

      let message = "";

      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        if (emailExists.isDeleted) {
          const hashedPassword = await bcrypt.hash(password, 10);
          // Email verification removed

          let inviter: User | null = null;
          let alreadyReferred = false;

          if (referralCode) {
            inviter = await prisma.user.findUnique({
              where: { referralCode },
            });
          }
          if (inviter) {
            // before creating referral, make sure this email has never been referred
            const alreadyRef = await prisma.referral.findFirst({
              where: { invitee: { email } },
            });
            alreadyReferred = !!alreadyRef;
          }

          const reactivatedUser = await prisma.user.update({
            where: { id: emailExists.id },
            data: {
              firstName,
              lastName,
              email,
              password: hashedPassword,
              verificationCode: null,
              verificationCodeExpiresAt: null,
              isDriverOnboarded: false,
              isPassengerOnboarded: false,
              isOnboarded: false,
              isEmailVerified: true,
              isPhoneVerified: false,
              isVerified: false,
              deletedAt: null,
              status: Status.ACTIVE,
              isDeleted: false,
              phoneNumber: null,
              role: UserRole.USER,
              termsAccepted: agreeToTerms,
              acceptedReceiveUpdates: subscribeToUpdates,
              ...(!emailExists.referralCode && {
                referralCode: await generateReferralCode(),
              }),
              // If referred, create Referral record
              ...(inviter &&
                !alreadyReferred && {
                receivedReferral: {
                  upsert: {
                    create: {
                      inviterId: inviter.id,
                    },
                    update: {
                      inviterId: inviter.id,
                    },
                  },
                },
              }),
            },
            select: profileSelects,
          });

          const reactivatedToken = generateToken(reactivatedUser);
          return res.status(201).json({
            success: true,
            data: { token: reactivatedToken, user: reactivatedUser },
            message: isEnglishPreferred
              ? "Registration successful."
              : "Inscription réussie.",
          });
        }
        message = isEnglishPreferred
          ? "Account with this email already exist."
          : "Un compte avec ce courriel existe déjà.";
        return next(AppError(message, 409));
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      // Email verification removed

      const avatarSvg = await generateAvatar(`${firstName} ${lastName}`);
      const profileImageUrl = avatarSvg ? await uploadToStorage(avatarSvg, true).catch(() => null) : null;

      let inviter: User | null = null;
      let alreadyReferred = false;

      if (referralCode) {
        inviter = await prisma.user.findUnique({
          where: { referralCode },
        });
      }

      if (inviter) {
        // before creating referral, make sure this email has never been referred
        const alreadyRef = await prisma.referral.findFirst({
          where: { invitee: { email } },
        });
        alreadyReferred = !!alreadyRef;
      }

      const createdUser = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          termsAccepted: agreeToTerms,
          acceptedReceiveUpdates: subscribeToUpdates,
          ...(profileImageUrl && {
            profileImage: {
              create: {
                url: profileImageUrl.secure_url,
                publicId: profileImageUrl.public_id,
                type: AssetType.IMAGE,
                category: AssetCategory.PROFILE_PICTURE,
              },
            },
          }),
          isEmailVerified: true,
          verificationCode: null,
          verificationCodeExpiresAt: null,
          referralCode: await generateReferralCode(),

          // If referred, create Referral record
          ...(inviter &&
            !alreadyReferred && {
            receivedReferral: {
              create: {
                inviterId: inviter.id,
              },
            },
          }),
        },
        select: profileSelects,
      });
      const signupLogData = {
        level: LogLevel.INFO,
        message: isEnglishPreferred
          ? "User registered successfully."
          : "Utilisateur enregistré avec succès.",
        action: "signup",
        userId: createdUser.id,
        meta: {
          userId: createdUser.id,
          email,
          role: UserRole.USER,
          firstName,
          lastName,
          date: new Date().toISOString(),
        },
      };

      logger.info(signupLogData.message, {
        action: signupLogData.action,
        userId: signupLogData.userId,
        meta: signupLogData.meta,
      });

      const token = generateToken(createdUser);
      return res.status(201).json({
        success: true,
        data: { token, user: createdUser },
        message: isEnglishPreferred
          ? "Registration successful."
          : "Inscription réussie.",
      });
    }
  );

  static verifyEmail = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, code } = matchedData<{ email: string; code: string }>(req);

      const isEnglishPreferred = req.isEnglishPreferred;

      let message = "";

      const userExists = await prisma.user.findUnique({
        where: { email, isDeleted: false },
      });
      if (!userExists) {
        message = isEnglishPreferred
          ? "No account associated with this email"
          : "Aucun compte associé à ce courriel.";
        return next(AppError(message, 404));
      }

      message = isEnglishPreferred
        ? "Invalid verification code."
        : "Code de vérification invalide.";

      if (!userExists.verificationCode || code != userExists.verificationCode)
        return next(AppError(message, 400));
      if (
        !userExists.verificationCodeExpiresAt ||
        new Date() > userExists.verificationCodeExpiresAt
      ) {
        message = isEnglishPreferred
          ? "Verification code has expired."
          : "Le code de vérification a expiré.";
        return next(AppError(message, 400));
      }

      const verifiedUser = await prisma.user.update({
        where: { id: userExists.id },
        data: {
          isEmailVerified: true,
          ...(userExists.isPhoneVerified && {
            isVerified: true,
          }),
          verificationCode: null,
          verificationCodeExpiresAt: null,
        },
        select: profileSelects,
      });

    

      const token = generateToken({
        id: verifiedUser.id,
        email: verifiedUser.email,
      });

      const verifyLogData = {
        level: LogLevel.INFO,
        message: isEnglishPreferred
          ? "Email verified successfully."
          : "Courriel vérifié avec succès.",
        action: "email_verification",
        userId: verifiedUser.id,
        meta: {
          userId: verifiedUser.id,
          email: verifiedUser.email,
          role: verifiedUser.role,
          firstName: verifiedUser.firstName,
          lastName: verifiedUser.lastName,
          date: new Date().toISOString(),
        },
      };

      logger.info(verifyLogData.message, {
        action: verifyLogData.action,
        userId: verifyLogData.userId,
        meta: verifyLogData.meta,
      });
      return res.status(200).json({
        success: true,
        data: { token, user: verifiedUser },
        message: isEnglishPreferred
          ? "Email verified successfully."
          : "Courriel vérifié avec succès.",
      });
    }
  );

  static verify2FA = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, code } = matchedData<{ email: string; code: string }>(req);

      const isEnglishPreferred = req.isEnglishPreferred;

      let message = "";

      const userExists = await prisma.user.findUnique({
        where: { email, isDeleted: false },
      });
      if (!userExists) {
        const userExistsLogData = {
          level: LogLevel.ERROR,
          message: isEnglishPreferred
            ? "No account associated with this email"
            : "Aucun compte associé à ce courriel.",
          action: "2fa_verification",
          userId: undefined,
        };

        logger.error(userExistsLogData.message, {
          action: userExistsLogData.action,
          userId: userExistsLogData.userId,
        });
        message = isEnglishPreferred
          ? "No account associated with this email"
          : "Aucun compte associé à ce courriel.";
        return next(AppError(message, 404));
      }

      message = isEnglishPreferred
        ? "Invalid verification code."
        : "Code de vérification invalide.";

      if (!userExists.verificationCode || code != userExists.verificationCode)
        return next(AppError(message, 400));
      if (
        !userExists.verificationCodeExpiresAt ||
        new Date() > userExists.verificationCodeExpiresAt
      ) {
        message = isEnglishPreferred
          ? "Verification code has expired."
          : "Le code de vérification a expiré.";
        return next(AppError(message, 400));
      }

      const verifiedUser = await prisma.user.update({
        where: { id: userExists.id },
        data: {
          ...(!userExists.isVerified &&
            userExists.isEmailVerified &&
            userExists.isPhoneVerified && {
            isVerified: true,
          }),
          ...(!userExists.isVerified && {
            isEmailVerified: true,
          }),
          verificationCode: null,
          verificationCodeExpiresAt: null,
        },
        select: profileSelects,
      });

      const token = generateToken({
        id: verifiedUser.id,
        email: verifiedUser.email,
      });
      return res.status(200).json({
        success: true,
        data: { token, user: verifiedUser },
        message: isEnglishPreferred
          ? "logged in successfully."
          : "Connecté avec succès.",
      });
    }
  );

  static forgotPasswordWeb = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, phone } = matchedData<{ email?: string; phone?: string }>(
        req,
        { locations: ["body"] }
      );
      const isEN = req.isEnglishPreferred;

      // must provide one
      if (email && phone) {
        return next(
          AppError(
            isEN
              ? "Please provide either email or phone number, not both."
              : "Veuillez fournir soit un courriel, soit un numéro de téléphone, pas les deux.",
            400
          )
        );
      }
      if (!email && !phone) {
        return next(
          AppError(
            isEN
              ? "Email or phone number is required."
              : "Un courriel ou un numéro de téléphone est requis.",
            400
          )
        );
      }
      const message = isEN
        ? `We have sent ${email
          ? "an email with instrutions to reset your password to " + email
          : "a code to phone number " + phone
        }.`
        : `Nous avons envoyé ${email
          ? "un courriel avec des instructions pour réinitialiser votre mot de passe à " +
          email
          : "un code au numéro de téléphone " + phone
        }.`;

      const where = email
        ? { email, isDeleted: false }
        : { phoneNumber: phone, isDeleted: false };
      const user = await prisma.user.findUnique({ where });

      // Always respond with generic message to avoid account enumeration
      if (!user) {
        return res.status(200).json({ success: true, message });
      }

      if (email) {
        // Create UUID token
        const resetToken = v4();
        const resetTokenExpiry = moment().add(1, "hour").toDate();

        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetToken,
            resetTokenExpiry,
          },
        });
      } else {
        const { verificationCode, verificationCodeExpiresAt } =
          generateVerificationCode(60 * 60 * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetToken: verificationCode,
            resetTokenExpiry: verificationCodeExpiresAt,
          },
        });
        const isSmsSent = await SmsService.sendSMS(
          phone!,
          isEN
            ? `Please use this code to reset your password: ${verificationCode}.`
            : `Veuillez utiliser ce code pour réinitialiser votre mot de passe : ${verificationCode}.`
        );
        if (!isSmsSent) {
          return next(
            AppError(
              isEN
                ? "Failed to send reset instructions. Please try again later or use email option."
                : "Échec de l'envoi des instructions de réinitialisation. Veuillez réessayer plus tard ou utiliser l'option courriel.",
              500
            )
          );
        }
      }
      return res.status(200).json({ success: true, message });
    }
  );

  static resetPasswordWeb = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { token, newPassword, phone } = matchedData<{
        token: string;
        newPassword: string;
        phone?: string;
      }>(req);
      const isEN = req.isEnglishPreferred;

      // Find user by token, ensure not expired
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: new Date() },
          isDeleted: false,
          ...(phone && { phoneNumber: phone }),
        },
      });

      if (!user) {
        return next(
          AppError(
            isEN
              ? "Invalid or expired reset token."
              : "Jeton de réinitialisation non valide ou expiré.",
            400
          )
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      // Send confirmation
      if (phone) {
        await SmsService.sendSMS(
          phone,
          isEN
            ? "Your password has been reset successfully."
            : "Votre mot de passe a été réinitialisé avec succès."
        );
      } else {
      }
      return res.status(200).json({
        success: true,
        message: isEN
          ? "Password reset successful."
          : "Réinitialisation du mot de passe réussie.",
      });
    }
  );

  static forgotPassword = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, phone } = matchedData<{ email?: string; phone?: string }>(
        req,
        {
          locations: ["body"],
        }
      );
      const isEnglishPreferred = req.isEnglishPreferred;
      let message = "";

      // both fields can not be provided at once
      if (email && phone) {
        message = isEnglishPreferred
          ? "Please provide either email or phone number, not both."
          : "Veuillez fournir soit un courriel, soit un numéro de téléphone, pas les deux.";
        return next(AppError(message, 400));
      }

      if (!email && !phone) {
        const notEmailAndNotPhoneFoundLogData = {
          level: LogLevel.ERROR,
          message: isEnglishPreferred
            ? "Email or phone number is required."
            : "Un courriel ou un numéro de téléphone est requis.",
          action: "forgot_password",
          userId: undefined,
          meta: {
            userId: undefined,
            email,
            phone,
            date: new Date().toISOString(),
          },
        };

        logger.error(notEmailAndNotPhoneFoundLogData.message, {
          action: notEmailAndNotPhoneFoundLogData.action,
          userId: notEmailAndNotPhoneFoundLogData.userId,
          meta: notEmailAndNotPhoneFoundLogData.meta,
        });
        message = isEnglishPreferred
          ? "Email or phone number is required."
          : "Un courriel ou un numéro de téléphone est requis.";
        return next(AppError(message, 400));
      }
      // Find user by email or phone
      const where = email
        ? { email, isDeleted: false }
        : { phoneNumber: phone, isDeleted: false };
      const user = await prisma.user.findUnique({
        where,
      });

      if (phone) {
        // If no user, disguise by returning a success message to avoid attacks
        message = isEnglishPreferred
          ? `We have sent a code to phone number ${phone}.`
          : `Nous avons envoyé un code au numéro de téléphone ${phone}.`;
        if (!user) {
          return res.status(200).json({
            success: true,
            message,
          });
        }
 
        // Use a short numeric code for SMS
        const {
          verificationCode: resetToken,
          verificationCodeExpiresAt: resetTokenExpiry,
        } = generateVerificationCode(60 * 60 * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken, resetTokenExpiry },
        });
        const isSmsSent = await SmsService.sendSMS(
          phone,
          req.isEnglishPreferred
            ? `Please use this code to reset your password: ${resetToken}.`
            : `Veuillez utiliser ce code pour réinitialiser votre mot de passe : ${resetToken}.`
        );
        // const isSmsSent = await SmsService.sendSmsViaPindo(
        //   phone,
        //   req.isEnglishPreferred
        //     ? `Please use this code to reset your password: ${resetToken}.`
        //     : `Veuillez utiliser ce code pour réinitialiser votre mot de passe : ${resetToken}.`
        // );
        if (!isSmsSent) {
          return next(
            AppError(
              isEnglishPreferred
                ? "Failed to send reset instructions. Please try again later or use email option."
                : "Échec de l'envoi des instructions de réinitialisation. Veuillez réessayer plus tard ou utiliser l'option courriel.",
              500
            )
          );
        }
        return res.status(200).json({
          success: true,
          message,
        });
      }

      message = isEnglishPreferred
        ? `Password reset instructions sent to email ${email}.`
        : `Instructions de réinitialisation du mot de passe envoyées à l'adresse courriel ${email}.`;
      const {
        verificationCode: resetToken,
        verificationCodeExpiresAt: resetTokenExpiry,
      } = generateVerificationCode(60 * 60 * 1000);
      if (!user) {
        return res.status(200).json({
          success: true,
          message,
        });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      // Fire-and-forget: SES adapter swallows errors and returns false when
      // unconfigured or when the send fails. We intentionally do not surface
      // the result — the generic success message above already disguises
      // whether the email was registered. QA reads resetToken from the DB
      // until SES credentials are provisioned. See:
      // docs/superpowers/specs/2026-05-31-ses-password-reset-design.md
      await sendPasswordResetEmail(user.email!, resetToken);

      const forgotPasswordLogData = {
        level: LogLevel.INFO,
        message: isEnglishPreferred
          ? "Password reset instructions sent successfully."
          : "Instructions de réinitialisation du mot de passe envoyées avec succès.",
        action: "forgot_password",
        userId: user.id,
        meta: {
          userId: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          date: new Date().toISOString(),
        },
      };

      logger.info(forgotPasswordLogData.message, {
        level: forgotPasswordLogData.level,
        action: forgotPasswordLogData.action,
        userId: forgotPasswordLogData.userId,
        meta: forgotPasswordLogData.meta,
      });
      return res.status(200).json({
        success: true,
        message,
      });
    }
  );

  static resetPassword = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { token, newPassword, email, phone } = matchedData<{
        token: string;
        newPassword: string;
        phone?: string;
        email?: string;
      }>(req);
      const isEnglishPreferred = req.isEnglishPreferred;

      if (!email && !phone) {
        const notEmailAndNotPhoneFoundLogData = {
          level: LogLevel.ERROR,
          message: isEnglishPreferred
            ? "Email or phone number is required."
            : "Un courriel ou un numéro de téléphone est requis.",
          action: "forgot_password",
          userId: undefined,
          meta: {
            userId: undefined,
            email,
            phone,
            date: new Date().toISOString(),
          },
        };

        logger.error(notEmailAndNotPhoneFoundLogData.message, {
          action: notEmailAndNotPhoneFoundLogData.action,
          userId: notEmailAndNotPhoneFoundLogData.userId,
          meta: notEmailAndNotPhoneFoundLogData.meta,
        });
        return next(
          AppError(
            isEnglishPreferred
              ? "Email or phone number is required."
              : "Un courriel ou un numéro de téléphone est requis.",
            400
          )
        );
      }

      const user = await prisma.user.findFirst({
        where: {
          ...(phone
            ? { phoneNumber: phone, isDeleted: false, resetToken: token }
            : { email, resetToken: token, isDeleted: false }),
          resetTokenExpiry: { gt: new Date() },
        },
      });

      let message = "";

      if (!user || user.resetToken !== token) {
        message = isEnglishPreferred
          ? "Invalid or expired reset token."
          : "Jeton de réinitialisation non valide ou expiré.";
        return next(AppError(message, 400));
      }

      message = isEnglishPreferred
        ? "Password reset successful."
        : "Réinitialisation du mot de passe réussie.";

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      // ToDo: Revoke the current token to enforce the user to login again

      // Send confirmation
      if (phone) {
        await SmsService.sendSMS(
          phone,
          isEnglishPreferred
            ? "Your password has been reset successfully."
            : "Votre mot de passe a été réinitialisé avec succès."
        );
      } else {
      
      }
      return res.status(200).json({
        success: true,
        message,
      });
    }
  );

  static resendVerification = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, phone } = matchedData<{ email?: string; phone?: string }>(
        req,
        {
          locations: ["body"],
        }
      );
      const isEnglishPreferred = req.isEnglishPreferred;
      let message = isEnglishPreferred
        ? `Verification code has been resent to your ${email ? "email address" : "phone number"
        }`
        : `Le code de vérification a été renvoyé à votre ${email ? "adresse courriel" : "numéro de téléphone"
        }`;

      if (!email && !phone) {
        return next(
          AppError(
            isEnglishPreferred
              ? "Email or phone number is required."
              : "Un courriel ou un numéro de téléphone est requis.",
            400
          )
        );
      }

      const where = email
        ? { email, isDeleted: false }
        : { phoneNumber: phone, isDeleted: false };
      const user = await prisma.user.findUnique({
        where: {
          ...where,
          verificationCode: { not: null },
          // verificationCodeExpiresAt: { gt: new Date() },
        },
      });
      if (!user) {
        message = isEnglishPreferred
          ? `No account associated with this ${email ? "email address" : "phone number"
          }`
          : `Aucun compte associé à cette ${email ? "adresse courriel" : "numéro de téléphone"
          }`;
        return next(AppError(message, 404));
      }

      // if (user.isVerified) {
      //   message = isEnglishPreferred
      //     ? "Email is already verified"
      //     : "Le courriel est déjà vérifié";
      //   return next(AppError(message, 400));
      // }

      const { verificationCode, verificationCodeExpiresAt } =
        generateVerificationCode(24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationCode,
          verificationCodeExpiresAt,
        },
      });

      if (phone) {
        const isOtpSet = await SmsService.sendSMS(
          phone,
          !(req as any).isEnglishPreferred
            ? `Your-Drive: Votre code de vérification est: ${verificationCode}. Ce code expirera dans 24 heures.`
            : `Your-Drive: Your verification code is: ${verificationCode}. This code will expire in 24 hours.`
        );
        if (!isOtpSet) {
          return next(
            AppError(
              isEnglishPreferred
                ? "Error occurred while adding phone number, please try again"
                : "Une erreur s'est produite lors de l'ajout du numéro de téléphone, veuillez réessayer",
              500
            )
          );
        }
      } else {
      }
      return res.status(200).json({
        success: true,
        message,
      });
    }
  );

  // static appleCallback = catchAsync(async (req: Request, res: Response) => {
  //   const { user, token } = req.user as any;
  //   res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?token=${token}`);
  // });

  static googleAuth = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { code, referralCode } = matchedData<{
        code: string;
        referralCode?: string;
      }>(req);
      const isEn = req.isEnglishPreferred;
      const { tokens } = await oAuth2Client.getToken(code);
      if (!tokens.id_token) {
        const errorLogData = {
          level: LogLevel.ERROR,
          message: isEn
            ? "Google authentication failed. No ID token received."
            : "Échec de l'authentification Google. Aucun jeton d'identification reçu.",
          action: "google_auth",
          userId: undefined,
          meta: {
            date: new Date().toISOString(),
            error: "No ID token received",
          },
        };
        logger.error(errorLogData.message, {
          level: errorLogData.level,
          action: errorLogData.action,
          userId: errorLogData.userId,
          meta: errorLogData.meta,
        });

        return next(
          AppError(
            isEn
              ? "Google authentication failed."
              : "Échec de l'authentification Google.",
            401
          )
        );
      }
      const ticket = await oAuth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      const {
        sub,
        email,
        picture,
        given_name,
        family_name,
        name: googleName,
        email_verified,
      } = payload || {};
      const firstName = given_name;
      const lastName = family_name;
      if (!sub || !email) {
        return next(
          AppError(
            isEn
              ? "Google authentication failed."
              : "Échec de l'authentification Google.",
            401
          )
        );
      }

      // Try to find user by googleId or email
      let user = await prisma.user.findFirst({
        where: {
          OR: [{ googleId: sub }, { email }],
        },
        select: {
          ...profileSelects,
          googleId: true,
          isDeleted: true,
          isWelcomeEmailSent: true,
        },
      });

      const name = googleName || `${firstName ?? ""} ${lastName ?? ""}`.trim() || email;

      if (!user) {
        const uploadedImage = await uploadToStorage(
          picture ? picture : await generateAvatar(name!),
          picture ? false : true
        );
        if (!uploadedImage) {
          return next(
            AppError(
              isEn
                ? "Failed to upload profile image."
                : "Échec du téléchargement de l'image de profil.",
              500
            )
          );
        }

        // check inviter if referralCode passed
        let inviter: User | null = null;
        let alreadyReferred = false;
        if (referralCode) {
          inviter = await prisma.user.findUnique({
            where: { referralCode },
          });
        }
        if (inviter) {
          // before creating referral, make sure this email has never been referred
          const alreadyRef = await prisma.referral.findFirst({
            where: { invitee: { email } },
          });
          alreadyReferred = !!alreadyRef;
        }

        user = await prisma.user.create({
          data: {
            googleId: sub,
            email,
            firstName,
            lastName,
            isEmailVerified: email_verified,
            profileImage: {
              create: {
                url: uploadedImage.secure_url,
                publicId: uploadedImage.public_id,
                type: AssetType.IMAGE,
                category: AssetCategory.PROFILE_PICTURE,
              },
            },
            referralCode: await generateReferralCode(),

            // only on registration
            ...(inviter &&
              !alreadyReferred && {
              receivedReferral: {
                create: { inviterId: inviter.id },
              },
            }),
          },
          select: {
            ...profileSelects,
            googleId: true,
            isDeleted: true,
            isWelcomeEmailSent: true,
          },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { isWelcomeEmailSent: true },
        });
      } else {
        if (user.role === UserRole.ADMIN) {
          const message = isEn
            ? "Admins are not allowed."
            : "Les administrateurs ne sont pas autorisés.";
          return next(AppError(message, 403));
        }
        const updateData: Prisma.UserUpdateInput = {};
        const wasUserDeleted = user.isDeleted;
        if (wasUserDeleted) {
          updateData.deletedAt = null;
          updateData.isDeleted = false;
          updateData.isPassengerOnboarded = false;
          updateData.isDriverOnboarded = false;
          updateData.isOnboarded = false;
          updateData.isVerified = false;
          updateData.isEmailVerified = email_verified;
          updateData.isPhoneVerified = false;
          updateData.status = Status.ACTIVE;
          updateData.role = UserRole.USER;
        } else {
          if (!user.isEmailVerified && email_verified) {
            updateData.isEmailVerified = true;
          }

          if (!user.googleId) {
            updateData.googleId = sub;
          }
          if (!user.isEmailVerified) {
            updateData.isEmailVerified = email_verified;
            if (
              user.isPhoneVerified &&
              user.phoneNumber &&
              !user.isVerified &&
              email_verified
            ) {
              updateData.isVerified = true;
            }
          }
          if (
            user.isPhoneVerified &&
            user.phoneNumber &&
            !user.isVerified &&
            email_verified
          ) {
            updateData.isVerified = true;
          }
        }
        if (!user.referralCode) {
          updateData.referralCode = await generateReferralCode();
        }

        if (Object.values(updateData).length > 0) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
              ...profileSelects,
              googleId: true,
              isDeleted: true,
              isWelcomeEmailSent: true,
            },
          });

          // This can be done in background
          if (wasUserDeleted) {
            // Send welcome email after successful registration
         
            if (!user.isWelcomeEmailSent) {
              await prisma.user.update({
                where: { id: user.id },
                data: { isWelcomeEmailSent: true },
              });
            }
          }
        }
      }

      const { isDeleted, googleId, isWelcomeEmailSent, ...rest } = user;

      const token = generateToken(user);
      const loginLogData = {
        level: LogLevel.INFO,
        message: isEn
          ? "User logged in successfully via Google."
          : "Utilisateur connecté avec succès via Google.",
        action: "google_login",
        userId: user.id,
        meta: {
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          date: new Date().toISOString(),
        },
      };

      logger.info(loginLogData.message, {
        level: loginLogData.level,
        action: loginLogData.action,
        userId: loginLogData.userId,
        meta: loginLogData.meta,
      });
      return res.status(200).json({
        success: true,
        message: isEn ? "Logged in successfully." : "Connecté avec succès.",
        data: { token, user: rest },
      });
    }
  );

  static mobileGoogleAuth = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { idToken, referralCode } = matchedData<{
        idToken: string;
        referralCode?: string;
      }>(req);
      const isEn = req.isEnglishPreferred;

      const allowedAudiences = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
      ].filter(cl => cl !== undefined);
      const ticket = await oAuth2Client.verifyIdToken({
        idToken,
        audience: allowedAudiences,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        return next(
          AppError(
            isEn
              ? "Google authentication failed."
              : "Échec de l'authentification Google.",
            401
          )
        );
      }

      const {
        sub,
        email,
        picture,
        given_name,
        family_name,
        name: googleName,
        email_verified,
      } = payload;
      const name = googleName || `${given_name ?? ""} ${family_name ?? ""}`.trim() || email;
      if (!sub || !email) {
        return next(
          AppError(
            isEn
              ? "Google authentication failed."
              : "Échec de l'authentification Google.",
            401
          )
        );
      };

      const firstName = given_name;
      const lastName = family_name;

      // Try to find user by googleId or email
      let user = await prisma.user.findFirst({
        where: {
          OR: [{ googleId: sub }, { email }],
        },
        select: {
          ...profileSelects,
          googleId: true,
          isDeleted: true,
          isWelcomeEmailSent: true,
        },
      });

      if (!user) {
        const uploadedImage = await uploadToStorage(
          picture ? picture : await generateAvatar(name!),
          picture ? false : true
        );
        if (!uploadedImage) {
          return next(
            AppError(
              isEn
                ? "Failed to upload profile image."
                : "Échec du téléchargement de l'image de profil.",
              500
            )
          );
        }

        // check inviter if referralCode passed
        let inviter: User | null = null;
        let alreadyReferred = false;
        if (referralCode) {
          inviter = await prisma.user.findUnique({
            where: { referralCode },
          });
        }
        if (inviter) {
          // before creating referral, make sure this email has never been referred
          const alreadyRef = await prisma.referral.findFirst({
            where: { invitee: { email } },
          });
          alreadyReferred = !!alreadyRef;
        }

        user = await prisma.user.create({
          data: {
            googleId: sub,
            email,
            firstName,
            lastName,
            isEmailVerified: email_verified,
            profileImage: {
              create: {
                url: uploadedImage.secure_url,
                publicId: uploadedImage.public_id,
                type: AssetType.IMAGE,
                category: AssetCategory.PROFILE_PICTURE,
              },
            },
            referralCode: await generateReferralCode(),

            // only on registration
            ...(inviter &&
              !alreadyReferred && {
              receivedReferral: {
                create: { inviterId: inviter.id },
              },
            }),
          },
          select: {
            ...profileSelects,
            googleId: true,
            isDeleted: true,
            isWelcomeEmailSent: true,
          },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { isWelcomeEmailSent: true },
        });
      } else {
        if (user.role === UserRole.ADMIN) {
          const message = isEn
            ? "Admins are not allowed."
            : "Les administrateurs ne sont pas autorisés.";
          return next(AppError(message, 403));
        }
        const updateData: Prisma.UserUpdateInput = {};
        const wasUserDeleted = user.isDeleted;
        if (wasUserDeleted) {
          updateData.deletedAt = null;
          updateData.isDeleted = false;
          updateData.isPassengerOnboarded = false;
          updateData.isDriverOnboarded = false;
          updateData.isOnboarded = false;
          updateData.isVerified = false;
          updateData.isEmailVerified = email_verified;
          updateData.isPhoneVerified = false;
          updateData.status = Status.ACTIVE;
          updateData.role = UserRole.USER;
        } else {
          if (!user.isEmailVerified && email_verified) {
            updateData.isEmailVerified = true;
          }

          if (!user.googleId) {
            updateData.googleId = sub;
          }
          if (!user.isEmailVerified) {
            updateData.isEmailVerified = email_verified;
            if (
              user.isPhoneVerified &&
              user.phoneNumber &&
              !user.isVerified &&
              email_verified
            ) {
              updateData.isVerified = true;
            }
          }
          if (
            user.isPhoneVerified &&
            user.phoneNumber &&
            !user.isVerified &&
            email_verified
          ) {
            updateData.isVerified = true;
          }
        }
        if (!user.referralCode) {
          updateData.referralCode = await generateReferralCode();
        }

        if (Object.values(updateData).length > 0) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
              ...profileSelects,
              googleId: true,
              isDeleted: true,
              isWelcomeEmailSent: true,
            },
          });

          // This can be done in background
          if (wasUserDeleted) {
            // Send welcome email after successful registration
          
            if (!user.isWelcomeEmailSent) {
              await prisma.user.update({
                where: { id: user.id },
                data: { isWelcomeEmailSent: true },
              });
            }
          }
        }
      }

      const { isDeleted, googleId, isWelcomeEmailSent, ...rest } = user;

      const token = generateToken(user);
      logger.info(
        isEn
          ? "User logged in successfully via Google (mobile)."
          : "Utilisateur connecté avec succès via Google (mobile).",
        {
          level: LogLevel.INFO,
          action: "google_login_mobile",
          userId: user.id,
          meta: {
            userId: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            date: new Date().toISOString(),
          },
        }
      );
      return res.status(200).json({
        success: true,
        message: isEn ? "Logged in successfully." : "Connecté avec succès.",
        data: { token, user: rest },
      });
    }
  );

}
