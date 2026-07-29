export const defaultRideDetails = (defaultPreferences: any) => {
  return {
    departure: {
      region: "",
      city: "",
      locationName: "",
      latitude: undefined,
      longitude: undefined,
      address: "",
    },
    destination: {
      region: "",
      city: "",
      locationName: "",
      latitude: undefined,
      longitude: undefined,
      address: "",
    },
    departureTime: "",
    estimatedArrivalTime: "",
    availableSeats: 4,
    contribution: 3,
    vehicleId: 0,
    bookingType: "",
    contributionCollectionMethod: "VIA_PLATFORM",
    paymentMethodDisplay: "",
    preferences: defaultPreferences,
    stopovers: [],
    enableD2D: false,
    d2dRadiusKm: 5,
    d2dExtraKmPrice: 0,
    driverStartLocation: {
      region: "",
      city: "",
      locationName: "",
      latitude: undefined,
      longitude: undefined,
      address: "",
    },
    driverStopLocation: {
      region: "",
      city: "",
      locationName: "",
      latitude: undefined,
      longitude: undefined,
      address: "",
    },
  };
};

export const defaultPreferences = (userPreferences: any) => {
  return {
    smoking: userPreferences?.smoking ?? false,
    pets: userPreferences?.pets ?? false,
    airConditioning: userPreferences?.airConditioning ?? false,
    bicycleSupport: userPreferences?.bicycleSupport ?? false,
    snowTires: userPreferences?.snowTires ?? false,
    skiRack: userPreferences?.skiRack ?? false,
    ladiesOnly: userPreferences?.ladiesOnly ?? false,
    gentsOnly: userPreferences?.gentsOnly ?? false,
    luggageSize: userPreferences?.luggageSize ?? "NONE",
    luggageCount: userPreferences?.luggageCount ?? 0,
    music: userPreferences?.music ?? "NOT_AT_ALL",
    additionalNotes: userPreferences?.additionalNotes ?? "",
  };
};

export const resetRideDetailsData = {
  departure: {
    region: "",
    city: "",
    locationName: "",
    latitude: undefined,
    longitude: undefined,
    address: "",
  },
  destination: {
    region: "",
    city: "",
    locationName: "",
    latitude: undefined,
    longitude: undefined,
    address: "",
  },
  departureTime: "",
  estimatedArrivalTime: "",
  availableSeats: 4,
  contribution: 3,
  vehicleId: 0,
  bookingType: "",
  contributionCollectionMethod: "",
  paymentMethodDisplay: "",
  preferences: {
    smoking: false,
    pets: false,
    airConditioning: false,
    bicycleSupport: false,
    snowTires: false,
    luggageSize: "NONE",
    luggageCount: 0,
  },
  stopovers: [],
};

export const getLocationName = (location: any, type: string) => {
  if (!location) {
    console.warn(`${type} location is null/undefined`);
    return `${type} Location`;
  }

  const locationName = location.locationName?.trim();
  const address = location.address?.trim();
  const city = location.city?.trim();
  const region = location.region?.trim();

  if (locationName && locationName.length > 0) return locationName;
  if (address && address.length > 0) return address;
  if (city && city.length > 0) return region ? `${city}, ${region}` : city;

  console.warn(`${type} location has no valid name, using fallback`);
  return `${type} Location`;
};
