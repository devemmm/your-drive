import {
  BookingStatus,
  D2DBookingRequestStatus,
  RideStatus,
  TransactionStatus,
  Prisma,
  NoShow,
  User,
  Location,
  Booking,
  Transaction,
  RedeemedCoupon,
  Ride,
  D2DBookingRequest,
} from "@prisma/client";
import { prisma } from "../config/database";
import { TransactionService } from './transaction.service';
import { CouponService } from './coupon.service';
import moment from "moment";

export class NoShowService {
  static async getNoShowStats() {
    try {
      const totalNoShows = await prisma.noShow.count();
      const noShowsByUser = await prisma.noShow.groupBy({
        by: ['userId'],
        _count: {
          userId: true
        },
        _sum: {
          userId: true
        },
        _avg: {
          userId: true
        }
      });
      const noShowsByUserFormatted = noShowsByUser.map((item: { userId: any; _count: { userId: any; }; _avg: { userId: any; }; _sum: { userId: any; }; }) => ({
        userId: item.userId,
        total: item._count.userId,
        average: item._avg.userId,
        sum: item._sum.userId
      }));
      const noShowsByRide = await prisma.noShow.groupBy({
        by: ['rideId'],
        _count: {
          rideId: true
        },
        _sum: {
          rideId: true
        },
        _avg: {
          rideId: true
        }
      });
      const noShowsByRideFormatted = noShowsByRide.map((item: { rideId: any; _count: { rideId: any; }; _avg: { rideId: any; }; _sum: { rideId: any; }; }) => ({
        rideId: item.rideId,
        total: item._count.rideId,
        average: item._avg.rideId,
        sum: item._sum.rideId
      }));
      return {
        totalNoShows,
        noShowsByUser: noShowsByUserFormatted,
        noShowsByRide: noShowsByRideFormatted
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get no-show statistics: ${errorMessage}`);
    }
  }

  /**
   * Passenger no-show confirmed:
   * - For this passenger's approved bookings / confirmed d2d requests:
   *   - Capture ONHOLD Stripe funds & run standard settlement flow
   *   - Mark booking/d2d request as COMPLETED
   *   - Issue coupons (similar to settlement cronjob, but scoped to this user)
   */
  static async resolvePassengerNoShow(noShow: NoShow & {
    ride: Ride & {
      driver: User, departureLocation: Location, destinationLocation: Location, bookings: (Booking & {
        paymentTransaction: Transaction & {
          user: User;
          booking: Booking | null;
          d2dBookingReq: D2DBookingRequest | null;
        } | null; redeemedCoupns: RedeemedCoupon[]
      })[]; d2dBookingRequests: (D2DBookingRequest & {
        transaction: Transaction & {
          user: User;
          booking: Booking | null;
          d2dBookingReq: D2DBookingRequest | null;
        } | null; redeemedCoupns: RedeemedCoupon[]
      })[]
    }
  }) {
    const ride = noShow.ride;
    const passengerId: number = noShow.userId;

    // --- P2P bookings for this passenger ---
    for (const booking of ride.bookings) {
      if (
        booking.userId !== passengerId ||
        booking.status !== BookingStatus.APPROVED
      ) {
        continue;
      }

      const tx = booking.paymentTransaction;
      if (!tx) {
        continue;
      }

      try {
        // If ONHOLD Stripe payment – capture & process standard flow
        if (
          tx.status === TransactionStatus.ONHOLD &&
          tx.externalReference &&
          tx.paymentProvider === "STRIPE"
        ) {
          await TransactionService.captureStripeFunds({
            paymentIntentId: tx.externalReference,
            txn: tx,
            ride,
          });
        }

        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.COMPLETED,
            disputeResolvedAt: new Date(),
            paymentTransaction: {
              update: {
                disputeResolvedAt: new Date(),
              }
            }
          },
        });
      } catch (err) {
        // Log and continue to next booking; settlement cron can handle any leftovers
        console.error("Error processing passenger no-show booking", {
          bookingId: booking.id,
          err,
        });
      }
    }

    // --- D2D confirmed requests for this passenger ---
    for (const request of ride.d2dBookingRequests) {
      if (
        request.passengerId !== passengerId ||
        request.status !== D2DBookingRequestStatus.CONFIRMED
      ) {
        continue;
      }

      const tx = request.transaction;
      if (!tx) {
        continue;
      }

      try {
        if (
          tx.status === TransactionStatus.ONHOLD &&
          tx.externalReference &&
          tx.paymentProvider === "STRIPE"
        ) {
          await TransactionService.captureStripeFunds({
            paymentIntentId: tx.externalReference,
            txn: tx,
            ride,
          });
        }

        await prisma.d2DBookingRequest.update({
          where: { id: request.id },
          data: {
            status: D2DBookingRequestStatus.COMPLETED,
            disputeResolvedAt: new Date(),
            transaction: {
              update: {
                disputeResolvedAt: new Date(),
              }
            }
          },
        });
      } catch (err) {
        console.error("Error processing passenger no-show d2d", {
          requestId: request.id,
          err,
        });
      }
    }
  }

  /**
   * Driver no-show confirmed:
   * - For all approved bookings / confirmed d2d on this ride:
   *   - Cancel ONHOLD transactions or refund PAID ones
   *   - Cancel the bookings/requests
   *   - Refund any redeemed coupons
   * - Mark ride as CANCELLED and settled so it is excluded from cron settlement.
   */
  static async resolveDriverNoShow(noShow: NoShow & { ride: Ride & { driver: User, departureLocation: Location, destinationLocation: Location, bookings: (Booking & { paymentTransaction: Transaction | null; redeemedCoupns: RedeemedCoupon[] })[]; d2dBookingRequests: (D2DBookingRequest & { transaction: Transaction | null; redeemedCoupns: RedeemedCoupon[] })[] } }) {
    const ride = noShow.ride;

    // Cancel/refund all bookings
    for (const booking of ride.bookings) {
      const tx = booking.paymentTransaction;
      try {
        if (tx) {
          if (
            tx.status === TransactionStatus.ONHOLD &&
            tx.externalReference &&
            tx.paymentProvider === "STRIPE"
          ) {
            await TransactionService.cancelOrRefundTransaction(tx, "CANCEL");
          } else if (
            (tx.status === TransactionStatus.PAID ||
              tx.status === TransactionStatus.PARTIALLY_REFUNDED) &&
            tx.externalReference &&
            tx.paymentProvider === "STRIPE"
          ) {
            await TransactionService.cancelOrRefundTransaction(tx, "REFUND");
          }
        }

        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            reason:
              "Ride cancelled due to driver no-show | Trajet annulé en raison de la non-présentation du conducteur.",
            disputeResolvedAt: new Date(),
            paymentTransaction: {
              update: {
                disputeResolvedAt: new Date(),
              }
            }
          },
        });

        if (booking.redeemedCoupns?.length) {
          await CouponService.refundCoupons(booking.redeemedCoupns);
        }
      } catch (err) {
        console.error("Error cancelling booking for driver no-show", {
          bookingId: booking.id,
          err,
        });
      }
    }

    // Cancel/refund all confirmed d2d booking requests
    for (const request of ride.d2dBookingRequests) {
      const tx = request.transaction;
      try {
        if (tx) {
          if (
            tx.status === TransactionStatus.ONHOLD &&
            tx.externalReference &&
            tx.paymentProvider === "STRIPE"
          ) {
            await TransactionService.cancelOrRefundTransaction(tx, "CANCEL");
          } else if (
            (tx.status === TransactionStatus.PAID ||
              tx.status === TransactionStatus.PARTIALLY_REFUNDED) &&
            tx.externalReference &&
            tx.paymentProvider === "STRIPE"
          ) {
            await TransactionService.cancelOrRefundTransaction(tx, "REFUND");
          }
        }

        await prisma.d2DBookingRequest.update({
          where: { id: request.id },
          data: {
            status: D2DBookingRequestStatus.CANCELED,
            canceledAt: new Date(),
            reason:
              "Ride cancelled due to driver no-show | Trajet annulé en raison de la non-présentation du conducteur.",
            disputeResolvedAt: new Date(),
            transaction: {
              update: {
                disputeResolvedAt: new Date(),
              }
            }
          },
        });

        if (request.redeemedCoupns?.length) {
          await CouponService.refundCoupons(request.redeemedCoupns);
        }
      } catch (err) {
        console.error("Error cancelling d2d request for driver no-show", {
          requestId: request.id,
          err,
        });
      }
    }

    // Mark ride as cancelled and settled so cron won't try to process it
    await prisma.ride.update({
      where: { id: ride.id },
      data: {
        status: RideStatus.CANCELLED,
        isSettled: true,
        settlementFailedReason:
          "Ride settled via driver no-show confirmation; all passenger payments refunded or cancelled.",
      },
    });
  }
}
