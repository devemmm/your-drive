// server/src/services/bid.service.ts
import { prisma } from "../config/database";
import {
  KycStatus,
  RideBidStatus,
  RideRequestStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { createRideFromAcceptedRequest } from "./rideRequestAccept.service";
import { NotificationServices } from "./notification.service";

const PUSH_DEBOUNCE_MS = 10_000;

export class BidConflictError extends Error {
  constructor(
    public code:
      | "REQUEST_CLOSED"
      | "BID_EXISTS"
      | "BID_NOT_PENDING"
      | "KYC_REQUIRED"
      | "NOT_OWNER"
      | "VEHICLE_NOT_OWNED",
    message: string
  ) {
    super(message);
    this.name = "BidConflictError";
  }
}

export async function submitBid(input: {
  rideRequestId: number;
  driverId: number;
  vehicleId: number;
  amount: number;
}) {
  return prisma.$transaction(async (tx) => {
    const driver = await tx.user.findUnique({
      where: { id: input.driverId },
      select: { id: true, firstName: true, kycStatus: true },
    });
    if (!driver || driver.kycStatus !== KycStatus.APPROVED) {
      throw new BidConflictError("KYC_REQUIRED", "Driver KYC not approved");
    }

    const vehicle = await tx.vehicle.findUnique({
      where: { id: input.vehicleId },
      select: { id: true, userId: true, kycStatus: true },
    });
    if (!vehicle || vehicle.userId !== input.driverId) {
      throw new BidConflictError("VEHICLE_NOT_OWNED", "Vehicle does not belong to driver");
    }
    if (vehicle.kycStatus !== KycStatus.APPROVED) {
      throw new BidConflictError("KYC_REQUIRED", "Vehicle KYC not approved");
    }

    const request = await tx.rideRequest.findUnique({
      where: { id: input.rideRequestId },
      select: { id: true, status: true, userId: true },
    });
    if (!request || request.status !== RideRequestStatus.OPEN) {
      throw new BidConflictError("REQUEST_CLOSED", "Ride request is not open");
    }

    const existing = await tx.rideBid.findUnique({
      where: {
        rideRequestId_driverId: {
          rideRequestId: input.rideRequestId,
          driverId: input.driverId,
        },
      },
    });
    if (existing && existing.status === RideBidStatus.PENDING) {
      throw new BidConflictError("BID_EXISTS", "Driver already has a pending bid on this request");
    }

    // If a non-PENDING bid exists (DECLINED, EXPIRED), update it back to PENDING
    // with the new amount; otherwise create. The unique (rideRequestId, driverId)
    // constraint means we can't insert a second row.
    const bid = existing
      ? await tx.rideBid.update({
          where: { id: existing.id },
          data: {
            bidAmount: input.amount,
            vehicleId: input.vehicleId,
            status: RideBidStatus.PENDING,
            resolvedAt: null,
            createdAt: new Date(),
          },
        })
      : await tx.rideBid.create({
          data: {
            rideRequestId: input.rideRequestId,
            driverId: input.driverId,
            vehicleId: input.vehicleId,
            bidAmount: input.amount,
            status: RideBidStatus.PENDING,
          },
        });

    // Debounced passenger push — at most one per 10s.
    const passenger = await tx.user.findUnique({
      where: { id: request.userId },
      select: { id: true, lastBidPushAt: true },
    });
    const now = new Date();
    const shouldPush =
      passenger &&
      (!passenger.lastBidPushAt ||
        now.getTime() - passenger.lastBidPushAt.getTime() >= PUSH_DEBOUNCE_MS);

    if (shouldPush) {
      const pendingCount = await tx.rideBid.count({
        where: {
          rideRequestId: input.rideRequestId,
          status: RideBidStatus.PENDING,
        },
      });
      await tx.user.update({
        where: { id: passenger!.id },
        data: { lastBidPushAt: now },
      });

      const driverName = driver.firstName ?? "A driver";
      const amountStr = Math.round(input.amount).toLocaleString();
      const titleEn = "New offer on your ride request";
      const titleFr = "Nouvelle offre sur votre demande";
      const messageEn =
        pendingCount <= 1
          ? `${driverName} offered RWF ${amountStr}`
          : `${driverName} offered RWF ${amountStr} (+${pendingCount - 1} more)`;
      const messageFr =
        pendingCount <= 1
          ? `${driverName} a offert RWF ${amountStr}`
          : `${driverName} a offert RWF ${amountStr} (+${pendingCount - 1} de plus)`;

      // Fire FCM/persist Notification after the transaction commits.
      setImmediate(() => {
        void NotificationServices.notifyUsers({
          userIds: [passenger!.id],
          titleEn,
          titleFr,
          messageEn,
          messageFr,
          rideRequestId: input.rideRequestId,
        });
      });
    }

    return bid;
  });
}

export async function listBidsForRequest(input: {
  rideRequestId: number;
  callerId: number;
  isAdmin: boolean;
}) {
  const request = await prisma.rideRequest.findUnique({
    where: { id: input.rideRequestId },
    select: { userId: true },
  });
  if (!request) throw new BidConflictError("REQUEST_CLOSED", "Request not found");
  if (!input.isAdmin && request.userId !== input.callerId) {
    throw new BidConflictError("NOT_OWNER", "Not your ride request");
  }

  const bids = await prisma.rideBid.findMany({
    where: {
      rideRequestId: input.rideRequestId,
      status: RideBidStatus.PENDING,
    },
    include: {
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          averageRating: true,
          totalRatings: true,
          profileImage: { select: { url: true } },
          presence: {
            select: { latitude: true, longitude: true, updatedAt: true },
          },
        },
      },
      vehicle: {
        select: { id: true, make: true, model: true, category: true, tier: true },
      },
    },
    orderBy: { bidAmount: "asc" },
  });

  return bids;
}

