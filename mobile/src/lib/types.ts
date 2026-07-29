export interface User {
  id: number;
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  profileImage: { url: string | null } | null;
  role?: "USER" | "ADMIN";
  status?: "ACTIVE" | "SUSPENDED";
  isVerified?: boolean;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  isOnboarded?: boolean;
  isPassengerOnboarded?: boolean;
  isDriverOnboarded?: boolean;
  isStripeOnboarded?: boolean;
  isAvailableForChauffeur?: boolean;
  chauffeurHourlyRate?: string | null;
  chauffeurDailyRate?: string | null;
  chauffeurDescription?: string | null;
  isAvailableForRideRequest?: boolean;
  averageRating: number | null;
  totalRatings: number;
  referralCode?: string | null;
  createdAt?: string;
  kycStatus?: "PENDING" | "APPROVED" | "REJECTED";
  kycReviewNotes?: string | null;
  languagesSpoken?: string[] | null;
}

export interface Vehicle {
  id: number;
  userId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  capacity: number;
  category: VehicleCategory;
  files: Asset[];
  defaultImage: Asset | null;
  isAvailableForRental: boolean;
  hourlyRate: string | null;
  dailyRate: string | null;
  securityDeposit: string | null;
  rentalDescription: string | null;
  mileageLimit: number | null;
  fuelPolicy: FuelPolicy | null;
  createdAt: string;
  kycStatus?: "PENDING" | "APPROVED" | "REJECTED";
  kycReviewNotes?: string | null;
  transmission?: "MANUAL" | "AUTOMATIC" | null;
  fuelType?: "PETROL" | "DIESEL" | "ELECTRIC" | "HYBRID" | null;
  status?: "AVAILABLE" | "MAINTENANCE" | "DISABLED";
  tier?: "ECONOMY" | "PREMIUM" | null;
}

export type VehicleCategory = "CAR" | "MOTORBIKE" | "BUS";

export interface Asset {
  id: number;
  url: string;
  type?: string;
  category?: string;
}

export interface Location {
  id: number;
  locationName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
  country?: string;
  region?: string;
}

export interface Ride {
  id: number;
  driverId: string;
  driver: User;
  vehicle: Vehicle;
  departureLocation: Location;
  destinationLocation: Location;
  stopovers: Location[];
  departureTime: string;
  estimatedArrivalTime: string | null;
  availableSeats: number;
  totalSeats: number;
  contribution: number;
  status: RideStatus;
  type: "P2P" | "D2D";
  bookingType: "AUTOMATIC" | "MANUAL";
  contributionCollectionMethod: "VIA_PLATFORM" | "DIRECT";
  preferences: RidePreferences;
  bookings: Booking[];
  route?: BusRoute;
  createdAt: string;
}

export type RideStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "BLOCKED";

export interface RidePreferences {
  airConditioning: boolean;
  smoking: boolean;
  pets: boolean;
  ladiesOnly: boolean;
  gentsOnly: boolean;
  bicycleSupport: boolean;
  luggageSize: string;
}

export interface Booking {
  id: number;
  rideId: number;
  userId: number;
  booker?: Pick<User, "id" | "firstName" | "profileImage">;
  ride?: Pick<Ride, "departureLocation" | "destinationLocation" | "departureTime">;
  seats: number;
  status: BookingStatus;
  totalAmount?: number;
  attendanceCode?: string | null;
  bookingSeats?: { attendanceCode: string }[];
  createdAt: string;
}

export type BookingStatus =
  | "PENDING"
  | "APPROVED"
  | "DECLINED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED"
  | "DISPUTED";

export interface D2DBookingRequest {
  id: string;
  rideId: string;
  passengerId: string;
  passenger: User;
  pickupLocation: Location;
  dropoffLocation: Location;
  status: "POSTED" | "ACCEPTED" | "DECLINED" | "CANCELED" | "EXPIRED";
  detourKm: number | null;
  detourMinutes: number | null;
  createdAt: string;
}

export type RentalStatus = "REQUESTED" | "APPROVED" | "DECLINED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "DISPUTED";
export type RentalType = "HOURLY" | "DAILY";
export type FuelPolicy = "FULL_TO_FULL" | "SAME_LEVEL";

