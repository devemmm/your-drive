import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import {
  AssetCategory,
  AssetType,
  Language,
  LuggageSize,
  MusicPreference,
  NotificationPreference,
  Prisma,
  UserRole,
} from "@prisma/client";
import { DbUser, profileSelects } from "../types";
import storageService from "../services/storage.service";
import {
  updateOnboardingFlags,
  checkDriverOnboardingComplete,
  checkPassengerOnboardingComplete,
} from "../utils/onboarding";
import { matchedData } from "express-validator";
import { SmsService } from "../services/sms.service";
import { generateVerificationCode } from "../utils/index";
import { logger } from '../utils/logger';

export const updateProfileImage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user! as DbUser;
    const userId = user.id;
    const isEnglishPreferred = req.isEnglishPreferred;
    const file = req.file;
    if (!file) {
      return next(
        AppError(
          isEnglishPreferred
            ? "Please upload the profile Image"
            : "Veuillez télécharger l'image du profil",
          400
        )
      );
    }

    const uploadResult = await storageService.uploadBuffer(
      file,
      "Your-Drive/profiles"
    );
    if (!uploadResult) {
      return next(
        AppError(
          isEnglishPreferred
            ? "Uploading profile image failed"
            : "Le téléchargement de l'image de profil a échoué",
          500
        )
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profileImage: {
          upsert: {
            update: {
              url: uploadResult.secure_url,
              publicId: uploadResult.public_id,
            },
            create: {
              url: uploadResult.secure_url,
              publicId: uploadResult.public_id,
              type: AssetType.IMAGE,
              category: AssetCategory.PROFILE_PICTURE,
            },
          },
        },
      },
      select: profileSelects,
    });

    if (user.profileImage)
      await storageService.deleteObject(user.profileImage.publicId);

    // // Auto-update onboarding flags
    // await updateOnboardingFlags(userId);

    return res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
      },
      message: isEnglishPreferred
        ? "Profile image updated successfully."
        : "Image de profil mise à jour avec succès.",
    });
  }
);

export const updatePreferences = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user! as DbUser;
    const { language, theme, notificationPref, twoFactorEnabled } =
      matchedData<{
        language?: Language;
        theme?: string;
        notificationPref?: NotificationPreference;
        twoFactorEnabled?: boolean;
      }>(req);
    const isEnglishPreferred = req.isEnglishPreferred;

    if (theme && !["light", "dark"].includes(theme))
      return next(
        AppError(
          isEnglishPreferred
            ? "Invalid theme option."
            : "Option de thème non valide.",
          400
        )
      );

    const updateData: any = {};
    if (language) updateData.language = language;
    if (theme) updateData.theme = theme;
    if (notificationPref) updateData.notificationPref = notificationPref;
    if (typeof twoFactorEnabled === "boolean")
      updateData.twoFactorEnabled = twoFactorEnabled;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: profileSelects,
    });

    // Auto-update onboarding flags
    await updateOnboardingFlags(user.id);

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: isEnglishPreferred
        ? "Preferences updated successfully!"
        : "Préférences mises à jour avec succès!",
    });
  }
);

export const getOnboardingStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;

    // onboarding Common/shared fields
    const common = {
      profileImage: { url: user.profileImage?.url },
      language: user.language,
      theme: user.theme,
      notificationPref: user.notificationPref,
      twoFactorEnabled: user.twoFactorEnabled,
      phoneNumber: user.phoneNumber,
      isPhoneVerified: user.isPhoneVerified,
      billingAddress: user.billingAddress,
    };

    // Driver-specific fields
    const driver = {
      isDriverOnboarded: user.isDriverOnboarded,
      licenseNumber: user.licenseNumber,
      licenseImage: { url: user.licenseImage?.url },
      licenseImages: user.licenseImages,
      drivingExperience: user.drivingExperience,
      phoneNumber: user.phoneNumber,
      isPhoneVerified: user.isPhoneVerified,
      isStripeOnboarded: user.isStripeOnboarded,
    };

    // Passenger-specific fields
    const passenger = {
      isPassengerOnboarded: user.isPassengerOnboarded,
      travelPreferences: user.travelPreferences,
      frequentRoutes: user.frequentRoutes,
      emergencyContactName: user.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone,
      referralCode: user.referralCode,
      phoneNumber: user.phoneNumber,
      isPhoneVerified: user.isPhoneVerified,
    };

    return res.status(200).json({
      success: true,
      data: {
        common,
        driver,
        passenger,
        termsAccepted: user.termsAccepted,
      },
    });
  }
);

