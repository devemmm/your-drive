import { DbUser } from "../types";
import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

export function isUserFullyOnboarded(user: DbUser): boolean {
  return user.isDriverOnboarded && user.isPassengerOnboarded;
}

export function checkDriverOnboardingComplete(user: DbUser): boolean {
  return Boolean(
    user.licenseNumber &&
      (user?.licenseImages?.frontImageId) &&
      user.drivingExperience
  );
}

export function checkPassengerOnboardingComplete(user: DbUser): boolean {
  return Boolean(user.termsAccepted);
}

export async function updateOnboardingFlags(
  userId: number,
): Promise<{
  isOnboarded: boolean;
  isDriverOnboarded: boolean;
  isPassengerOnboarded: boolean;
}> {
  // Get full user data
  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profileImage: true, licenseImages: true },
  });

  if (!fullUser) {
    throw new Error("User not found");
  }

  const updateData: Prisma.UserUpdateInput = {};

  // Check and update driver onboarding flag
  const driverComplete = checkDriverOnboardingComplete(fullUser);
  if (driverComplete && !fullUser.isDriverOnboarded) {
    updateData.isDriverOnboarded = true;
  }

  // Check and update passenger onboarding flag
  const passengerComplete = checkPassengerOnboardingComplete(fullUser);
  if (passengerComplete && !fullUser.isPassengerOnboarded) {
    updateData.isPassengerOnboarded = true;
  }

  // Check overall onboarding status
  const fullyOnboarded = isUserFullyOnboarded({
    ...fullUser,
    ...(updateData.isDriverOnboarded !== undefined && {
      isDriverOnboarded: updateData.isDriverOnboarded as boolean,
    }),
    ...(updateData.isPassengerOnboarded !== undefined && {
      isPassengerOnboarded: updateData.isPassengerOnboarded as boolean,
    }),
  });

  if (fullyOnboarded && !fullUser.isOnboarded) {
    updateData.isOnboarded = true;
  }

  // Update database if there are changes
  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  return {
    isDriverOnboarded:
      updateData.isDriverOnboarded as boolean ?? fullUser.isDriverOnboarded,
    isPassengerOnboarded:
      updateData.isPassengerOnboarded as boolean ?? fullUser.isPassengerOnboarded,
    isOnboarded: updateData.isOnboarded as boolean ?? fullUser.isOnboarded,
  };
}

export function getOnboardingSteps(user: DbUser): {
  common: { [key: string]: boolean };
  driver?: { [key: string]: boolean };
  passenger?: { [key: string]: boolean };
} {

  const common = {
    hasName: !!user.firstName && !!user.lastName,
    hasEmail: !!user.email,
    hasProfileImage: !!(user.profileImage),
    hasAcceptedTerms: !!user.termsAccepted,
  };

  const result: any = { common };

  result.driver = {
    hasLicenseNumber: !!user.licenseNumber,
    hasLicenseImage: !!(user?.licenseImages?.frontImageId),
    hasDrivingExperience: !!user.drivingExperience,
    isDriverOnboarded: !!user.isDriverOnboarded,
    isStripeOnboarded: !!user.isStripeOnboarded,
  };

  result.passenger = {
    hasTravelPreferences: !!user.travelPreferences,
    hasEmergencyContactName: !!user.emergencyContactName,
    hasEmergencyContactPhone: !!user.emergencyContactPhone,
    isPassengerOnboarded: !!user.isPassengerOnboarded,
  };

  return result;
}
