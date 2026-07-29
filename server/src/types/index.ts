import { Asset, ChatThread, LicenseImages, RidePreference, User } from "@prisma/client";

declare global {
  namespace Express {
    export interface Request {
      user?: DbUser;
      isEnglishPreferred?: boolean;
      thread?: ChatThread & {
        users: DbUser[];
      };
    }
  }
}

export interface RideLocation {
  city: string;
  locationName: string;
  lat: number;
  lng: number;
}

export type DbUser = User & {
  profileImage?: Asset | null;
  licenseImage?: Asset|null;
  licenseImages?: LicenseImages & {
    frontImage?: Asset|null;
    backImage?: Asset|null;
  }|null;
  chatThreads?: ChatThread[];
  travelPreferences?: RidePreference|null;
};

export const fileSelects = {
  id: true,
  url: true,
  type: true,
  category: true,
  vehicleId: true,
  userId: true,
} as const;

export const profileSelects = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isVerified: true,
  language: true,
  theme: true,
  status: true,
  isOnboarded: true,
  createdAt: true,
  updatedAt: true,
  phoneNumber: true,
  dateOfBirth: true,
  isPhoneVerified: true,
  isPassengerOnboarded: true,
  isDriverOnboarded: true,
  isAvailableForChauffeur: true,
  chauffeurHourlyRate: true,
  chauffeurDailyRate: true,
  chauffeurDescription: true,
  languagesSpoken: true,
  isAvailableForRideRequest: true,
  kycStatus: true,
  kycReviewedAt: true,
  kycReviewNotes: true,
  averageRating: true,
  totalRatings: true,
  isStripeOnboarded: true,
  isEmailVerified: true,
  notificationPref: true,
  profileImage: {
    select: {
      url: true,
    },
  },
  licenseImages: {
    include: {
      frontImage: true,
      backImage: true,
    }
  },
  referralCode: true,
  twoFactorEnabled: true,
  frequentRoutes: true,
  travelPreferences: true,
  termsAccepted: true,
  billingAddress: true,
} as const;

type Point = {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
};

export type ExtendRide = {
  depLocation?: Point;
  destLocation?: Point;
};

export enum Platforms {
  web = "web",
  mobile = "mobile"
}