export const updateDriverOnboarding = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user! as DbUser;
    const userId = user.id;
    const isEnglishPreferred = req.isEnglishPreferred;

    const { licenseNumber, drivingExperience } = matchedData<{
      licenseNumber: string;
      drivingExperience: string;
    }>(req, { locations: ["body"] });

    // Check if user is an admin
    if (user.role === UserRole.ADMIN) {
      return next(
        AppError(
          isEnglishPreferred
            ? "Admins cannot update driver onboarding"
            : "Les administrateurs ne peuvent pas mettre à jour l'intégration des conducteurs",
          403
        )
      );
    }

    // Update driver information
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        licenseNumber: licenseNumber,
        drivingExperience: drivingExperience,
      },
      select: profileSelects,
    });

    // Auto-update onboarding flags
    await updateOnboardingFlags(userId);

    return res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
      },
      message: isEnglishPreferred
        ? "Driver onboarding updated successfully"
        : "Intégration du conducteur mise à jour avec succès",
    });
  }
);

export const uploadDriverLicense = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const userId = user.id;
    const isEnglishPreferred = req.isEnglishPreferred;
    const file = req.file;
    const { side = "front"} = matchedData<{side: "front" | "back"}>(req, { locations: ["query"]});

    if (!file) {
      return next(
        AppError(
          isEnglishPreferred
            ? "Please upload the license image"
            : "Veuillez télécharger l'image de licence",
          400
        )
      );
    }

    if (user.role === UserRole.ADMIN) {
      return next(
        AppError(
          isEnglishPreferred
            ? "Admins are not allowed"
            : "Les administrateurs ne sont pas autorisés",
          403
        )
      );
    }

    // Upload image to storage
    const uploadResult = await storageService.uploadBuffer(
      file,
      "Your-Drive/licenses"
    );

    if (!uploadResult) {
      return next(
        AppError(
          isEnglishPreferred
            ? "Uploading license image failed"
            : "Le téléchargement de l'image de licence a échoué",
          500
        )
      );
    }

    // Fetch existing licenseImages row (if any), so we can delete replaced asset
    const existing = await prisma.licenseImages.findUnique({
      where: { userId },
      include: {
        frontImage: true,
        backImage: true,
      },
    });

    let oldPublicId: string | null = null;

    if (existing) {
      oldPublicId = side === "front" ? existing.frontImage?.publicId ?? null : existing.backImage?.publicId ?? null;
    }

    // Upsert licenseImages and nested image
    await prisma.licenseImages.upsert({
      where: { userId },
      create: {
        user: { connect: { id: userId } },
        ...(side === "front"
          ? {
              frontImage: {
                create: {
                  url: uploadResult.secure_url,
                  publicId: uploadResult.public_id,
                  type: AssetType.IMAGE,
                  category: AssetCategory.LICENSE,
                },
              },
            }
          : {
              backImage: {
                create: {
                  url: uploadResult.secure_url,
                  publicId: uploadResult.public_id,
                  type: AssetType.IMAGE,
                  category: AssetCategory.LICENSE,
                },
              },
            }),
      },
      update: {
        ...(side === "front"
          ? {
              frontImage: {
                upsert: {
                  update: {
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                    category: AssetCategory.LICENSE,
                  },
                  create: {
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                    type: AssetType.IMAGE,
                    category: AssetCategory.LICENSE,
                  },
                },
              },
            }
          : {
              backImage: {
                upsert: {
                  update: {
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                  },
                  create: {
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                    type: AssetType.IMAGE,
                    category: AssetCategory.LICENSE,
                  },
                },
              },
            }),
      },
    });

    // If the driver had been rejected, reset to PENDING so re-submission
    // re-appears in the admin queue.
    if (user.kycStatus === "REJECTED") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: "PENDING",
          kycReviewNotes: null,
          kycReviewedAt: null,
        },
      });
    }

    // Delete replaced old image from storage (if there was one)
    if (oldPublicId) {
      try {
        await storageService.deleteObject(oldPublicId);
      } catch (err) {
        // Log but do not fail the request (so user still receives the new image)
        logger.warn(`Failed to delete old image ${oldPublicId}:`, err);
      }
    }

    // Update onboarding flags
    await updateOnboardingFlags(userId);

    // Re-fetch updated user profile including licenseImages
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: profileSelects,
    });

    return res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
      },
      message: isEnglishPreferred
        ? `License ${side} image uploaded successfully`
        : `Image ${side == "front"? "avant": "du verso"} du permis téléversée avec succès`,
    });
  }
);

