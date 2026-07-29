import { VehicleCategory } from "@prisma/client";
import { prisma } from "../../config/database";
import {
  hashDriverToken,
  currentRotationKey,
} from "../../utils/driverPresenceToken";
// Re-use the Viewer discriminated-union introduced by the sibling rental
// search service. Keeping a single source of truth for the type ensures
// every public-mirror endpoint shares the same guest / authed contract.
import type { Viewer } from "./rentalSearch.service";

/**
 * Map bounding-box shape consumed by `listNearbyDrivers`. The query
 * validator (`nearbyValidator`) coerces each value with `.toFloat()`,
 * so callers always pass numbers.
 */
export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

/**
 * Wire shape of an individual nearby-driver entry. Lifted verbatim from
 * the legacy `DriverPresenceService.NearbyDriver` so the public and authed
 * endpoints emit identical rows.
 *
 * Note: `id` is the rotation-hashed driver token (NOT the raw user id).
 * The hash rotates daily so live coordinates can't be correlated across
 * days.
 */
export interface NearbyDriverRow {
  id: string;
  latitude: number;
  longitude: number;
  vehicleCategory: VehicleCategory;
}

export interface NearbyDriversResult {
  drivers: NearbyDriverRow[];
  fetchedAt: string;
}

// Constants mirror the legacy `DriverPresenceService.nearby` body — keep
// them aligned with that source so the migration stays a drop-in
// replacement.
const FRESHNESS_SECONDS = 30;
const MAX_NEARBY_RESULTS = 50;
const MAX_BBOX_DEGREES = 0.2;

/**
 * Shared "drivers near a viewport" search used by:
 *  - the legacy authed `DriverPresenceController.nearby` at
 *    `GET /drivers/nearby` (mounted behind `isAuthenticated`), and
 *  - the new `PublicDriversController.nearby` at
 *    `GET /public/drivers/nearby` (no auth).
 *
 * The legacy service's query is lifted verbatim — TTL freshness window,
 * bbox clamp, active-trip filter, and rotation-hashed `id` — so the wire
 * payload stays identical for both endpoints. The exposed row carries
 * only `id` / `latitude` / `longitude` / `vehicleCategory`; no
 * phone/email/raw-userId ever surfaces, so the guest and authed responses
 * are byte-for-byte identical.
 *
 * The `viewer` parameter is reserved for future personalization (e.g.
 * showing the user's own driver pin differently when authed). It does
 * not currently affect the output, but the defensive mapper still runs
 * to keep the contract auditable from one place.
 */
export async function listNearbyDrivers(args: {
  viewer: Viewer;
  bounds: MapBounds;
}): Promise<NearbyDriversResult> {
  const { viewer, bounds } = args;
  let { swLat, swLng, neLat, neLng } = bounds;

  // Clamp the bounding box to a max degree window. Mirrors the legacy
  // service — protects the database from runaway queries when a client
  // sends a near-global viewport.
  if (neLat - swLat > MAX_BBOX_DEGREES) {
    const mid = (neLat + swLat) / 2;
    swLat = mid - MAX_BBOX_DEGREES / 2;
    neLat = mid + MAX_BBOX_DEGREES / 2;
  }
  if (neLng - swLng > MAX_BBOX_DEGREES) {
    const mid = (neLng + swLng) / 2;
    swLng = mid - MAX_BBOX_DEGREES / 2;
    neLng = mid + MAX_BBOX_DEGREES / 2;
  }

  const freshAfter = new Date(Date.now() - FRESHNESS_SECONDS * 1000);

  const rows = await prisma.driverPresence.findMany({
    where: {
      updatedAt: { gt: freshAfter },
      latitude: { gte: swLat, lte: neLat },
      longitude: { gte: swLng, lte: neLng },
      user: { isAvailableForRideRequest: true },
      currentVehicleId: { not: null },
    },
    include: {
      user: { select: { id: true } },
      currentVehicle: { select: { category: true } },
    },
    take: MAX_NEARBY_RESULTS * 2,
  });

  if (rows.length === 0) {
    return { drivers: [], fetchedAt: new Date().toISOString() };
  }

  // Filter out drivers currently on an active trip. Same predicate set
  // as the legacy service — checks ride / D2D / chauffeur trips in
  // parallel via the existing `DriverPresenceService.hasActiveTrip`
  // helper, lazily imported to avoid a circular dependency.
  const { DriverPresenceService } = await import(
    "../driverPresence.service"
  );
  const activeTripFlags = await Promise.all(
    rows.map((r) => DriverPresenceService.hasActiveTrip(r.userId))
  );
  const available = rows.filter((_, i) => !activeTripFlags[i]);

  const rotation = currentRotationKey();
  const drivers = available
    .slice(0, MAX_NEARBY_RESULTS)
    .map<NearbyDriverRow>((r) => ({
      id: hashDriverToken(r.userId, rotation),
      latitude: r.latitude,
      longitude: r.longitude,
      vehicleCategory: r.currentVehicle?.category ?? VehicleCategory.CAR,
    }))
    .map((d) => mapNearbyDriverForViewer(d, viewer));

  return { drivers, fetchedAt: new Date().toISOString() };
}

/**
 * Defensive response mapper: nearby-driver rows never carry PII (no
 * phone/email/raw-userId by construction), so the mapper is a no-op for
 * the current shape. Kept as the canonical strip point so the contract
 * stays auditable from one location and matches the sibling search
 * services. If a future change ever broadens the row to include
 * phone/email, the strip block below catches it before the row leaves
 * the service.
 */
function mapNearbyDriverForViewer<T extends NearbyDriverRow>(
  driver: T,
  viewer: Viewer
): T {
  if (!viewer.isGuest) return driver;
  const safe = driver as unknown as Record<string, unknown>;
  delete safe.phoneNumber;
  delete safe.email;
  return safe as T;
}