export interface CarRental {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  renterId: string;
  renter: User;
  ownerId: string;
  owner: User;
  rentalType: RentalType;
  startDate: string;
  endDate: string;
  totalAmount: number;
  securityDeposit: number;
  status: RentalStatus;
  fuelPolicy: FuelPolicy;
  mileageLimit: number | null;
  createdAt: string;
}

export type BookedRange = {
  start: string;  // ISO 8601 datetime
  end: string;    // ISO 8601 datetime
  kind: "RENTAL" | "CHAUFFEUR" | "BLOCK";
};

export interface RentalVehicleListing {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  category: VehicleCategory;
  files: Asset[];
  defaultImage: Asset | null;
  hourlyRate: string | null;
  dailyRate: string | null;
  securityDeposit: string | null;
  capacity: number;
  isAvailableForRental: boolean;
  rentalDescription: string | null;
  mileageLimit: number | null;
  fuelPolicy: string | null;
  user?: User;
  bookedRanges?: BookedRange[];
}

export type ChauffeurStatus = "REQUESTED" | "ACCEPTED" | "DECLINED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "DISPUTED";
export type ChauffeurServiceType = "HOURLY" | "DAILY";

export interface ChauffeurService {
  id: number;
  driverId: number;
  driver: User;
  passengerId: number;
  passenger: User;
  serviceType: ChauffeurServiceType;
  startDate: string;
  endDate: string;
  totalAmount: string;  // Prisma Decimal serializes to string
  status: ChauffeurStatus;
  vehicle: Vehicle | null;
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  pickupNotes: string | null;
  dropoffNotes: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellerId: number | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChauffeurDriverListing {
  id: string;
  firstName: string;
  lastName: string;
  profileImage: Asset | null;
  averageRating: number | null;
  totalRatings: number;
  chauffeurHourlyRate: string | null;
  chauffeurDailyRate: string | null;
  chauffeurDescription: string | null;
  drivingExperience: number | null;
  bookedRanges?: BookedRange[];
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  type: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
}

export interface ChatThread {
  id: number;
  rideId: number | null;
  users: User[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  threadId: number;
  senderId: number;
  sender: User;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;    // Stored as "English | French" by server; split on " | " client-side
  message: string;  // Stored as "English | French" by server; split on " | " client-side
  isRead: boolean;
  createdAt: string;
  // Deep-link foreign keys — at most one is non-null per notification row.
  // resolveNotificationRoute() uses these to open the correct detail screen.
  rideId: number | null;
  rideRequestId: number | null;
  rentalId: number | null;
  chauffeurServiceId: number | null;
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  type: "RIDE" | "RENTAL" | "CHAUFFEUR";
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface BusRouteStop {
  id: number;
  routeId: number;
  name: string;
  city: string;
  order: number;
  latitude: number | null;
  longitude: number | null;
}

export interface BusRoute {
  id: number;
  operatorId: number;
  originCity: string;
  destCity: string;
  distanceKm: number;
  basePrice: string;
  isActive: boolean;
  stops: BusRouteStop[];
}

export interface BusOperator {
  id: number;
  name: string;
  photoUrl: string | null;
  rating: number | null;
  totalRatings: number;
  routeCount: number;
}

export interface BusTrip {
  id: number;
  departureTime: string;
  estimatedArrivalTime: string | null;
  availableSeats: number;
  totalSeats: number;
  contribution: number;
  vehicle?: Pick<Vehicle, "make" | "model" | "plateNumber" | "capacity">;
}

export interface BusRouteDeparture {
  id: number;
  timeOfDay: string;
  fare: number;
  vehicle?: { make: string; model: string; plateNumber: string; capacity: number };
}

export interface RideSearchParams {
  originCity?: string;
  destinationCity?: string;
  /** Epoch ms — server treats this as a day-bucket filter on `Ride.departureTime`. */
  departureTime?: number;
  passengers?: number;
  rideType?: "P2P" | "D2D";
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  vehicleCategory?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  referralCode?: string;
  agreeToTerms: boolean;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  message?: string;
}