export const updatePassengerOnboarding = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const userId = user.id;
    const isEnglishPreferred = req.isEnglishPreferred;

    const {
      travelPreferences,
      frequentRoutes,
      emergencyContactName,
      emergencyContactPhone,
      referralCode,
      phoneNumber,
      termsAccepted,
    } = matchedData<{
      termsAccepted: boolean,
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
      emergencyContactName: string;
      emergencyContactPhone: string;
      phoneNumber?: string;
      referralCode?: string;
    }>(req, { locations: ["body"] });

    // Check if user is admin
    if (user.role === UserRole.ADMIN) {
      return next(
        AppError(
          isEnglishPreferred
            ? "Admins are not allowed"
            : "Les administrateurs ne sont pas autorisés",
          403
        )
      );
    }

     if(termsAccepted !== true && user.termsAccepted === false){
      return next(
        AppError(
          isEnglishPreferred
            ? "You have to accept the terms and conditions."
            : "Vous devez accepter les termes et conditions.",
          403
        )
      );
    }

    const updateData: Prisma.UserUpdateInput = {
      emergencyContactName: emergencyContactName,
      emergencyContactPhone: emergencyContactPhone,
      termsAccepted: true
    };

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
    if (referralCode) {
      // first check whether this user did not invited by anyone
      const inviteeExist = await prisma.referral.findUnique({
        where: { inviteeId: user.id },
      });
      if (!inviteeExist) {
        const inviter = await prisma.user.findUnique({
          where: { referralCode },
        });
        if (inviter) {
          updateData.receivedReferral = {
            create: {
              inviterId: inviter.id,
            },
          };
        }
      }
    }
    let verificationSent = false;
    if (phoneNumber) {
      const phoneExists = await prisma.user.findUnique({
        where: { phoneNumber },
      });

      if (phoneExists) {
        if (phoneExists.phoneNumber === user.phoneNumber) {
          if (!user.isPhoneVerified) {
            updateData.isPhoneVerified = false;
            const { verificationCode, verificationCodeExpiresAt } =
              generateVerificationCode(10 * 60 * 1000);
            updateData.phoneVerificationCode = verificationCode;
            updateData.phoneVerificationCodeExpiresAt = verificationCodeExpiresAt;
            try {
              verificationSent = await SmsService.sendSMS(
                phoneNumber,
                !isEnglishPreferred
                  ? `Your-Drive : Votre code de vérification est : ${updateData.phoneVerificationCode}. Ce code expirera dans 10 minutes.`
                  : `Your-Drive: Your verification code is: ${updateData.phoneVerificationCode}. This code will expire in 10 minutes.`
              );
            } catch (error) {
              return next(
                AppError(
                  error instanceof Error
                    ? error.message
                    : isEnglishPreferred
                      ? "Something is wrong with your phone number."
                      : "Il y a un problème avec votre numéro de téléphone."
                )
              );
            }
          }
        } else {
          const message = isEnglishPreferred
            ? "Phone number is already in use"
            : "Le numéro de téléphone est déjà utilisé";
          return next(AppError(message, 409));
        }
      } else {
        // we have to verify this phone
        updateData.phoneNumber = phoneNumber;
        updateData.isPhoneVerified = false;
        const { verificationCode, verificationCodeExpiresAt } =
          generateVerificationCode(10 * 60 * 1000);
        updateData.phoneVerificationCode = verificationCode;
        updateData.phoneVerificationCodeExpiresAt = verificationCodeExpiresAt;
        try {
          verificationSent = await SmsService.sendSMS(
            phoneNumber,
            !isEnglishPreferred
              ? `Your-Drive : Votre code de vérification est : ${updateData.phoneVerificationCode}. Ce code expirera dans 10 minutes.`
              : `Your-Drive: Your verification code is: ${updateData.phoneVerificationCode}. This code will expire in 10 minutes.`
          );
        } catch (error) {
          return next(
            AppError(
              error instanceof Error
                ? error.message
                : isEnglishPreferred
                  ? "Something is wrong with your phone number."
                  : "Il y a un problème avec votre numéro de téléphone."
            )
          );
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: profileSelects,
    });

    // Auto-update onboarding flags
    await updateOnboardingFlags(userId);

    let message = isEnglishPreferred
      ? "Passenger onboarding updated successfully"
      : "Intégration du passager mise à jour avec succès";
    if (verificationSent) {
      message = isEnglishPreferred
        ? `We sent a verification code to the phone number ${phoneNumber}. Please enter the code to verify your phone number.`
        : `Nous avons envoyé un code de vérification au numéro de téléphone ${phoneNumber}. Veuillez entrer le code pour vérifier votre numéro de téléphone.`;
    }

    return res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
      },
      message,
    });
  }
);

