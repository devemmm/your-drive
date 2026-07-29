import { Prisma, RentalStatus, ChauffeurStatus } from "@prisma/client";
import { prisma } from "../../config/database";

/**
 * Viewer discriminated-union describing whether the caller is authenticated.
 *
 * Exported here because this is the first place it is introduced — sibling
 * search services (chauffeur, ride, bus-route, driver-nearby) import the
 * same type so the public-mirror pattern stays consistent across domains.
 */
export type Viewer =
  | { isGuest: true }
  | { isGuest: false; userId: number };

export interface RentalSearchFilters {
  city?: string;
  region?: string;
  category?: string;
  minDailyRate?: number;
  maxDailyRate?: number;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

// Fields on the embedded vehicle owner that the rental list endpoint exposes
// to anyone (guest and authed). Owner phone / email are added for authed
// viewers only — see `userSelectForViewer` below.
const GUEST_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  averageRating: true,
  totalRatings: true,
  profileImage: { select: { url: true } },
} as const;

const AUTHED_USER_SELECT = {
  ...GUEST_USER_SELECT,
  phoneNumber: true,
  email: true,
} as const;

function userSelectForViewer(viewer: Viewer) {
  return viewer.isGuest ? GUEST_USER_SELECT : AUTHED_USER_SELECT;
}

const BOOKED_RANGE_WINDOW_DAYS = 30;

function buildRentalWhereClause(
  filters: RentalSearchFilters
): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {
    isAvailableForRental: true,
  };

  if (filters.city) {
    where.pickupLocation = {
      ...((where.pickupLocation as Prisma.LocationWhereInput) || {}),
      city: { contains: filters.city, mode: "insensitive" },
    };
  }

  if (filters.region) {
    where.pickupLocation = {
      ...((where.pickupLocation as Prisma.LocationWhereInput) || {}),
      region: { contains: filters.region, mode: "insensitive" },
    };
  }

  if (filters.category) {
    where.category = filters.category as Prisma.VehicleWhereInput["category"];
  }

  if (filters.minDailyRate !== undefined) {
    where.dailyRate = {
      ...((where.dailyRate as Prisma.DecimalNullableFilter) || {}),
      gte: filters.minDailyRate,
    };
  }

  if (filters.maxDailyRate !== undefined) {
    where.dailyRate = {
      ...((where.dailyRate as Prisma.DecimalNullableFilter) || {}),
      lte: filters.maxDailyRate,
    };
  }

  // Exclude vehicles with overlapping active / approved / requested rentals
  // when the caller supplies a date window.
  if (filters.startDate && filters.endDate) {
    where.rentals = {
      none: {
        status: {
          in: [
            RentalStatus.REQUESTED,
            RentalStatus.APPROVED,
            RentalStatus.ACTIVE,
          ],
        },
        startDate: { lt: filters.endDate },
        endDate: { gt: filters.startDate },
      },
    };
  }

  return where;
}

/**
 * Shared rental list/search used by both the authenticated controller and
 * the public mirror controller. The query body is identical for both —
 * only the embedded `user` select changes, dropping owner phone/email for
 * guests so the public endpoint never leaks PII.
 */
export async function listRentals(args: {
  viewer: Viewer;
  filters: RentalSearchFilters;
}) {
  const { viewer, filters } = args;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + BOOKED_RANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const where = buildRentalWhereClause(filters);

  const [rawItems, total] = await Promise.all([
    prisma.vehicle.findMany({
      skip,
      take,
      where,
      include: {
        files: {
          select: { id: true, url: true, type: true, category: true },
        },
        defaultImage: {
          select: { id: true, url: true, type: true, category: true },
        },
        user: { select: userSelectForViewer(viewer) },
        pickupLocation: true,
        rentals: {
          where: {
            status: { in: [RentalStatus.APPROVED, RentalStatus.ACTIVE] },
            endDate: { gte: now },
            startDate: { lte: windowEnd },
          },
          select: { startDate: true, endDate: true },
        },
        chauffeurServices: {
          where: {
            status: { in: [ChauffeurStatus.ACCEPTED, ChauffeurStatus.ACTIVE] },
            endDate: { gte: now },
            startDate: { lte: windowEnd },
          },
          select: { startDate: true, endDate: true },
        },
        blockedRanges: {
          where: {
            to: { gte: now },
            from: { lte: windowEnd },
          },
          select: { from: true, to: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vehicle.count({ where }),
  ]);

  const items = (rawItems as any[]).map((item) => mapRentalForViewer(item, viewer));
  return { items, total, page, pageSize };
}

/**
 * Defensive response mapper: guarantees owner phone / email are never on
 * the wire for guest viewers even if a future schema change adds them to
 * the default Prisma return shape. Prisma's `select` should already filter
 * them out, but the mapper is the canonical place to enforce the rule so
 * the contract is auditable from one location.
 */
function mapRentalForViewer<T extends {
  user?: Record<string, unknown> | null;
  rentals?: { startDate: Date; endDate: Date }[];
  chauffeurServices?: { startDate: Date; endDate: Date }[];
  blockedRanges?: { from: Date; to: Date }[];
}>(
  vehicle: T,
  viewer: Viewer
): Omit<T, "rentals" | "chauffeurServices" | "blockedRanges"> & {
  bookedRanges: { start: string; end: string; kind: "RENTAL" | "CHAUFFEUR" | "BLOCK" }[];
  user?: Record<string, unknown> | null;
} {
  const { rentals = [], chauffeurServices = [], blockedRanges = [], ...rest } = vehicle as any;
  const bookedRanges = [
    ...rentals.map((r: { startDate: Date; endDate: Date }) => ({
      start: r.startDate.toISOString(),
      end: r.endDate.toISOString(),
      kind: "RENTAL" as const,
    })),
    ...chauffeurServices.map((s: { startDate: Date; endDate: Date }) => ({
      start: s.startDate.toISOString(),
      end: s.endDate.toISOString(),
      kind: "CHAUFFEUR" as const,
    })),
    ...blockedRanges.map((b: { from: Date; to: Date }) => ({
      start: b.from.toISOString(),
      end: b.to.toISOString(),
      kind: "BLOCK" as const,
    })),
  ];

  const base = { ...rest, bookedRanges };

  if (!viewer.isGuest || !base.user) return base;
  const { phoneNumber: _phone, email: _email, ...safeUser } = base.user;
  return { ...base, user: safeUser };
}
