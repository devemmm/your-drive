import { Prisma, ChauffeurStatus } from "@prisma/client";
import { prisma } from "../../config/database";
// Re-use the Viewer discriminated-union introduced by the sibling rental
// search service. Keeping a single source of truth for the type ensures
// every public-mirror endpoint shares the same guest/authed contract.
import type { Viewer } from "./rentalSearch.service";

export interface ChauffeurSearchFilters {
  minHourlyRate?: number;
  maxHourlyRate?: number;
  minDailyRate?: number;
  maxDailyRate?: number;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

// Fields on a driver row that the available-chauffeur search exposes to
// anyone (guest and authed). Phone and email are added for authed callers
// only — see `selectForViewer` below.
const GUEST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  averageRating: true,
  totalRatings: true,
  profileImage: true,
  chauffeurHourlyRate: true,
  chauffeurDailyRate: true,
  chauffeurDescription: true,
  drivingExperience: true,
  languagesSpoken: true,
} as const;

const AUTHED_SELECT = {
  ...GUEST_SELECT,
  phoneNumber: true,
  email: true,
} as const;

function selectForViewer(viewer: Viewer) {
  return viewer.isGuest ? GUEST_SELECT : AUTHED_SELECT;
}

const BOOKED_RANGE_WINDOW_DAYS = 30;

function buildChauffeurWhereClause(
  filters: ChauffeurSearchFilters
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    isAvailableForChauffeur: true,
    isDeleted: false,
  };

  if (filters.minHourlyRate !== undefined) {
    where.chauffeurHourlyRate = {
      ...((where.chauffeurHourlyRate as Prisma.DecimalNullableFilter) || {}),
      gte: filters.minHourlyRate,
    };
  }

  if (filters.maxHourlyRate !== undefined) {
    where.chauffeurHourlyRate = {
      ...((where.chauffeurHourlyRate as Prisma.DecimalNullableFilter) || {}),
      lte: filters.maxHourlyRate,
    };
  }

  if (filters.minDailyRate !== undefined) {
    where.chauffeurDailyRate = {
      ...((where.chauffeurDailyRate as Prisma.DecimalNullableFilter) || {}),
      gte: filters.minDailyRate,
    };
  }

  if (filters.maxDailyRate !== undefined) {
    where.chauffeurDailyRate = {
      ...((where.chauffeurDailyRate as Prisma.DecimalNullableFilter) || {}),
      lte: filters.maxDailyRate,
    };
  }

  // Exclude drivers with overlapping active / accepted / requested bookings
  // when the caller supplies a date window.
  if (filters.startDate && filters.endDate) {
    where.driverChauffeurServices = {
      none: {
        status: {
          in: [
            ChauffeurStatus.REQUESTED,
            ChauffeurStatus.ACCEPTED,
            ChauffeurStatus.ACTIVE,
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
 * Shared chauffeur-driver search used by:
 *  - the legacy public-mounted `ChauffeurController.searchAvailableDrivers`
 *    at `GET /public/chauffeur-drivers`, and
 *  - the new `PublicChauffeurController.list` at
 *    `GET /public/chauffeur-services/search`.
 *
 * The query body is identical for both — only the row select changes,
 * dropping phone/email for guests so public traffic never leaks PII.
 */
export async function listChauffeurs(args: {
  viewer: Viewer;
  filters: ChauffeurSearchFilters;
}) {
  const { viewer, filters } = args;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const where = buildChauffeurWhereClause(filters);

  const now = new Date();
  const windowEnd = new Date(now.getTime() + BOOKED_RANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [rawItems, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      where,
      select: {
        ...selectForViewer(viewer),
        driverChauffeurServices: {
          where: {
            status: { in: [ChauffeurStatus.ACCEPTED, ChauffeurStatus.ACTIVE] },
            endDate: { gte: now },
            startDate: { lte: windowEnd },
          },
          select: { startDate: true, endDate: true },
        },
      },
      orderBy: { averageRating: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  const items = (rawItems as any[]).map((item) =>
    mapChauffeurForViewer(item, viewer)
  );
  return { items, total, page, pageSize };
}

/**
 * Defensive response mapper: guarantees phone / email are never on the
 * wire for guest viewers even if a future schema change broadens the
 * default Prisma return shape. Prisma's `select` should already filter
 * them out, but the mapper is the canonical place to enforce the rule
 * so the contract is auditable from a single location.
 */
function mapChauffeurForViewer<T extends Record<string, unknown>>(
  driver: T,
  viewer: Viewer
): Omit<T, "driverChauffeurServices"> & {
  bookedRanges: { start: string; end: string; kind: "CHAUFFEUR" }[];
} {
  const { driverChauffeurServices = [], ...rest } = driver as any;
  const bookedRanges = (driverChauffeurServices as { startDate: Date; endDate: Date }[]).map((s) => ({
    start: s.startDate.toISOString(),
    end: s.endDate.toISOString(),
    kind: "CHAUFFEUR" as const,
  }));

  const base = { ...rest, bookedRanges };

  if (!viewer.isGuest) return base;
  const { phoneNumber: _phone, email: _email, ...safeDriver } = base;
  return safeDriver as any;
}
