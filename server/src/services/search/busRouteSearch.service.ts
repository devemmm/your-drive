import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
// Re-use the Viewer discriminated-union introduced by the sibling rental
// search service. Keeping a single source of truth for the type ensures
// every public-mirror endpoint shares the same guest / authed contract.
import type { Viewer } from "./rentalSearch.service";

export interface BusRouteSearchFilters {
  originCity?: string;
  destCity?: string;
}

function buildBusRouteWhereClause(
  filters: BusRouteSearchFilters
): Prisma.BusRouteWhereInput {
  const where: Prisma.BusRouteWhereInput = {
    isActive: true,
  };

  if (filters.originCity !== undefined) {
    where.originCity = filters.originCity;
  }
  if (filters.destCity !== undefined) {
    where.destCity = filters.destCity;
  }

  return where;
}

/**
 * Shared bus-route passenger search used by:
 *  - the legacy authed `BusRouteController.publicSearch` at
 *    `GET /bus-routes/search` (mounted behind `isAuthenticated`), and
 *  - the new `PublicBusRouteController.search` at
 *    `GET /public/bus-routes/search` (no auth).
 *
 * Bus routes have no auth-only fields on the public shape, so guest and
 * authed responses carry identical rows. The viewer parameter is kept on
 * the signature for symmetry with the sibling search services and so the
 * defensive `mapBusRouteForViewer` mapper can strip any embedded
 * operator phone / email a future schema change may surface.
 *
 * The Prisma query body is lifted verbatim from the legacy
 * `BusRouteController.publicSearch` so this stays a drop-in replacement.
 */
export async function listBusRoutes(args: {
  viewer: Viewer;
  filters: BusRouteSearchFilters;
}) {
  const { viewer, filters } = args;

  const where = buildBusRouteWhereClause(filters);

  const [rawItems, total] = await Promise.all([
    prisma.busRoute.findMany({
      where,
      include: { stops: { orderBy: { order: "asc" } } },
    }),
    prisma.busRoute.count({ where }),
  ]);

  const items = (rawItems as any[]).map((item) =>
    mapBusRouteForViewer(item, viewer)
  );
  return { items, total };
}

/**
 * Defensive response mapper: guarantees operator phone / email are never
 * on the wire for guest viewers even if a future schema change attaches
 * the operator relation to this query's include shape. The legacy
 * `publicSearch` does not include the operator, but the mapper makes the
 * PII contract auditable from one location, matching the sibling
 * rental / chauffeur / ride search services.
 */
function mapBusRouteForViewer<
  T extends { operator?: Record<string, unknown> | null }
>(route: T, viewer: Viewer): T {
  if (!viewer.isGuest || !route.operator) return route;
  const { phoneNumber: _phone, email: _email, ...safeOperator } = route.operator;
  return { ...route, operator: safeOperator };
}