export async function getBid(input: { bidId: number }) {
  const bid = await prisma.rideBid.findUnique({
    where: { id: input.bidId },
    include: {
      rideRequest: {
        select: {
          matches: { select: { rideId: true }, take: 1 },
        },
      },
    },
  });
  if (!bid) return null;
  const { rideRequest, ...rest } = bid;
  return { ...rest, rideId: rideRequest.matches[0]?.rideId ?? null };
}

export async function acceptBid(input: {
  bidId: number;
  passengerId: number;
}) {
  return prisma.$transaction(async (tx) => {
    const bid = await tx.rideBid.findUnique({
      where: { id: input.bidId },
      include: {
        rideRequest: true,
        driver: { select: { id: true, firstName: true } },
        vehicle: { select: { id: true, capacity: true } },
      },
    });
    if (!bid) throw new BidConflictError("BID_NOT_PENDING", "Bid not found");
    if (bid.status !== RideBidStatus.PENDING) {
      throw new BidConflictError("BID_NOT_PENDING", "Bid is not pending");
    }
    if (bid.rideRequest.userId !== input.passengerId) {
      throw new BidConflictError("NOT_OWNER", "Not your ride request");
    }
    if (bid.rideRequest.status !== RideRequestStatus.OPEN) {
      throw new BidConflictError("REQUEST_CLOSED", "Ride request is not open");
    }

    const departureTime =
      bid.rideRequest.timeWindowStart ?? new Date(Date.now() + 60_000);
    const estimatedArrivalTime = new Date(departureTime.getTime() + 30 * 60_000);

    const { ride: createdRide } = await createRideFromAcceptedRequest(tx, {
      rideRequest: {
        id: bid.rideRequest.id,
        userId: bid.rideRequest.userId,
        seats: bid.rideRequest.seats,
        originId: bid.rideRequest.originId,
        destinationId: bid.rideRequest.destinationId,
        originCity: bid.rideRequest.originCity,
        destCity: bid.rideRequest.destCity,
        rideType: bid.rideRequest.rideType,
      },
      driver: { id: bid.driverId, firstName: bid.driver.firstName ?? "" },
      vehicle: { id: bid.vehicleId, capacity: bid.vehicle.capacity },
      agreedFare: Number(bid.bidAmount),
      departureTime,
      estimatedArrivalTime,
    });

    const now = new Date();
    await tx.rideBid.update({
      where: { id: bid.id },
      data: { status: RideBidStatus.ACCEPTED, resolvedAt: now },
    });

    const losers = await tx.rideBid.findMany({
      where: {
        rideRequestId: bid.rideRequestId,
        status: RideBidStatus.PENDING,
        id: { not: bid.id },
      },
      select: { id: true, driverId: true },
    });
    if (losers.length > 0) {
      await tx.rideBid.updateMany({
        where: { id: { in: losers.map((l) => l.id) } },
        data: { status: RideBidStatus.DECLINED, resolvedAt: now },
      });
    }

    const amountStr = Math.round(Number(bid.bidAmount)).toLocaleString();
    setImmediate(() => {
      void NotificationServices.notifyUsers({
        userIds: [bid.driverId],
        titleEn: "Offer accepted",
        titleFr: "Offre acceptée",
        messageEn: `Passenger accepted your offer for RWF ${amountStr}`,
        messageFr: `Le passager a accepté votre offre de RWF ${amountStr}`,
        rideId: createdRide.id,
      });
      if (losers.length > 0) {
        void NotificationServices.notifyUsers({
          userIds: losers.map((l) => l.driverId),
          titleEn: "Request taken",
          titleFr: "Demande prise",
          messageEn: "Another driver was selected for that ride request.",
          messageFr: "Un autre chauffeur a été sélectionné pour cette demande.",
          rideRequestId: bid.rideRequestId,
        });
      }
    });

    return { ride: createdRide, bid };
  });
}

