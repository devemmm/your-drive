import { LuggageSize, Prisma, RideType, VehicleCategory } from "@prisma/client";
import moment from "moment";
import { prisma } from "../../config/database";
// Re-use the Viewer discriminated-union introduced by the sibling rental
// search service. Keeping a single source of truth for the type ensures
// every public-mirror endpoint shares the same guest / authed contract.
import type { Viewer } from "./rentalSearch.service";

export interface RideSearchPreferences {
  smoking?: boolean;
  pets?: boolean;
  airConditioning?: boolean;
  ladiesOnly?: boolean;
  gentsOnly?: boolean;
  bicycleSupport?: boolean;
  snowTires?: boolean;
  luggageSize?: LuggageSize;
  luggageCount?: boolean;
}

export interface RideSearchFilters {
  page?: number;
  pageSize?: number;
  departureCity?: string;
  destinationCity?: string;
  /**
   * Epoch milliseconds — the controller's validator pre-coerces the query
   * parameter via `.toInt()`. The service treats it as a day-bucket
   * (matches rides whose `departureTime` falls inside the same UTC day).
   */
  departureTime?: number;
  minContribution?: number;
  maxContribution?: number;
  userLatitude?: number;
  userLongitude?: number;
  radiusKm?: number;
  preferences?: RideSearchPreferences;
  type?: RideType;
  vehicleCategory?: VehicleCategory;
  originCity?: string;
  destCity?: string;
}

/**
 * Shape returned to the controllers — the same payload the legacy
 * `RideController.searchRides` handler emitted, just produced from a
 * single shared service so the guest mirror and any future authed
 * mirror render identical data (modulo the PII strip).
 */