export const getOnboardingProgress = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user! as DbUser;
    const isEnglishPreferred = req.isEnglishPreferred;

    // Auto-update onboarding flags first
    const flags = await updateOnboardingFlags(user.id);

    // Get fresh user data
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profileImage: true, licenseImages: true },
    });

    if (!fullUser) {
      return next(
        AppError(
          isEnglishPreferred ? "User not found" : "Utilisateur non trouvé",
          404
        )
      );
    }

    // Check common requirements
    const commonRequirements = {
      hasName: !!fullUser.firstName,
      hasEmail: !!fullUser.email,
      hasProfileImage: !!fullUser.profileImage,
      hasAcceptedTerms: !!fullUser.termsAccepted,
    };

    const commonProgress =
      Object.values(commonRequirements).filter(Boolean).length;
    const totalCommonSteps = Object.keys(commonRequirements).length;

    // Check driver requirements
    // let driverRequirements = {};
    // let driverProgress = 0;
    // let totalDriverSteps = 0;
    // let driverOnboardingComplete = false;

    const driverRequirements = {
      hasLicenseNumber: !!fullUser.licenseNumber,
      hasLicenseImage: !!fullUser.licenseImages?.frontImageId,
      hasDrivingExperience: !!fullUser.drivingExperience,
    };
    const driverProgress =
      Object.values(driverRequirements).filter(Boolean).length;
    const totalDriverSteps = Object.keys(driverRequirements).length;
    const driverOnboardingComplete = checkDriverOnboardingComplete(fullUser);

    // Check passenger requirements
    // let passengerRequirements = {};
    // let passengerProgress = 0;
    // let totalPassengerSteps = 0;
    // let passengerOnboardingComplete = false;

    const passengerRequirements = {
      // hasTravelPreferences: !!fullUser.travelPreferences,
      hasEmergencyContactName: !!fullUser.emergencyContactName,
      hasEmergencyContactPhone: !!fullUser.emergencyContactPhone,
    };
    const passengerProgress = Object.values(passengerRequirements).filter(
      Boolean
    ).length;
    const totalPassengerSteps = Object.keys(passengerRequirements).length;
    const passengerOnboardingComplete =
      checkPassengerOnboardingComplete(fullUser);

    const totalProgress = commonProgress + driverProgress + passengerProgress;
    const totalSteps =
      totalCommonSteps + totalDriverSteps + totalPassengerSteps;
    const progressPercentage =
      totalSteps > 0 ? Math.round((totalProgress / totalSteps) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        isFullyOnboarded: flags.isOnboarded,
        progressPercentage,
        totalSteps,
        completedSteps: totalProgress,
        common: {
          requirements: commonRequirements,
          progress: commonProgress,
          totalSteps: totalCommonSteps,
        },
        driver: {
          requirements: driverRequirements,
          progress: driverProgress,
          totalSteps: totalDriverSteps,
          isDriverOnboarded: flags.isDriverOnboarded,
          onboardingComplete: driverOnboardingComplete,
        },

        passenger: {
          requirements: passengerRequirements,
          progress: passengerProgress,
          totalSteps: totalPassengerSteps,
          isPassengerOnboarded: flags.isPassengerOnboarded,
          onboardingComplete: passengerOnboardingComplete,
        },
      },
    });
  }
);
