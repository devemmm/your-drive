// server/src/services/rideRequestAccept.service.ts
//
// Extracted from RideRequestController.acceptRideRequest so that both the
// "Accept at original fare" path and the new "Accept this bid" path share
// one transaction body. The only behavioural change vs the pre-refactor
// controller is that the agreed fare is passed in instead of being read
// from rideRequest.proposedFare.
//
// Callers are responsible for KYC / vehicle-ownership / OPEN-status checks
// BEFORE calling. This function trusts its inputs.

import type { Prisma } from "@prisma/client";
import {
  BookingStatus,
  BookingType,
  ContributionCollectionMethod,
  MonetizationType,
  RideRequestStatus,
  RideStatus,
  RideType,
} from "@prisma/client";
import { profileSelects } from "../types/index";

export type CreateRideFromAcceptedRequestInput = {
  rideRequest: {
    id: number;
    userId: number;
    seats: number;
    originId: number | null;
    destinationId: number | null;
    originCity: string | null;
    destCity: string | null;
    rideType: RideType;
  };
  driver: { id: number; firstName: string | null };
  vehicle: { id: number; capacity: number };
  agreedFare: number;
  departureTime: Date;
  estimatedArrivalTime: Date;
};

export async function createRideFromAcceptedRequest(
  tx: Prisma.TransactionClient,
  input: CreateRideFromAcceptedRequestInput
) {
  const {
    rideRequest: rr,
    driver,
    vehicle,
    agreedFare,
    departureTime,
    estimatedArrivalTime,
  } = input;

  const createdRide = await tx.ride.create({
    data: {
      driverId: driver.id,
      vehicleId: vehicle.id,
      departureTime,
      estimatedArrivalTime,
      departureLocationId: rr.originId!,
      destinationLocationId: rr.destinationId!,
      availableSeats: Math.max(vehicle.capacity - rr.seats, 0),
      totalSeats: vehicle.capacity,
      contribution: agreedFare,
      bookingType: BookingType.AUTOMATIC,
      status: RideStatus.PUBLISHED,
      publishedAt: new Date(),
      type: rr.rideType,
      monitizationType:
        agreedFare > 0 ? MonetizationType.PAYMENT : MonetizationType.FREE,
      contributionCollectionMethod: ContributionCollectionMethod.OFF_PLATFORM,
      rideRequestId: rr.id,
    },
    include: {
      departureLocation: true,
      destinationLocation: true,
      driver: { select: profileSelects },
      vehicle: true,
    },
  });

  const createdBooking = await tx.booking.create({
    data: {
      rideId: createdRide.id,
      userId: rr.userId,
      vehicleId: vehicle.id,
      seats: rr.seats,
      status: BookingStatus.APPROVED,
    },
  });

  await tx.rideRequest.update({
    where: { id: rr.id },
    data: {
      status: RideRequestStatus.CLOSED,
      closeAt: new Date(),
    },
  });

  await tx.rideRequestMatch.create({
    data: { requestId: rr.id, rideId: createdRide.id },
  });

  await tx.notification.create({
    data: {
      userId: rr.userId,
      title: "Your ride request was accepted",
      message: `${driver.firstName} accepted your ride from ${rr.originCity} to ${rr.destCity}.`,
      rideRequestId: rr.id,
      rideId: createdRide.id,
    },
  });

  // Auto-create a chat thread so the passenger's Chat CTA works
  // immediately after acceptance. The unique (rideId) constraint on
  // ChatThread (schema.prisma:705) means a duplicate is impossible if
  // the same ride is somehow accepted twice; but we guard anyway.
  const existingThread = await tx.chatThread.findUnique({
    where: { rideId: createdRide.id },
  });
  if (!existingThread) {
    await tx.chatThread.create({
      data: {
        rideId: createdRide.id,
        ownerId: driver.id,
        users: {
          connect: [{ id: driver.id }, { id: rr.userId }],
        },
      },
    });
  }

  return { ride: createdRide, booking: createdBooking };
}