export async function cancelBidByDriver(input: {
  bidId: number;
  driverId: number;
}) {
  const bid = await prisma.rideBid.findUnique({
    where: { id: input.bidId },
    select: { id: true, driverId: true, status: true },
  });
  if (!bid) throw new BidConflictError("BID_NOT_PENDING", "Bid not found");
  if (bid.driverId !== input.driverId) {
    throw new BidConflictError("NOT_OWNER", "Not your bid");
  }
  if (bid.status !== RideBidStatus.PENDING) {
    throw new BidConflictError("BID_NOT_PENDING", "Bid is not pending");
  }
  return prisma.rideBid.update({
    where: { id: bid.id },
    data: { status: RideBidStatus.DECLINED, resolvedAt: new Date() },
  });
}

// Called from anywhere that closes a ride request — both accept paths,
// expiry job, passenger cancel. Idempotent (only flips PENDING).
export async function sweepPendingBids(input: {
  tx: Prisma.TransactionClient;
  rideRequestId: number;
  reason: "ACCEPTED_ELSEWHERE" | "REQUEST_CANCELLED" | "REQUEST_EXPIRED";
  excludeBidId?: number;
}) {
  const targetStatus =
    input.reason === "REQUEST_EXPIRED"
      ? RideBidStatus.EXPIRED
      : RideBidStatus.DECLINED;

  const losers = await input.tx.rideBid.findMany({
    where: {
      rideRequestId: input.rideRequestId,
      status: RideBidStatus.PENDING,
      ...(input.excludeBidId ? { id: { not: input.excludeBidId } } : {}),
    },
    select: { id: true, driverId: true },
  });
  if (losers.length === 0) return;

  await input.tx.rideBid.updateMany({
    where: { id: { in: losers.map((l) => l.id) } },
    data: { status: targetStatus, resolvedAt: new Date() },
  });

  const titleEn = "Request closed";
  const titleFr = "Demande fermée";
  const { messageEn, messageFr } =
    input.reason === "ACCEPTED_ELSEWHERE"
      ? {
          messageEn: "Another driver was selected for that ride request.",
          messageFr: "Un autre chauffeur a été sélectionné pour cette demande.",
        }
      : input.reason === "REQUEST_EXPIRED"
        ? { messageEn: "Ride request expired.", messageFr: "La demande a expiré." }
        : {
            messageEn: "Passenger cancelled the ride request.",
            messageFr: "Le passager a annulé la demande.",
          };

  setImmediate(() => {
    void NotificationServices.notifyUsers({
      userIds: losers.map((l) => l.driverId),
      titleEn,
      titleFr,
      messageEn,
      messageFr,
      rideRequestId: input.rideRequestId,
    });
  });
}
