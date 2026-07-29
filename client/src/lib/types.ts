export type AuthUser = {
  agreeMarketing?: boolean;
  agreeTerms?: boolean;
  email: string;
  name: string;
  password?: string;
  role: "driver" | "passenger" | "admin" | "BUS_OPERATOR";
  theme: string;
  language: string;
  id: string;
  profileImage: {
    url: string;
  };
  isPassengerOnboarded?: boolean;
};

export interface VehicleFile {
  id: number;
  url: string;
  // Add other properties if needed
}

// Vehicle Category
export type VehicleCategory = "CAR" | "MOTORBIKE";

// Fuel Policy
export type FuelPolicy = "FULL_TO_FULL" | "SAME_LEVEL";

export type Transmission = "MANUAL" | "AUTOMATIC";
export type FuelType = "PETROL" | "DIESEL" | "ELECTRIC" | "HYBRID";
export type VehicleStatus = "AVAILABLE" | "MAINTENANCE" | "DISABLED";
export type VehicleTier = "ECONOMY" | "PREMIUM";

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  userId: number;
  verified: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  defaultImage: string | null;
  defaultImageId: number | null;
  files: VehicleFile[];
  user?: {
    id: number;
    name: string;
    email: string;
  }; // Owner information
  // Rental/chauffeur optional fields
  isAvailableForRental?: boolean;
  hourlyRate?: string | null;
  dailyRate?: string | null;
  securityDeposit?: string | null;
  rentalDescription?: string | null;
  mileageLimit?: number | null;
  fuelPolicy?: FuelPolicy;
  category?: VehicleCategory;
  transmission?: Transmission | null;
  fuelType?: FuelType | null;
  status?: VehicleStatus;
  tier?: VehicleTier | null;
}

type UserRole = "PASSENGER" | "DRIVER" | string;
type UserStatus = "ACTIVE" | "INACTIVE" | "BANNED"; // Add others if needed
type UserTheme = "light" | "dark" | "system";
type UserLanguage = "EN" | "FR" | string;

export interface IUser {
  id: number;
  name: string;
  email: string;
  phoneNumber: string | null;
  gender: string | null;
  profileImage: string;
  language: UserLanguage;
  theme: UserTheme;
  roles: UserRole[];
  status: UserStatus;
  isVerified: boolean;
  isPhoneVerified: boolean;
  isOnboarded: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  // Chauffeur optional fields
  isAvailableForChauffeur?: boolean;
  chauffeurHourlyRate?: string | null;
  chauffeurDailyRate?: string | null;
  chauffeurDescription?: string | null;
}

// const user = {
//   name: "",
//   email: "",
//   phoneNumber: "",
//   gender: "",
//   profileImage: "",
//   language: "",
//   theme: "",
//   roles: "",
//   status: "",
//   isVerified: "",
//   isPhoneVerified: "",
//   isOnboarded: "",
//   createdAt: "",
//   updatedAt: "",
//   dateOfBirth: "",
//   termsAccepted: true,
//   notificationPref: "email",
//   twoFactorEnabled: false,
//   passenger: {
//     travelPreferences: [],
//     frequentRoutes: "",
//     emergencyContactName: "",
//     emergencyContactPhone: "",
//     referralCode: "",
//   },
//   driver: {
//     licenseNumber: "",
//     licenseImage: null,
//     drivingExperience: "",
//   },
// };

/**
 * Endpoint for Passenger will accept these data
 */
// const user = {
//   phoneNumber: "",
//   profilePicture: null,
//   gender: "",
//   dateOfBirth: "",
//   termsAccepted: true,
//   notificationPref: "email",
//   twoFactorEnabled: false,
//   passenger: {
//     travelPreferences: [],
//     frequentRoutes: "",
//     emergencyContactName: "",
//     emergencyContactPhone: "",
//     referralCode: "",
//   },
// };

// /**
//  * Endpoint for Driver will accept these data
//  */
// const user = {
//   phoneNumber: "",
//   profilePicture: null,
//   gender: "",
//   dateOfBirth: "",
//   termsAccepted: true,
//   notificationPref: "email",
//   twoFactorEnabled: false,
//   driver: {
//     licenseNumber: "",
//     licenseImage: null,
//     drivingExperience: "",
//   },
// };

export type DoorToDoorRequestStatus =
  | "POSTED"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELED"
  | "EXPIRED";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface DoorToDoorPlace extends GeoPoint {
  address: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  formattedAddress?: string;
  locationName?: string;
}

export interface DoorToDoorRequestLogEntry {
  id: number;
  status: DoorToDoorRequestStatus | "POSTED";
  actor: "PASSENGER" | "DRIVER" | "SYSTEM";
  message?: string;
  createdAt: string;
}

export interface DoorToDoorPassengerSummary {
  id: number;
  name: string;
  avatarUrl?: string;
  rating?: number;
  phoneNumber?: string | null;
}

