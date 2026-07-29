export const queryKeys = {
  user: {
    profile: ["user", "profile"] as const,
    single: (id: string) => ["user", id] as const,
  },
  rides: {
    public: (params?: Record<string, unknown>) =>
      ["rides", "public", params] as const,
    search: (params?: Record<string, unknown>) =>
      ["rides", "search", params] as const,
    mine: ["rides", "mine"] as const,
    detail: (id: string) => ["rides", id] as const,
  },
  bookings: {
    mine: ["bookings", "mine"] as const,
    detail: (id: string) => ["bookings", id] as const,
  },
  d2d: {
    requests: (rideId: string) => ["d2d", "requests", rideId] as const,
  },
  vehicles: {
    mine: ["vehicles", "mine"] as const,
    detail: (id: string) => ["vehicles", id] as const,
  },
  chat: {
    threads: ["chat", "threads"] as const,
    messages: (threadId: string) => ["chat", "messages", threadId] as const,
  },
  notifications: {
    all: ["notifications"] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    detail: (id: string) => ["transactions", id] as const,
  },
  rentals: {
    available: (params?: Record<string, unknown>) => ["rentals", "available", params] as const,
    mine: ["rentals", "mine"] as const,
    detail: (id: string) => ["rentals", id] as const,
  },
  chauffeur: {
    drivers: (params?: Record<string, unknown>) => ["chauffeur", "drivers", params] as const,
    mine: (params?: Record<string, unknown>) => ["chauffeur", "mine", params] as const,
    detail: (id: string) => ["chauffeur", id] as const,
    service: (id: string | number) => ["chauffeur", "service", String(id)] as const,
  },
  rideRequests: {
    mine: ["rideRequests", "mine"] as const,
    detail: (id: string | number) => ["rideRequests", String(id)] as const,
    openForDrivers: ["rideRequests", "openForDrivers"] as const,
  },
  bids: {
    forRequest: (rideRequestId: number | string) => ["bids", "for-request", String(rideRequestId)] as const,
    detail: (bidId: number | string) => ["bids", String(bidId)] as const,
  },
  drivers: {
    nearby: (bounds: { swLat: number; swLng: number; neLat: number; neLng: number }) =>
      ["drivers", "nearby", bounds] as const,
  },
  bus: {
    operators: ["bus", "operators"] as const,
    routes: (operatorId: string) => ["bus", "routes", operatorId] as const,
    trips: (routeId: string) => ["bus", "trips", routeId] as const,
    tripDetail: (rideId: string) => ["bus", "trip", rideId] as const,
  },
} as const;

export const CLIENT_URL = (
  process.env.EXPO_PUBLIC_CLIENT_URL || "https://yourdrive.uat.co.zw"
).replace(/\/$/, "");

export const CLIENT_ROUTES = {
  helpCenter: `${CLIENT_URL}/help-center`,
  termsOfService: `${CLIENT_URL}/terms-of-service`,
  policies: `${CLIENT_URL}/policies`,
  contact: `${CLIENT_URL}/contact`,
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: "yourdrive_auth_token",
  USER_ROLE: "yourdrive_user_role",
  LANGUAGE: "yourdrive_language",
  CURRENT_VEHICLE_ID: "yourdrive_current_vehicle_id",
  HAS_SEEN_WELCOME: "@yourdrive/has_seen_welcome",
} as const;

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "rw", label: "Kinyarwanda" },
  { code: "fr", label: "French" },
  { code: "sw", label: "Swahili" },
  { code: "ar", label: "Arabic" },
] as const;

export const RIDE_PREFERENCE_ICONS: Record<string, string> = {
  airConditioning: "snowflake",
  noSmoking: "cigarette-off",
  petsAllowed: "paw-print",
  ladiesOnly: "user",
  gentsOnly: "user",
  bicycleSupport: "bike",
  luggageSize: "luggage",
} as const;
