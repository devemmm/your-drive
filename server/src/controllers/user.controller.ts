import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import {
  BookingStatus,
  Language,
  
  LuggageSize,
  MusicPreference,
  NotificationPreference,
  Prisma,
  RideStatus,
  UserRole,
} from "@prisma/client";
import { generateVerificationCode } from "../utils";
import { DbUser, profileSelects } from "../types";
import {
  isUserFullyOnboarded,
  updateOnboardingFlags,
} from "../utils/onboarding";
import { SmsService } from "../services/sms.service";
import { matchedData } from "express-validator";
import bcrypt from "bcryptjs";
import { logger,LogLevel } from "../utils/logger";
import { level } from "winston";
import { assertAboveDebtLimit, InsufficientWalletError } from "../services/wallet.service";

export class UserController {
  static getUser = catchAsync(async (req: Request, res: Response, next) => {
    let isEnglishPreferred = req.isEnglishPreferred;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: profileSelects,
    });
    if (!user)
      return next(
        AppError(
          isEnglishPreferred ? "Account not found" : "Compte introuvable",
          404
        )
      );

    res.status(200).json({
      success: true,
      data: user,
    });
  });

  static getUsers = catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    let { role = undefined } = req.query;
    const newRole = role
      ? (((role as string) || "").toUpperCase().trim() as UserRole)
      : undefined;

    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const where: Prisma.UserWhereInput =
      newRole && Object.values(UserRole).includes(newRole)
        ? { role: newRole }
        : {};

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: profileSelects,
        orderBy: {
          [(req.query.sortBy as string) || "id"]:
            (req.query.order as string) || "asc",
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  });

  static updateProfile = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        firstName,
        lastName,
        email,
        language,
        theme,
        phoneNumber,
        dateOfBirth,
        notificationPref,
        twoFactorEnabled,
        termsAccepted,
        travelPreferences,
        frequentRoutes,
        emergencyContactName,
        emergencyContactPhone,
        licenseNumber,
        drivingExperience,
      } = matchedData<{
        firstName?: string;
        lastName?: string;
        email?: string;
        language?: Language;
        theme?: "light" | "dark";
        phoneNumber?: string;
        dateOfBirth?: Date;
        notificationPref?: NotificationPreference;
        twoFactorEnabled?: boolean;
        termsAccepted?: boolean;
        travelPreferences?: {
          smoking?: boolean;
          pets?: boolean;
          airConditioning?: boolean;
          ladiesOnly?: boolean;
          bicycleSupport?: boolean;
          snowTires?: boolean;
          luggageSize?: LuggageSize;
          additionalNotes?: string;
          gentsOnly?: boolean;
          music?: MusicPreference;
          skydiving?: boolean;
        };
        frequentRoutes?: {
          from: string;
          to: string;
        }[];
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        licenseNumber?: string;
        drivingExperience?: string;
      }>(req);
      const user = req.user! as DbUser;
      const isEn = req.isEnglishPreferred;

      const updateData: Prisma.UserUpdateInput = {};
      let sendSmsData:
        | {
            phoneNumber: string;
            phoneVerificationCode: string;
          }
        | undefined = undefined;
      let sendEmailData:
        | {
            email: string;
            verificationCode: string;
          }
        | undefined = undefined;
      let smsSent = false;
      let emailSent = false;

      if (phoneNumber && phoneNumber !== user.phoneNumber) {
        const phoneExists = await prisma.user.findUnique({
          where: { phoneNumber },
        });
        if (phoneExists) {
          // const message = isEn
          //   ? "Phone number is already in use"
          //   : "Le numéro de téléphone est déjà utilisé";
          // return next(AppError(message, 409));
        //     if (phoneExists.id == req.user!.id && phoneExists.isPhoneVerified) {
        //   return next(
        //     AppError(
        //       isEn
        //         ? "Phone number is already verified"
        //         : "Le numéro de téléphone est déjà vérifié",
        //       400
        //     )
        //   );
        // }
        if (phoneExists.id !== req.user!.id) {
          const message = isEn
            ? "Phone number is already in use"
            : "Le numéro de téléphone est déjà utilisé";
          return next(AppError(message, 409));
        }
        if (phoneExists.id !== req.user!.id && !phoneExists.isPhoneVerified) {
          await prisma.user.update({
            where: { id: phoneExists.id },
            data: { phoneNumber: null },
        })
      }
        }

        // we have to verify this phone
        updateData.phoneNumber = phoneNumber;
        updateData.isPhoneVerified = false;
        updateData.isVerified = false;
        const { verificationCode, verificationCodeExpiresAt } =
          generateVerificationCode(10 * 60 * 1000);
        updateData.phoneVerificationCode = verificationCode;
        updateData.phoneVerificationCodeExpiresAt = verificationCodeExpiresAt;
        sendSmsData = {
          phoneNumber,
          phoneVerificationCode: verificationCode,
        };
      }

      if (email && email !== user.email) {
        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) {
          const message = isEn
            ? "Account with this email already exist."
            : "Un compte avec ce courriel existe déjà.";
          return next(AppError(message, 409));
        }
        const { verificationCode, verificationCodeExpiresAt } =
          generateVerificationCode(10 * 60 * 1000);
        updateData.email = email;
        updateData.isEmailVerified = false;
        updateData.isVerified = false;
        updateData.verificationCode = verificationCode;
        updateData.verificationCodeExpiresAt = verificationCodeExpiresAt;
        sendEmailData = {
          email,
          verificationCode,
        };
      }

      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (language) updateData.language = language;
      if (theme) updateData.theme = theme;
      if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
      if (notificationPref) updateData.notificationPref = notificationPref;
      if (typeof twoFactorEnabled === "boolean") {
        updateData.twoFactorEnabled = twoFactorEnabled;
      }
      if (typeof termsAccepted === "boolean") {
        updateData.termsAccepted = termsAccepted;
      }
      if (travelPreferences) {
      if(typeof travelPreferences.skydiving === "boolean"){
        const { skydiving, ...rest } = travelPreferences;
        const prefData = {
          ...rest,
          skiRack: skydiving,
        }
        updateData.travelPreferences = {
        upsert: {
          update: prefData,
          create: prefData,
        },
      };
      }else{
        updateData.travelPreferences = {
          upsert: {
            update: travelPreferences,
            create: travelPreferences,
          },
        };
      }
    }
      if (frequentRoutes) updateData.frequentRoutes = frequentRoutes;
      if (emergencyContactName)
        updateData.emergencyContactName = emergencyContactName;
      if (emergencyContactPhone)
        updateData.emergencyContactPhone = emergencyContactPhone;
      if (licenseNumber) updateData.licenseNumber = licenseNumber;
      if (drivingExperience) updateData.drivingExperience = drivingExperience;

      let updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: profileSelects,
      });

      // Auto-update onboarding flags
      await updateOnboardingFlags(user.id);
      if (sendSmsData) {
        try {
          smsSent = await SmsService.sendSMS(
            sendSmsData.phoneNumber,
            !isEn
              ? `Your-Drive: Votre code de vérification est: ${updateData.phoneVerificationCode}. Ce code expirera dans 10 minutes.`
              : `Your-Drive: Your verification code is: ${updateData.phoneVerificationCode}. This code will expire in 10 minutes.`
          );
        } catch (error) {
          return next(
            AppError(
              error instanceof Error
                ? error.message
                : isEn
                ? "Something is wrong with your phone number."
                : "Il y a un problème avec votre numéro de téléphone."
            )
          );
        }
      }

    

      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profileImage: true, licenseImage: true },
      });
      if (fullUser) {
        const fullyOnboarded = isUserFullyOnboarded(fullUser as DbUser);
        if (fullUser.isOnboarded !== fullyOnboarded) {
          updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { isOnboarded: fullyOnboarded },
            select: profileSelects,
          });
        }
      }

      let message = isEn
        ? "Profile updated successfully"
        : "Profil mis à jour avec succès";

      if (smsSent) {
        message = isEn
          ? "We sent a verification code on the provided phone number, please check the code to verify your phone number."
          : "Nous avons envoyé un code de vérification au numéro de téléphone fourni, veuillez vérifier le code pour valider votre numéro de téléphone.";
      }
      if (emailSent) {
        message = isEn
          ? "Please check your email for verification."
          : "Veuillez vérifier votre courriel pour vérification.";
      }
      return res.status(200).json({
        success: true,
        data: { user: updatedUser },
        message,
      });
    }
  );

  static addPhoneNumber = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { phoneNumber } = req.body;
      const isEnglishPreferred = req.isEnglishPreferred;
      const phoneExists = await prisma.user.findUnique({
        where: { phoneNumber },
      });
      if (phoneExists) {
        if (phoneExists.id == req.user!.id && phoneExists.isPhoneVerified) {
          return next(
            AppError(
              isEnglishPreferred
                ? "Phone number is already verified"
                : "Le numéro de téléphone est déjà vérifié",
              400
            )
          );
        }
        if (phoneExists.id !== req.user!.id) {
          const message = isEnglishPreferred
            ? "Phone number is already in use"
            : "Le numéro de téléphone est déjà utilisé";
          return next(AppError(message, 409));
        }
        if (phoneExists.id !== req.user!.id && !phoneExists.isPhoneVerified) {
          await prisma.user.update({
            where: { id: phoneExists.id },
            data: { phoneNumber: null },
        })
      }
    };

      const { verificationCode, verificationCodeExpiresAt } =
        generateVerificationCode(24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          phoneNumber,
          phoneVerificationCode: verificationCode,
          phoneVerificationCodeExpiresAt: verificationCodeExpiresAt,
          isOnboarded: false,
          isDriverOnboarded: false,
          isPhoneVerified: false,
        },
      });

      const isOtpSet = await SmsService.sendSMS(
        phoneNumber,
        !(req as any).isEnglishPreferred
          ? `Your-Drive: Votre code de vérification est: ${verificationCode}. Ce code expirera dans 24 heures.`
          : `Your-Drive: Your verification code is: ${verificationCode}. This code will expire in 24 hours.`
      );
      if (!isOtpSet) {
        await prisma.user.update({
          where: { id: req.user!.id },
          data: {
            phoneNumber: null,
            phoneVerificationCode: null,
            phoneVerificationCodeExpiresAt: null,
          },
        });
        return next(
          AppError(
            isEnglishPreferred
              ? "Error occurred while adding phone number, please try again"
              : "Une erreur s'est produite lors de l'ajout du numéro de téléphone, veuillez réessayer",
            500
          )
        );
      }

      // const addPhoneNumberLogData = {
      //   level: LogLevel.INFO,
      //   message: req.isEnglishPreferred
      //     ? `Verification code sent to phone number: ${phoneNumber}`
      //     : `Code de vérification envoyé au numéro de téléphone : ${phoneNumber}`,
      //   userId: req.user!.id,
      //   action: "add_phone_number",
      //   meta: {
      //     phoneNumber,
      //     verificationCode,
      //     verificationCodeExpiresAt,
      //     isEnglishPreferred,
      //   },
      // };
      
      // logger.info(addPhoneNumberLogData.message, {
      //   level: addPhoneNumberLogData.level,
      //   action: addPhoneNumberLogData.action,
      //   userId: addPhoneNumberLogData.userId,
      //   phoneNumber: addPhoneNumberLogData.meta.phoneNumber,
      // });

      return res.status(200).json({
        success: true,
        message: isEnglishPreferred
          ? "Verification code sent to your phone number"
          : "Code de vérification envoyé à votre numéro de téléphone",
      });
    }
  );

  static verifyPhoneNumber = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { phoneNumber, code } = req.body;
      let isEnglishPreferred = req.isEnglishPreferred;

      const user = await prisma.user.findUnique({
        where: { phoneNumber, isDeleted: false },
      });
      if (!user) {
        const message = isEnglishPreferred
          ? "No account associated with this phone number"
          : "Aucun compte associé à ce numéro de téléphone";
        return next(AppError(message, 404));
      }

      isEnglishPreferred = isEnglishPreferred
        ? isEnglishPreferred
        : user.language === Language.EN;

      if (user.isPhoneVerified) {
        const message = isEnglishPreferred
          ? "Phone number already verified."
          : "Phone number already verified";
        return next(AppError(message, 400));
      }

      let message = isEnglishPreferred
        ? "Invalid verification code"
        : "Code de vérification invalide";

      if (!user.phoneVerificationCode || code != user.phoneVerificationCode)
        return next(AppError(message, 400));

      if (
        !user.phoneVerificationCodeExpiresAt ||
        new Date() > user.phoneVerificationCodeExpiresAt
      ) {
        message = isEnglishPreferred
          ? "Verification code has expired"
          : "Le code de vérification a expiré";
        return next(AppError(message, 400));
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          isPhoneVerified: true,
          phoneVerificationCode: null,
          phoneVerificationCodeExpiresAt: null,
          ...(!user.isVerified &&
            user.isEmailVerified && {
              isVerified: true,
            }),
        },
      });

      // Auto-update onboarding flags
      await updateOnboardingFlags(user.id);

      // const verifyPhoneLogData = {
      //   level: LogLevel.INFO,
      //   message: req.isEnglishPreferred
      //     ? "Phone number verified successfully"
      //     : "Numéro de téléphone vérifié avec succès",
      //   action: "VerifyPhoneNumber",
      //   userId: user.id,
      //   meta: {
      //     userId: user.id,
      //     phoneNumber,
      //     isEnglishPreferred,
      //   },
      // };
      
      // logger.info(verifyPhoneLogData.message, {
      //   level: verifyPhoneLogData.level,
      //   action: verifyPhoneLogData.action,
      //   userId: verifyPhoneLogData.userId,
      //   phoneNumber: verifyPhoneLogData.meta.phoneNumber,
      //   isEnglishPreferred: verifyPhoneLogData.meta.isEnglishPreferred,
      // });
      return res.status(200).json({
        success: true,
        message: isEnglishPreferred
          ? "Phone number verified successfully"
          : "Numéro de téléphone vérifié avec succès",
      });
    }
  );

  static resendPhoneVerification = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { phoneNumber } = req.body;

      const user = req.user!;

      if (user.isPhoneVerified) {
        const message = req.isEnglishPreferred
          ? "Phone number is already verified"
          : "Le numéro de téléphone est déjà vérifié";
        return next(AppError(message, 400));
      }

      const { verificationCode, verificationCodeExpiresAt } =
        generateVerificationCode(24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          phoneVerificationCode: verificationCode,
          phoneVerificationCodeExpiresAt: verificationCodeExpiresAt,
        },
      });

      await SmsService.sendSMS(
        phoneNumber,
        !req.isEnglishPreferred
          ? `Your-Drive: Votre code de vérification est: ${verificationCode}. Ce code expirera dans 24 heures.`
          : `Your-Drive: Your verification code is: ${verificationCode}. This code will expire in 24 hours.`
      );

      // const resendVerificationLogData = {
      //   level: LogLevel.INFO,
      //   message: req.isEnglishPreferred
      //     ? `Verification code resent to phone number: ${phoneNumber}`
      //     : `Le code de vérification a été renvoyé au numéro de téléphone : ${phoneNumber}`,
      //   action: "ResendPhoneVerification",
      //   userId: user.id,
      //   meta: {
      //     phoneNumber,
      //     verificationCode,
      //     verificationCodeExpiresAt,
      //     isEnglishPreferred: req.isEnglishPreferred,
      //   },
      // };
      
      // logger.info(resendVerificationLogData.message, {
      //   level: resendVerificationLogData.level,
      //   action: resendVerificationLogData.action,
      //   userId: resendVerificationLogData.userId,
      //   phoneNumber: resendVerificationLogData.meta.phoneNumber,
      //   verificationCode: resendVerificationLogData.meta.verificationCode,
      //   verificationCodeExpiresAt:
      //     resendVerificationLogData.meta.verificationCodeExpiresAt,
      //   isEnglishPreferred: resendVerificationLogData.meta.isEnglishPreferred,
      // });

      return res.status(200).json({
        success: true,
        message: (req as any).isEnglishPreferred
          ? "Verification code has been resent to your phone number"
          : "Le code de vérification a été renvoyé à votre numéro de téléphone",
      });
    }
  );

  static getProfile = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      // Pick only the fields defined in profileSelects from req.user
      const userProfile: any = {};
      const user = req.user!;
      (Object.keys(profileSelects) as (keyof typeof profileSelects)[]).forEach(
        (key) => {
          if (
            profileSelects[key] &&
            Object.prototype.hasOwnProperty.call(user, key)
          ) {
            userProfile[key] = user[key];
          }
        }
      );
      // const isEn = req.isEnglishPreferred;
      const couponSum = await prisma.coupon.aggregate({
        where: {
          userId: userProfile?.id,
          redeemed: false,
          expiresAt: { gte: new Date() },
        },
        _sum: {
          quantity: true,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          ...userProfile,
          profileImage: {
            url: userProfile.profileImage?.url,
          },
          drivingExperience: user.drivingExperience,
          licenseNumber: user.licenseNumber,
          licenseImages: user.licenseImages,
          coupons: couponSum._sum.quantity ?? 0,
        },
      });
    }
  );

  static inviteFriend = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser; // Logged-in user
      const { email } = matchedData<{ email: string }>(req);
      const inviteeUser = await prisma.user.findUnique({
        where: { email, isDeleted: false },
      });
      const isEn = req.isEnglishPreferred;
      if (inviteeUser) {
        return res.status(400).json({
          success: false,
          message: isEn
            ? "This user is already registered on the platform"
            : "Cet utilisateur est déjà inscrit sur la plateforme",
        });
      }
      const invitationLink = `${process.env.FRONTEND_URL}/register?referralCode=${user.referralCode}`;

   
      const sendInviteLogData = {
        level: LogLevel.INFO,
        message: req.isEnglishPreferred
          ? `Invitation sent to email: ${email}`
          : `Invitation envoyée à l'email : ${email}`,
        action: "SendInvite",
        userId: user.id,
        meta: {
          email,
          invitationLink,
          isEnglishPreferred: req.isEnglishPreferred,
        },
      };
      
      logger.info(sendInviteLogData.message, {
        level: sendInviteLogData.level,
        action: sendInviteLogData.action,
        userId: sendInviteLogData.userId,
        email: sendInviteLogData.meta.email,
        invitationLink: sendInviteLogData.meta.invitationLink,
        isEnglishPreferred: sendInviteLogData.meta.isEnglishPreferred,
      });

      return res.status(200).json({
        success: true,
        message: isEn
          ? "Invitation sent successfully"
          : "L'invitation a été envoyée avec succès",
      });
    }
  );

  static changePassword = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const { oldPassword, newPassword } = matchedData<{
        oldPassword: string;
        newPassword: string;
      }>(req, { locations: ["body"] });
      const isEn = req.isEnglishPreferred;

      if (!user.password) {
        return next(
          AppError(
            isEn
              ? "Password not set, use forgot password to set a password"
              : "Mot de passe non défini, utilisez la fonction de mot de passe oublié pour définir un mot de passe",
            404
          )
        );
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);

      if (!isMatch) {
        return next(
          AppError(
            isEn
              ? "Old password is incorrect"
              : "L'ancien mot de passe est incorrect",
            400
          )
        );
      }

      // check if new password is same as old password
      if (oldPassword === newPassword) {
        return next(
          AppError(
            isEn
              ? "New password cannot be the same as old password"
              : "Le nouveau mot de passe ne peut pas être le même que l'ancien mot de passe",
            400
          )
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      const changePasswordLogData = {
        level: LogLevel.INFO,
        message: isEn
          ? "Password changed successfully"
          : "Mot de passe changé avec succès",
        action: "ChangePassword",
        userId: user.id,
        meta: {
          userId: user.id,
          isEnglishPreferred: isEn,
        },
      };
      
      logger.info(changePasswordLogData.message, {
        level: changePasswordLogData.level,
        action: changePasswordLogData.action,
        userId: changePasswordLogData.userId,
        isEnglishPreferred: changePasswordLogData.meta.isEnglishPreferred,
      });

      return res.status(200).json({
        success: true,
        message: isEn
          ? "Password changed successfully"
          : "Mot de passe changé avec succès",
      });
    }
  );

  static updateChauffeurAvailability = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      type ChauffeurAvailabilityPayload = {
        isAvailableForChauffeur?: boolean;
        chauffeurHourlyRate?: number | null;
        chauffeurDailyRate?: number | null;
        chauffeurDescription?: string | null;
        languagesSpoken?: string[] | null;
      };

      const user = req.user! as DbUser;
      const isEnglishPreferred = req.isEnglishPreferred;

      // Admins cannot have chauffeur profiles
      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEnglishPreferred
              ? "Admins cannot update chauffeur availability"
              : "Les administrateurs ne peuvent pas mettre à jour la disponibilité du chauffeur",
            403
          )
        );
      }

      // Must have completed driver onboarding first
      if (!user.isDriverOnboarded) {
        return next(
          AppError(
            isEnglishPreferred
              ? "Complete driver onboarding before offering chauffeur services"
              : "Terminez l'intégration du conducteur avant d'offrir des services de chauffeur",
            403
          )
        );
      }

      const payload = matchedData<ChauffeurAvailabilityPayload>(req, {
        locations: ["body"],
      });

      // Compute the merged state: what the row will look like after update
      const willBeAvailable =
        payload.isAvailableForChauffeur ?? user.isAvailableForChauffeur;
      const willHaveHourlyRate =
        payload.chauffeurHourlyRate !== undefined
          ? payload.chauffeurHourlyRate !== null
          : user.chauffeurHourlyRate !== null;
      const willHaveDailyRate =
        payload.chauffeurDailyRate !== undefined
          ? payload.chauffeurDailyRate !== null
          : user.chauffeurDailyRate !== null;

      // If enabling availability, at least one rate must exist after the update
      if (willBeAvailable && !willHaveHourlyRate && !willHaveDailyRate) {
        return next(
          AppError(
            isEnglishPreferred
              ? "At least one of hourly or daily rate is required to offer chauffeur services"
              : "Au moins un tarif horaire ou journalier est requis pour offrir des services de chauffeur",
            400
          )
        );
      }

      // Build the Prisma update data — only include fields that were in the payload
      const updateData: Prisma.UserUpdateInput = {};
      if (payload.isAvailableForChauffeur !== undefined) {
        updateData.isAvailableForChauffeur = payload.isAvailableForChauffeur;
      }
      if (payload.chauffeurHourlyRate !== undefined) {
        updateData.chauffeurHourlyRate = payload.chauffeurHourlyRate;
      }
      if (payload.chauffeurDailyRate !== undefined) {
        updateData.chauffeurDailyRate = payload.chauffeurDailyRate;
      }
      if (payload.chauffeurDescription !== undefined) {
        updateData.chauffeurDescription = payload.chauffeurDescription;
      }
      if (payload.languagesSpoken !== undefined) {
        updateData.languagesSpoken =
          payload.languagesSpoken === null ? Prisma.JsonNull : payload.languagesSpoken;
      }

      // Gate: prevent going online when wallet is below the debt limit
      const isGoingOnline = payload.isAvailableForChauffeur === true;
      if (isGoingOnline) {
        const [fresh, settings] = await Promise.all([
          prisma.user.findUniqueOrThrow({
            where: { id: user.id },
            select: { walletBalanceCents: true, walletDebtLimitCents: true },
          }),
          prisma.walletSettings.findFirstOrThrow(),
        ]);
        try {
          assertAboveDebtLimit(fresh, settings);
        } catch (err) {
          if (err instanceof InsufficientWalletError) {
            return res.status(403).json({
              error: "WALLET_DEBT_LIMIT",
              message: "Top up your wallet to go online.",
            });
          }
          throw err;
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: profileSelects,
      });

      return res.status(200).json({
        success: true,
        data: { user: updatedUser },
        message: isEnglishPreferred
          ? "Chauffeur availability updated successfully"
          : "Disponibilité du chauffeur mise à jour avec succès",
      });
    }
  );

  // Toggle driver availability for on-demand ride requests
  static updateRideRequestAvailability = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins cannot update ride request availability"
              : "Les administrateurs ne peuvent pas mettre à jour cette disponibilité",
            403
          )
        );
      }

      if (!user.isDriverOnboarded) {
        return next(
          AppError(
            isEN
              ? "Complete driver onboarding before accepting ride requests"
              : "Terminez l'intégration du conducteur avant d'accepter des demandes de trajet",
            403
          )
        );
      }

      const { isAvailableForRideRequest } = matchedData<{
        isAvailableForRideRequest: boolean;
      }>(req, { locations: ["body"] });

      // Gate: driver KYC must be approved before going online.
      const isGoingOnline = isAvailableForRideRequest === true;
      if (isGoingOnline) {
        const kyc = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { kycStatus: true },
        });
        if (kyc.kycStatus !== "APPROVED") {
          return res.status(403).json({
            error: "KYC_NOT_APPROVED",
            message:
              kyc.kycStatus === "REJECTED"
                ? "Your driver documents were rejected. Update them and resubmit for review."
                : "Your driver documents are awaiting admin approval.",
          });
        }
      }

      // Gate: prevent going online when wallet is below the debt limit
      if (isGoingOnline) {
        const [fresh, settings] = await Promise.all([
          prisma.user.findUniqueOrThrow({
            where: { id: user.id },
            select: { walletBalanceCents: true, walletDebtLimitCents: true },
          }),
          prisma.walletSettings.findFirstOrThrow(),
        ]);
        try {
          assertAboveDebtLimit(fresh, settings);
        } catch (err) {
          if (err instanceof InsufficientWalletError) {
            return res.status(403).json({
              error: "WALLET_DEBT_LIMIT",
              message: "Top up your wallet to go online.",
            });
          }
          throw err;
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { isAvailableForRideRequest },
        select: profileSelects,
      });

      return res.status(200).json({
        success: true,
        data: { user: updatedUser },
        message: isEN
          ? isAvailableForRideRequest
            ? "You are now receiving ride requests"
            : "You have stopped receiving ride requests"
          : isAvailableForRideRequest
            ? "Vous recevez maintenant des demandes de trajet"
            : "Vous ne recevez plus de demandes de trajet",
      });
    }
  );

  // delete a user
  static deleteAccount = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      const userToDel = await prisma.user.findUnique({
        where: { id: user.id, isDeleted: false },
        select: {
          id: true,
          _count: {
            select: {
              driverReviews: true,
              userReviews: true,
              blockedRides: true,
              reviewedCancellationRides: true,
              coupons: true,
              chatThreads: true,
              cancelledBookings: true,
              bookings: true,
              transactions: true,
              subscriptions: true,
              postedRides: true,
            },
          },
          postedRides: {
            where: {
              status: { in: [RideStatus.ONGOING, RideStatus.PUBLISHED] },
              isDeleted: false
            },
          },
        },
      });

      if (!userToDel) {
        
        const UserNotFoundLogData = {
          level: LogLevel.ERROR,
          message: isEN
            ? "User not found while trying to delete account"
            : "Utilisateur non trouvé lors de la tentative de suppression du compte",
      };
      
      logger.error(UserNotFoundLogData.message, {
        level: UserNotFoundLogData.level,
        action: "DeleteAccount",
        userId: user.id,
        isEnglishPreferred: isEN,
      });

      return next(
          AppError(isEN ? "User not found" : "Utilisateur non trouvé", 404)
        );

      }
      if (user.role === UserRole.ADMIN) {
        const countAdmins = await prisma.user.count({
          where: { role: UserRole.ADMIN },
        });
        if (countAdmins <= 1) {
          return next(
            AppError(
              isEN
                ? "User cannot be deleted, because the platform has to have atleast one admin"
                : "L'utilisateur ne peut pas être supprimé car la plateforme doit avoir au moins un administrateur.",
              400
            )
          );
        }
      }

      const canBeDeleted = Object.values(userToDel._count).every(
        (count) => count === 0
      );

      // if the user can be deleted, delete the account otherwise mark as deleted
      if (canBeDeleted) {
        await prisma.user.delete({ where: { id: userToDel.id } });
        return res.json({
          success: true,
          message: isEN
            ? "Account deleted successfully"
            : "Compte supprimé avec succès",
            });
      } else {
      if (userToDel.postedRides.length > 0) {
        return next(
          AppError(
            isEN
              ? "Account cannot be deleted when you still have any ride in ongoing state or published state"
              : "Le compte ne peut pas être supprimé lorsque vous avez encore un trajet en cours ou publié.",
            400
          )
        );
      }

      await prisma.user.update({
        where: {
          id: userToDel.id,
        },
        data: {
          isDeleted: true,
 phoneNumber: null,
          postedRides: {
            updateMany: {
              where: { isDeleted: false },
              data: {
                isDeleted: true,
              },
            },
          },
          subscriptions: {
            updateMany:{
              where: { isActive: true },
              data: {
                isActive: false,
              }
            }
          },
          bookings: {
            updateMany: {
              where: { status: {in: [BookingStatus.APPROVED, BookingStatus.PENDING]}},
              data: {
                status: BookingStatus.CANCELLED,
                reason: "Account deleted by the owner"
              }
            }
          },
          coupons: {
            updateMany: {
              where:{redeemed: false},
              data: {
                redeemed: true,
                redeemedAt: new Date(),
                redeemReason: "User deleted the account"
              }
            }
          }
        }
});
      }
      const deleteAccountLogData = {
        level: LogLevel.INFO,
        message: isEN
          ? "User account deleted successfully"
          : "Compte utilisateur supprimé avec succès",
        action: "DeleteAccount",
        userId: user.id,
        meta: {
          userId: user.id,
          canBeDeleted,
          isEnglishPreferred: isEN,
          deletedAt: new Date(),
          isDeleted: canBeDeleted ? false : true,
          
        },
      };
      
      logger.info(deleteAccountLogData.message, {
        level: deleteAccountLogData.level,
        action: deleteAccountLogData.action,
        userId: deleteAccountLogData.userId,
        isEnglishPreferred: isEN,
      });

      return res.json({
        success: true,
        message: isEN
          ? "Account deleted successfully"
          : "Compte supprimé avec succès",
      });
    }
  );
}