export interface RideSearchResult {
  items: any[];
  suggestions: any[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Shared posted-P2P-ride search.
 *
 * The query body is lifted verbatim from the legacy controller (raw SQL
 * + PostGIS distance + relaxed-suggestion fallback). Only the response
 * mapper differs between viewers: guests have `driver.phoneNumber` /
 * `driver.email` stripped before the rows leave the service.
 *
 * The viewer parameter cannot influence the SQL because the raw SELECT
 * always builds a `json_build_object(...)` for the driver — narrowing
 * the projection there would mean templating the query string per
 * viewer, which is more risky than a final mapper pass.
 */
export async function listRides(args: {
  viewer: Viewer;
  filters: RideSearchFilters;
}): Promise<RideSearchResult> {
  const { viewer, filters } = args;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const radiusKm = filters.radiusKm ?? 30;
  const preferences: RideSearchPreferences = { ...(filters.preferences ?? {}) };

  const hasGeo =
    typeof filters.userLatitude === "number" &&
    typeof filters.userLongitude === "number";

  const distanceSelect = hasGeo
    ? Prisma.sql`ST_Distance(dl."locationPoint", ST_MakePoint(${filters.userLongitude}, ${filters.userLatitude})::geography) as distance`
    : Prisma.sql`NULL as distance`;

  const orderBySql = hasGeo
    ? Prisma.sql`ORDER BY distance ASC`
    : Prisma.sql`ORDER BY r."departureTime" ASC`;

  // Strict main-search conditions — identical to the legacy controller.
  const conditions: Prisma.Sql[] = [
    Prisma.sql`r.status = 'PUBLISHED'`,
    Prisma.sql`r."isBlocked" = false`,
    Prisma.sql`r."isDeleted" = false`,
    Prisma.sql`r."availableSeats" > 0`,
    Prisma.sql`r."departureTime" >= NOW()`,
    Prisma.sql`NOT (r.type = 'D2D' AND r."rideRequestId" IS NOT NULL)`,
  ];

  if (hasGeo) {
    conditions.push(
      Prisma.sql`ST_DWithin(dl."locationPoint", ST_MakePoint(${filters.userLongitude}, ${filters.userLatitude})::geography, ${
        radiusKm * 1000
      })`
    );
  }

  // `originCity` / `destCity` are the field names the mobile client sends
  // (and were previously honored only inside the BUS-route branch below).
  // Treat them as aliases for `departureCity` / `destinationCity` so the
  // Location filter applies to every search, regardless of vehicleCategory.
  // Without this, posted P2P bus rides (which never get a `BusRoute` link)
  // were invisible to passenger BUS searches.
  const originCityFilter = (filters.departureCity ?? filters.originCity)?.trim();
  const destCityFilter = (filters.destinationCity ?? filters.destCity)?.trim();
  if (originCityFilter) {
    conditions.push(
      Prisma.sql`LOWER(dl.city) LIKE ${`%${originCityFilter.toLowerCase()}%`}`
    );
  }
  if (destCityFilter) {
    conditions.push(
      Prisma.sql`LOWER(dest.city) LIKE ${`%${destCityFilter.toLowerCase()}%`}`
    );
  }
  if (typeof filters.minContribution === "number") {
    conditions.push(Prisma.sql`r.contribution >= ${filters.minContribution}`);
  }
  if (typeof filters.maxContribution === "number") {
    conditions.push(Prisma.sql`r.contribution <= ${filters.maxContribution}`);
  }
  if (
    typeof filters.departureTime === "number" &&
    !isNaN(filters.departureTime)
  ) {
    const startOfDay = moment(filters.departureTime).startOf("day").toDate();
    const endOfDay = moment(filters.departureTime).endOf("day").toDate();
    conditions.push(
      Prisma.sql`r."departureTime" >= ${startOfDay} AND r."departureTime" <= ${endOfDay}`
    );
  }
  if (filters.type) {
    conditions.push(Prisma.sql`r.type = ${filters.type}::"RideType"`);
  }
  if (filters.vehicleCategory) {
    conditions.push(
      Prisma.sql`v.category = ${filters.vehicleCategory}::"VehicleCategory"`
    );
  }
  // BUS searches used to require a `BusRoute` join here, but the post-ride
  // wizard never creates one — that filter silently excluded every
  // wizard-posted bus ride. Bus-route discovery is a separate concept and
  // already has its own endpoint at `/public/bus-routes/search`.

  // Preferences (strict search only).
  if (preferences.luggageSize === LuggageSize.NONE) {
    preferences.luggageCount = undefined;
  }
  Object.entries(preferences).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === "luggageSize") {
        conditions.push(
          Prisma.sql`rp."luggageSize" = ${value}::"LuggageSize"`
        );
      } else {
        conditions.push(Prisma.sql`rp."${Prisma.raw(key)}" = ${value}`);
      }
    }
  });

  // Relaxed conditions for suggestions when the strict query is empty.
  const suggestionConditions: Prisma.Sql[] = [
    Prisma.sql`r.status = 'PUBLISHED'`,
    Prisma.sql`r."isBlocked" = false`,
    Prisma.sql`r."isDeleted" = false`,
    Prisma.sql`r."availableSeats" > 0`,
    Prisma.sql`r."departureTime" >= NOW()`,
  ];
  if (hasGeo) {
    suggestionConditions.push(
      Prisma.sql`ST_DWithin(dl."locationPoint", ST_MakePoint(${filters.userLongitude}, ${filters.userLatitude})::geography, ${
        radiusKm * 5 * 1000
      })`
    );
  }
  if (originCityFilter) {
    suggestionConditions.push(
      Prisma.sql`LOWER(dl.city) LIKE ${`%${originCityFilter.toLowerCase()}%`}`
    );
  }
  // Destination city filter is intentionally dropped for broader suggestions.

  const [rawRides, [{ count: total } = { count: 0 }], rawSuggestions] =
    await prisma.$transaction([
      // Main search query.
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          r.*,
          json_build_object(
            'id', v.id, 'make', v.make, 'model', v.model, 'color', v.color, 'plateNumber', v."plateNumber",
            'category', v.category, 'seatLayout', v."seatLayout",
            'defaultImage', json_build_object('url', vi.url),
            'files', (
              SELECT COALESCE(json_agg(json_build_object(
                'id', f.id, 'url', f.url, 'type', f.type, 'category', f.category
              )), '[]'::json) FROM "Asset" f WHERE f."vehicleId" = v.id
            )
          ) as vehicle,
          json_build_object(
            'id', d.id, 'firstName', d."firstName", 'lastName', d."lastName", 'email', d.email, 'phoneNumber', d."phoneNumber", 'language', d.language, 'averageRating', d."averageRating", 'totalRatings', d."totalRatings",
            'profileImage', json_build_object('url', pi.url)
          ) as driver,
          json_build_object(
            'id', dl.id, 'country', dl.country, 'region', dl.region, 'regionCode', dl."regionCode", 'city', dl.city, 'locationName', dl."locationName", 'address', dl.address, 'latitude', dl.latitude, 'longitude', dl.longitude
          ) as "departureLocation",
          json_build_object(
            'id', dest.id, 'country', dest.country, 'region', dest.region, 'regionCode', dest."regionCode", 'city', dest.city, 'locationName', dest."locationName", 'address', dest.address, 'latitude', dest.latitude, 'longitude', dest.longitude
          ) as "destinationLocation",
          json_build_object(
            'id', rp.id, 'smoking', rp.smoking, 'pets', rp.pets, 'airConditioning', rp."airConditioning",
            'ladiesOnly', rp."ladiesOnly", 'gentsOnly', rp."gentsOnly", 'snowTires', rp."snowTires"
          ) as preferences,
          (
            SELECT COALESCE(json_agg(json_build_object(
              'id', s.id, 'city', s.city, 'locationName', s."locationName", 'latitude', s.latitude, 'longitude', s.longitude
            )), '[]'::json) FROM "Location" s WHERE s."rideStopoverId" = r.id
          ) as stopovers,
          CASE WHEN br.id IS NOT NULL THEN json_build_object(
            'id', br.id, 'originCity', br."originCity", 'destCity', br."destCity",
            'distanceKm', br."distanceKm", 'basePrice', br."basePrice", 'isActive', br."isActive",
            'stops', (
              SELECT COALESCE(json_agg(json_build_object(
                'id', brs.id, 'name', brs.name, 'city', brs.city, 'order', brs."order",
                'latitude', brs.latitude, 'longitude', brs.longitude
              ) ORDER BY brs."order" ASC), '[]'::json)
              FROM "BusRouteStop" brs WHERE brs."routeId" = br.id
            )
          ) ELSE NULL END as route,
          ${distanceSelect}
        FROM "Ride" r
        LEFT JOIN "Vehicle" v ON v.id = r."vehicleId"
        LEFT JOIN "Asset" vi ON v."defaultImageId" = vi.id
        LEFT JOIN "User" d ON d.id = r."driverId"
        LEFT JOIN "Asset" pi ON pi."userId" = d."id"
        LEFT JOIN "RidePreference" rp ON rp."rideId" = r.id
        LEFT JOIN "Location" dl ON dl.id = r."departureLocationId"
        LEFT JOIN "Location" dest ON dest.id = r."destinationLocationId"
        LEFT JOIN "BusRoute" br ON br.id = r."routeId"
        WHERE ${Prisma.join(conditions, " AND ")}
        ${orderBySql}
        LIMIT ${Prisma.raw(String(pageSize))}
        OFFSET ${Prisma.raw(String(skip))}
      `),

      // Main count.
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT COUNT(*)::int FROM "Ride" r
        LEFT JOIN "Vehicle" v ON v.id = r."vehicleId"
        LEFT JOIN "RidePreference" rp ON rp."rideId" = r.id
        LEFT JOIN "Location" dl ON dl.id = r."departureLocationId"
        LEFT JOIN "Location" dest ON dest.id = r."destinationLocationId"
        LEFT JOIN "BusRoute" br ON br.id = r."routeId"
        WHERE ${Prisma.join(conditions, " AND ")}
      `),

      // Suggestions query with full data, relaxed filters.
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          r.*,
          json_build_object(
            'id', v.id, 'make', v.make, 'model', v.model, 'color', v.color, 'plateNumber', v."plateNumber",
            'category', v.category, 'seatLayout', v."seatLayout",
            'defaultImage', json_build_object('url', vi.url),
            'files', (
              SELECT COALESCE(json_agg(json_build_object(
                'id', f.id, 'url', f.url, 'type', f.type, 'category', f.category
              )), '[]'::json) FROM "Asset" f WHERE f."vehicleId" = v.id
            )
          ) as vehicle,
          json_build_object(
            'id', d.id, 'firstName', d."firstName", 'lastName', d."lastName", 'email', d.email, 'phoneNumber', d."phoneNumber", 'language', d.language, 'averageRating', d."averageRating", 'totalRatings', d."totalRatings",
            'profileImage', json_build_object('url', pi.url)
          ) as driver,
          json_build_object(
            'id', dl.id, 'country', dl.country, 'region', dl.region, 'regionCode', dl."regionCode", 'city', dl.city, 'locationName', dl."locationName", 'address', dl.address, 'latitude', dl.latitude, 'longitude', dl.longitude
          ) as "departureLocation",
          json_build_object(
            'id', dest.id, 'country', dest.country, 'region', dest.region, 'regionCode', dest."regionCode", 'city', dest.city, 'locationName', dest."locationName", 'address', dest.address, 'latitude', dest.latitude, 'longitude', dest.longitude
          ) as "destinationLocation",
          json_build_object(
            'id', rp.id, 'smoking', rp.smoking, 'pets', rp.pets, 'airConditioning', rp."airConditioning",
            'ladiesOnly', rp."ladiesOnly", 'gentsOnly', rp."gentsOnly", 'snowTires', rp."snowTires"
          ) as preferences,
          (
            SELECT COALESCE(json_agg(json_build_object(
              'id', s.id, 'city', s.city, 'locationName', s."locationName", 'latitude', s.latitude, 'longitude', s.longitude
            )), '[]'::json) FROM "Location" s WHERE s."rideStopoverId" = r.id
          ) as stopovers,
          CASE WHEN br.id IS NOT NULL THEN json_build_object(
            'id', br.id, 'originCity', br."originCity", 'destCity', br."destCity",
            'distanceKm', br."distanceKm", 'basePrice', br."basePrice", 'isActive', br."isActive",
            'stops', (
              SELECT COALESCE(json_agg(json_build_object(
                'id', brs.id, 'name', brs.name, 'city', brs.city, 'order', brs."order",
                'latitude', brs.latitude, 'longitude', brs.longitude
              ) ORDER BY brs."order" ASC), '[]'::json)
              FROM "BusRouteStop" brs WHERE brs."routeId" = br.id
            )
          ) ELSE NULL END as route,
          ${distanceSelect}
        FROM "Ride" r
        LEFT JOIN "Vehicle" v ON v.id = r."vehicleId"
        LEFT JOIN "Asset" vi ON v."defaultImageId" = vi.id
        LEFT JOIN "User" d ON d.id = r."driverId"
        LEFT JOIN "Asset" pi ON pi."userId" = d."id"
        LEFT JOIN "RidePreference" rp ON rp."rideId" = r.id
        LEFT JOIN "Location" dl ON dl.id = r."departureLocationId"
        LEFT JOIN "Location" dest ON dest.id = r."destinationLocationId"
        LEFT JOIN "BusRoute" br ON br.id = r."routeId"
        WHERE ${Prisma.join(suggestionConditions, " AND ")}
        ${orderBySql}
        LIMIT 10
      `),
    ]);

  const formatRide = (ride: any) => {
    const { departureLocation, destinationLocation, ...rest } = ride;
    const formatted: Record<string, unknown> =
      ride.type === "D2D"
        ? {
            ...rest,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          }
        : {
            ...rest,
            departureLocation,
            destinationLocation,
          };
    return mapRideForViewer(formatted, viewer);
  };

  const items = (rawRides as any[]).map(formatRide);
  const suggestions = (rawSuggestions as any[]).map(formatRide);

  return {
    items,
    suggestions,
    total,
    page,
    pageSize,
  };
}

/**
 * Defensive response mapper: guarantees driver phone / email are never
 * on the wire for guest viewers. The raw SQL `json_build_object` always
 * carries these fields, so stripping is done as a final post-process
 * pass — the canonical place to enforce the contract from one location.
 */
function mapRideForViewer<
  T extends { driver?: Record<string, unknown> | null }
>(ride: T, viewer: Viewer): T {
  if (!viewer.isGuest || !ride.driver) return ride;
  const { phoneNumber: _phone, email: _email, ...safeDriver } = ride.driver;
  return { ...ride, driver: safeDriver };
}