export interface DoorToDoorRequest {
  id: number;
  rideId: number;
  ride?: any;
  doorToDoorRideId: number;
  bookingId?: number;
  passengerId: number;
  pickup: DoorToDoorPlace;
  dropoff: DoorToDoorPlace;
  status: DoorToDoorRequestStatus;
  note?: string;
  detourKm?: number;
  detourMinutes?: number;
  submittedAt: string;
  updatedAt: string;
  auditTrail?: DoorToDoorRequestLogEntry[];
  passenger?: DoorToDoorPassengerSummary;
}

export interface DoorToDoorRide {
  id: number;
  rideId: number;
  driverId: number;
  radiusKm: number;
  capacity: number;
  remainingCapacity: number;
  isEnabled: boolean;
  locked: boolean;
  status: "OFF" | "ON" | "LOCKED";
  totalRequests: number;
  acceptedRequestId?: number | null;
  createdAt: string;
  updatedAt: string;
  ride?: any;
  activeRequest?: DoorToDoorRequest | null;
  requests?: DoorToDoorRequest[];
  configurationNotes?: string | null;
}

export interface DoorToDoorSettingsPayload {
  rideId: number;
  radiusKm: number;
  capacity: number;
  notes?: string;
}

export interface DoorToDoorDecisionPayload {
  requestId: number;
  action: "accept" | "decline" | "cancel";
  message?: string;
}

// Location
export interface Location {
  id: number;
  region: string;
  city: string;
  locationName: string;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
}

// === RENTAL TYPES ===

export type RentalType = "HOURLY" | "DAILY";

export type RentalStatus =
  | "REQUESTED"
  | "APPROVED"
  | "DECLINED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export interface CarRental {
  id: number;
  vehicleId: number;
  vehicle: Vehicle & {
    category: VehicleCategory;
    hourlyRate: string | null;
    dailyRate: string | null;
    securityDeposit: string | null;
    rentalDescription: string | null;
    mileageLimit: number | null;
    fuelPolicy: FuelPolicy;
    pickupLocation: Location | null;
  };
  renterId: number;
  renter: { id: number; name: string; email: string; profileImage?: { url: string } };
  ownerId: number;
  owner: { id: number; name: string; email: string; profileImage?: { url: string } };
  startDate: string;
  endDate: string;
  rentalType: RentalType;
  totalAmount: string;
  securityDepositAmount: string;
  status: RentalStatus;
  pickupLocation: Location | null;
  returnLocation: Location | null;
  pickupNotes: string | null;
  returnNotes: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  depositRefunded: boolean;
  transactionId: number | null;
  depositTransactionId: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: { reports?: number };
}

export interface RentalVehicleListing {
  id: number;
  make: string;
  model: string;
  year: number | null;
  color: string;
  plateNumber: string;
  category: VehicleCategory;
  capacity: number;
  hourlyRate: string | null;
  dailyRate: string | null;
  securityDeposit: string | null;
  rentalDescription: string | null;
  mileageLimit: number | null;
  fuelPolicy: FuelPolicy;
  defaultImage: { url: string } | null;
  files: { id: number; url: string }[];
  pickupLocation: Location | null;
  user: { id: number; name: string; profileImage?: { url: string } };
}

export interface RentalSettings {
  id: number;
  platformFeePercentage: string;
  maxRentalDurationDays: number;
  minRentalDurationHours: number;
  requestExpiryHours: number;
  depositReleaseReminderHours: number;
}

// === CHAUFFEUR TYPES ===

export type ChauffeurServiceType = "HOURLY" | "DAILY";

export type ChauffeurStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "DECLINED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export interface ChauffeurService {
  id: number;
  vehicleId: number;
  vehicle: Vehicle & { category: VehicleCategory };
  passengerId: number;
  passenger: { id: number; name: string; email: string; profileImage?: { url: string } };
  driverId: number;
  driver: { id: number; name: string; email: string; profileImage?: { url: string } };
  startDate: string;
  endDate: string;
  serviceType: ChauffeurServiceType;
  totalAmount: string;
  status: ChauffeurStatus;
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  pickupNotes: string | null;
  dropoffNotes: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  transactionId: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: { reports?: number };
}

export interface ChauffeurDriverListing {
  id: number;
  name: string;
  email: string;
  profileImage?: { url: string };
  chauffeurHourlyRate: string | null;
  chauffeurDailyRate: string | null;
  chauffeurDescription: string | null;
  vehicles: (Vehicle & { category: VehicleCategory })[];
}

export interface ChauffeurSettings {
  id: number;
  platformFeePercentage: string;
  maxServiceDurationDays: number;
  minServiceDurationHours: number;
  requestExpiryHours: number;
  overdueGracePeriodHours: number;
}

// === CREATE REQUEST TYPES ===

export interface CreateRentalRequest {
  vehicleId: number;
  startDate: string;
  endDate: string;
  rentalType: RentalType;
  pickupNotes?: string;
  returnNotes?: string;
  pickupLocation?: Omit<Location, "id">;
  returnLocation?: Omit<Location, "id">;
}

export interface CreateChauffeurRequest {
  vehicleId: number;
  driverId: number;
  startDate: string;
  endDate: string;
  serviceType: ChauffeurServiceType;
  pickupNotes?: string;
  dropoffNotes?: string;
  pickupLocation?: Omit<Location, "id">;
  dropoffLocation?: Omit<Location, "id">;
}
