import { CronJob } from "cron";
import { logger } from "../utils/logger";
import moment from "moment";
import { prisma } from "../config/database";
import {
  BookingStatus,
  D2DBookingRequestStatus,
  Prisma,
  RideStatus,
  TransactionStatus,
} from "@prisma/client";
import { NotificationServices } from "./notification.service";
import { TransactionService } from "./transaction.service";
import { stripe } from '../config/stripe';
import { CouponService } from "./coupon.service";
import { debitCommissionForCompletedRide } from "./commission.service";

// Remind passengers 30 min before departure
const remind30minStartOfTheRide = async () => {
  const now = moment();
  try {
    const upcomingRides = await prisma.ride.findMany({
      where: {
        departureTime: {
          gte: now.toDate(),
          lte: now.clone().add(30, "minutes").toDate(),
        },
        status: RideStatus.PUBLISHED,
        OR: [
          { isThirtyMinReminderSent: null },
          { isThirtyMinReminderSent: false },
        ],
      },
      include: {
        bookings: {
          where: { status: BookingStatus.APPROVED },
          include: { booker: true },
        },
        d2dBookingRequests: {
          where: { status: D2DBookingRequestStatus.CONFIRMED },
          include: { passenger: true },
        },
        driver: true,
        departureLocation: true,
        destinationLocation: true,
      },
    });

    const sentRideIds: number[] = [];
    // const fcmTokens: string[] = [];

    for (const ride of upcomingRides) {
      const remainingMinutesToDeparture = Math.round(moment(ride.departureTime).diff(moment(), 'minutes'));
      // driver reminder
      await NotificationServices.notifyUsers({
        userIds: [ride.driverId],
        titleEn: "Ride Departure Reminder",
        titleFr: "Rappel de départ du trajet",
        messageEn: `The ride from ${ride.departureLocation.city}${ride.departureLocation.regionCode
            ? `, ${ride.departureLocation.regionCode}`
            : ""
          } to ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
            ? `, ${ride.destinationLocation.regionCode}`
            : ""
        } will depart within ${remainingMinutesToDeparture} minutes.`,
        messageFr: `Le trajet de ${ride.departureLocation.city}${
          ride.departureLocation.regionCode
            ? `, ${ride.departureLocation.regionCode}`
            : ""
          } à ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
            ? `, ${ride.destinationLocation.regionCode}`
            : ""
        } partira dans ${remainingMinutesToDeparture} minutes ou moins.`,
        rideId: ride.id,
      });

      // passengers reminders
      const bookerIds = ride.bookings.length ? ride.bookings.map((bk) => bk.userId) : ride.d2dBookingRequests.map((d2d) => d2d.passengerId);
      await NotificationServices.notifyUsers({
        userIds: bookerIds,
        titleEn: "Ride Departure Reminder",
        titleFr: "Rappel de départ du trajet",
        messageEn: `The ride from ${ride.departureLocation.city}${ride.departureLocation.regionCode
            ? `, ${ride.departureLocation.regionCode}`
            : ""
          } to ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
            ? `, ${ride.destinationLocation.regionCode}`
            : ""
        } will depart within ${remainingMinutesToDeparture} minutes.`,
        messageFr: `Le trajet de ${ride.departureLocation.city}${
          ride.departureLocation.regionCode
            ? `, ${ride.departureLocation.regionCode}`
            : ""
          } à ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
            ? `, ${ride.destinationLocation.regionCode}`
            : ""
        } partira dans ${remainingMinutesToDeparture} minutes ou moins.`,
        rideId: ride.id,
      });

      sentRideIds.push(ride.id);
    }

    if (sentRideIds.length) {
      await prisma.ride.updateMany({
        where: { id: { in: sentRideIds } },
        data: { isThirtyMinReminderSent: true },
      });
    }
    // if (fcmTokens.length) {
    //   await NotificationServices.sendFirebaseMulticastMessage(fcmTokens);
    // }
  } catch (error) {
    console.error("Error running 30min ride notifications cron:", error);
  }
};

// Remind passengers departure time is up, and expire unconfirmed bookings, also expire the rides which have no approved bookings
const remindStartOfTheRide = async () => {
  const now = moment();
  try {
    const ridesToStart = await prisma.ride.findMany({
      where: {
        departureTime: {
          gte: now.toDate(),
          lt: now.clone().add(1, "minute").toDate(),
        },
        status: RideStatus.PUBLISHED,
        OR: [{ isStartReminderSent: null }, { isStartReminderSent: false }],
      },
      include: {
        bookings: {
          where: { status: { notIn: [BookingStatus.EXPIRED, BookingStatus.CANCELLED, BookingStatus.DECLINED] } },
          include: { booker: true, paymentTransaction: true, redeemedCoupns: true },
        },
        d2dBookingRequests: {
          where: { status: { notIn: [D2DBookingRequestStatus.EXPIRED, D2DBookingRequestStatus.CANCELED, D2DBookingRequestStatus.DECLINED] } },
          include: { passenger: true, transaction: true, redeemedCoupns: true },
        },
        driver: true,
        departureLocation: true,
        destinationLocation: true,
      },
    });

    const sentRideIds: number[] = [];

    for (const ride of ridesToStart) {

      const approvedBookings = ride.bookings.filter(
        (b) => b.status === BookingStatus.APPROVED
      );
      const approvedD2DRequests = ride.d2dBookingRequests.filter(
        (d) => d.status === D2DBookingRequestStatus.CONFIRMED
      );

      // passengers reminders for approved bookings only
      const approvedBookerIds = approvedBookings.map((bk) => bk.userId);
      if (approvedBookerIds.length) {
        await NotificationServices.notifyUsers({
          userIds: approvedBookerIds,
          titleEn: "Ride Departure Reminder",
          titleFr: "Rappel de départ du trajet",
          messageEn: `The departure time of the ride from ${ride.departureLocation.city
            }${ride.departureLocation.regionCode
              ? `, ${ride.departureLocation.regionCode}`
              : ""
            } to ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
              ? `, ${ride.destinationLocation.regionCode}`
              : ""
            } is up.`,
          messageFr: `L'heure de départ du trajet de ${ride.departureLocation.city
            }${ride.departureLocation.regionCode
              ? `, ${ride.departureLocation.regionCode}`
              : ""
            } à ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
              ? `, ${ride.destinationLocation.regionCode}`
              : ""
            } est arrivée.`,
          rideId: ride.id,
        });
      }

      // Cancel unapproved bookings and refund transactions
      const unapprovedBookings = ride.bookings.filter(
        (b) => b.status !== BookingStatus.APPROVED
      );

      const formatedDepTime = new Date(ride.departureTime).toLocaleString("en-CA", {
            timeZone: "UTC",
          });

      for (const booking of unapprovedBookings) {
        try {
          const tx = booking.paymentTransaction;
          if (tx) {
            // Refund on Stripe if payment was captured or held
            if (tx.status === "ONHOLD" && tx.externalReference) {
              await stripe.paymentIntents.cancel(tx.externalReference);
              await prisma.transaction.update({
                where: { id: tx.id },
                data: { status: "CANCELLED" },
              });
            } else if (
              tx.status === "PAID" &&
              tx.externalReference &&
              tx.paymentProvider === "STRIPE"
            ) {
              // Create refund on Stripe
              await stripe.refunds.create({ payment_intent: tx.externalReference });
              await prisma.transaction.update({
                where: { id: tx.id },
                data: {
                  isRefunded: true,
                  refundedAmount: tx.amount,
                  refundedAt: new Date(),
                  status: "REFUNDED",
                },
              });
            }
          }

          // Expire the booking
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.EXPIRED,
              expiredAt: new Date(),
              reason: "Ride expired due to no confirmed bookings | Trajet expiré car il n'y avait pas de réservations confirmées avant l'heure de départ.",
            },

          });

          const existSeats = await prisma.bookingSeat.findMany({ where: { bookingId: booking.id, isExpired: false } });
        if (existSeats.length) {
          await prisma.bookingSeat.updateMany({
            where: { id: { in: existSeats.map(e => e.id) } },
            data: {
              isExpired: true,
              expireReason: "Ride expired due to no confirmed bookings | Trajet expiré car il n'y avait pas de réservations confirmées avant l'heure de départ.",
              expiredAt: new Date(),
            },
          })
        }

          // refund the coupons if applicable
          if (
            booking.redeemedCoupns.length
          ) {
            await CouponService.refundCoupons(booking.redeemedCoupns);
          }

          // Notify booker about cancellation
          await NotificationServices.notifyUsers({
            userIds: [booking.userId],
            titleEn: "Booking Expired",
            titleFr: "Réservation Expirée",
            messageEn: `Your booking for the ride from ${ride.departureLocation.city
              }, ${ride.departureLocation.regionCode
                ? `, ${ride.departureLocation.regionCode}`
                : ""
              } to ${ride.destinationLocation.city}, ${ride.destinationLocation.regionCode
                ? `, ${ride.destinationLocation.regionCode}`
                : ""
              } has expired because the ride did not have confirmed bookings before departure time, ${formatedDepTime}. If you already made a payment, it has been refunded. Thank you for using our service.`,
            messageFr: `Votre réservation pour le trajet de ${ride.departureLocation.city}${ride.departureLocation.regionCode ? `, ${ride.departureLocation.regionCode}` : ""} à ${ride.destinationLocation.city}${ride.destinationLocation.regionCode ? `, ${ride.destinationLocation.regionCode}` : ""} a expiré parce que le trajet n'avait pas de réservations confirmées avant l'heure de départ, ${formatedDepTime}. Si vous avez déjà effectué un paiement, il a été remboursé. Merci d'utiliser notre service.`,
            rideId: ride.id,
          });
        } catch (err) {
          logger.error("Error cancelling unapproved booking", {
            bookingId: booking.id,
            err,
          });
        }
      }

      // Cancel unapproved d2d booking requests and refund transactions
      const unapprovedD2DRequests = ride.d2dBookingRequests.filter(
        (d) => d.status !== D2DBookingRequestStatus.CONFIRMED
      );
      for (const request of unapprovedD2DRequests) {
        try {
          const tx = request.transaction;
          if (tx) {
            if (tx.status === "ONHOLD" && tx.externalReference) {
              await stripe.paymentIntents.cancel(tx.externalReference);
              await prisma.transaction.update({
                where: { id: tx.id },
                data: { status: "CANCELLED" },
              });
            } else if (
              tx.status === "PAID" &&
              tx.externalReference &&
              tx.paymentProvider === "STRIPE"
            ) {
              await stripe.refunds.create({
                payment_intent: tx.externalReference,
              });
              await prisma.transaction.update({
                where: { id: tx.id },
                data: {
                  isRefunded: true,
                  refundedAmount: tx.amount,
                  refundedAt: new Date(),
                  status: "REFUNDED",
                },
              });
            }
          }

          // Expire the d2d booking request
          await prisma.d2DBookingRequest.update({
            where: { id: request.id },
            data: {
              status: D2DBookingRequestStatus.EXPIRED,
              expiredAt: new Date(),
              reason: "Ride expired due to no confirmed bookings | Trajet expiré car il n'y avait pas de réservations confirmées avant l'heure de départ.",
            },
          });
          const existSeat = await prisma.bookingSeat.findUnique({ where: { d2dBookingId: request.id, isExpired: false } });
        if (existSeat) {
          await prisma.bookingSeat.update({
            where: { id: existSeat.id },
            data: {
              isExpired: true,
              expireReason: "Ride expired due to no confirmed bookings | Trajet expiré car il n'y avait pas de réservations confirmées avant l'heure de départ.",
              expiredAt: new Date(),
            },
          })
        }

          // refund the coupons if applicable
          if (
            request.redeemedCoupns.length
          ) {
            await CouponService.refundCoupons(request.redeemedCoupns);
          }

          // Notify passenger about cancellation
          await NotificationServices.notifyUsers({
            userIds: [request.passengerId],
            titleEn: "Booking Expired",
            titleFr: "Réservation Expirée",
            messageEn: `Your booking for the ride from ${ride.departureLocation.city
              }, ${ride.departureLocation.regionCode
                ? `, ${ride.departureLocation.regionCode}`
                : ""
              } to ${ride.destinationLocation.city}, ${ride.destinationLocation.regionCode
                ? `, ${ride.destinationLocation.regionCode}`
                : ""
              } has expired because the ride did not have confirmed bookings before departure time, ${formatedDepTime}. If you already made a payment, it has been refunded. Thank you for using our service.`,
            messageFr: `Votre réservation pour le trajet de ${ride.departureLocation.city}${ride.departureLocation.regionCode ? `, ${ride.departureLocation.regionCode}` : ""} à ${ride.destinationLocation.city}${ride.destinationLocation.regionCode ? `, ${ride.destinationLocation.regionCode}` : ""} a expiré parce que le trajet n'avait pas de réservations confirmées avant l'heure de départ, ${formatedDepTime}. Si vous avez déjà effectué un paiement, il a été remboursé. Merci d'utiliser notre service.`,
            rideId: ride.id,
          });
        } catch (err) {
          logger.error("Error cancelling unapproved d2d request", {
            requestId: request.id,
            err,
          });
        }
      }

      if (approvedBookings.length > 0 || approvedD2DRequests.length > 0) {
        // driver reminder
      await NotificationServices.notifyUsers({
        userIds: [ride.driverId],
        titleEn: "Ride Departure Reminder",
        titleFr: "Rappel de départ du trajet",
        messageEn: `The departure time of the ride from ${
          ride.departureLocation.city
        }${
          ride.departureLocation.regionCode
            ? `, ${ride.departureLocation.regionCode}`
            : ""
        } to ${ride.destinationLocation.city}${
          ride.destinationLocation.regionCode
            ? `, ${ride.destinationLocation.regionCode}`
            : ""
        } is up.`,
        messageFr: `L'heure de départ du trajet de ${
          ride.departureLocation.city
        }${
          ride.departureLocation.regionCode
            ? `, ${ride.departureLocation.regionCode}`
            : ""
        } à ${ride.destinationLocation.city}${
          ride.destinationLocation.regionCode
            ? `, ${ride.destinationLocation.regionCode}`
            : ""
        } est arrivée.`,
        rideId: ride.id,
      });
      };

      // Mark ride as expired if no approved bookings or d2d requests
      if (approvedBookings.length === 0 && approvedD2DRequests.length === 0) {
        await prisma.ride.update({
          where: { id: ride.id },
          data: { status: RideStatus.EXPIRED },
        });

        // Notify driver about ride expiration
        await NotificationServices.notifyUsers({
          userIds: [ride.driverId],
          titleEn: "Ride Expired",
          titleFr: "Trajet Expiré",
          messageEn: `Your ride from ${ride.departureLocation.city}${ride.departureLocation.regionCode
              ? `, ${ride.departureLocation.regionCode}`
              : ""
            } to ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
              ? `, ${ride.destinationLocation.regionCode}`
              : ""
            } has been expired because no passengers confirmed their bookings before the departure time.`,
          messageFr: `Votre trajet de ${ride.departureLocation.city}${ride.departureLocation.regionCode
              ? `, ${ride.departureLocation.regionCode}`
              : ""
            } à ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
              ? `, ${ride.destinationLocation.regionCode}`
              : ""
            } a expiré car aucun passager n'a confirmé sa réservation avant l'heure de départ.`,
          rideId: ride.id,
        });
      }

      sentRideIds.push(ride.id);
    }

    if (sentRideIds.length) {
      await prisma.ride.updateMany({
        where: { id: { in: sentRideIds } },
        data: { isStartReminderSent: true },
      });
    }
  } catch (error) {
    logger.error("Error running start ride notifications cron:", error);
  }
};

// Remind driver to complete ride 3 hours after estimated arrival time
const remind3hoursToCompleteTheRide = async () => {
  const now = moment();
  try {
    const overdueRides = await prisma.ride.findMany({
      where: {
        estimatedArrivalTime: {
          lte: now.clone().subtract(3, "hours").toDate(),
        },
        status: RideStatus.ONGOING,
        isRideCompleteReminderSent: { not: true },
      },
      include: {
        driver: true,
        departureLocation: true,
        destinationLocation: true,
      },
    });

    const sentRideIds: number[] = [];

    for (const ride of overdueRides) {
      await NotificationServices.notifyUsers({
        userIds: [ride.driverId],
        messageEn: `This is a reminder to complete the ride from ${ride.departureLocation.city
          }${ride.departureLocation.regionCode
            ? `, ${ride.departureLocation.regionCode}`
            : ""
          } to ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
            ? `, ${ride.destinationLocation.regionCode}`
            : ""
          } as you might have forgotten to complete it. Thank you!`,
        messageFr: `Ceci est un rappel pour terminer le trajet de ${ride.departureLocation.city
          }${ride.departureLocation.regionCode
            ? `, ${ride.departureLocation.regionCode}`
            : ""
          } à ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
            ? `, ${ride.destinationLocation.regionCode}`
            : ""
          }, parce que vous avez peut-être oublié de le terminer. Merci!`,
        titleEn: "Ride Complete Reminder",
        titleFr: "Rappel de fin de trajet",
        rideId: ride.id,
      });
      sentRideIds.push(ride.id);
    }

    if (sentRideIds.length) {
      await prisma.ride.updateMany({
        where: { id: { in: sentRideIds } },
        data: { isRideCompleteReminderSent: true },
      });
    }
  } catch (error) {
    console.error("Error running 3h ride completion reminder cron:", error);
  }
};

// mid night reminder to complete the ride if a driver was reminded to complete but still did not.
const midNightReminderToCompleteTheRide = async () => {
  const now = moment();
  try {
    const overdueRides = await prisma.ride.findMany({
      where: {
        estimatedArrivalTime: {
          lte: now.clone().subtract(3, "hours").toDate(),
        },
        status: RideStatus.ONGOING,
        isRideCompleteReminderSent: true,
      },
      include: {
        driver: true,
        departureLocation: true,
        destinationLocation: true,
      },
    });

    for (const ride of overdueRides) {
      await NotificationServices.notifyUsers({
        userIds: [ride.driverId],
        titleEn: "Ride Complete Reminder",
        titleFr: "Rappel de fin de trajet",
        messageEn: `This is a reminder to complete the ride from ${ride.departureLocation.city
          }${ride.departureLocation.regionCode
            ? `, ${ride.departureLocation.regionCode}`
            : ""
          } to ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
            ? `, ${ride.destinationLocation.regionCode}`
            : ""
          } as you might have forgotten to complete it. Thank you!`,
        messageFr: `Ceci est un rappel pour terminer le trajet de ${ride.departureLocation.city
          }${ride.departureLocation.regionCode
            ? `, ${ride.departureLocation.regionCode}`
            : ""
          } à ${ride.destinationLocation.city}${ride.destinationLocation.regionCode
            ? `, ${ride.destinationLocation.regionCode}`
            : ""
          }, parce que vous avez peut-être oublié de le terminer. Merci!`,
        rideId: ride.id,
      });
    }
  } catch (error) {
    console.error("Error running ride notifications cron:", error);
  }
};

// auto delete chats after 7 days of ride completion
const cleanChats = async () => {
  const cutoffDate = moment().subtract(7, "days").toDate();
  try {
    const deletedChats = await prisma.chatThread.deleteMany({
      where: {
        ride: {
          status: RideStatus.COMPLETED,
          completedAt: { lte: cutoffDate },
        },
      },
    });
    logger.info(`Deleted ${deletedChats.count} chat threads linked to completed rides older than 7 days on ${new Date().toLocaleDateString("en-CA")}.`);
  } catch (error) {
    console.error("Error running chat cleanup cron:", error);
  }
}


// Capture funds from Stripe before expiration (6 days after creation, 1 day before 7-day limit)
const captureFundsBeforeExpiration = async () => {
  const now = moment();
  const sixDaysAgo = now.clone().subtract(6, "days").toDate();
  const sevenDaysAgo = now.clone().subtract(7, "days").toDate();

  try {
    // Find transactions that are ONHOLD, created 6-7 days ago, and have external reference
    const transactionsToCapture = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.ONHOLD,
        externalReference: { not: null },
        paymentProvider: "STRIPE",
        createdAt: {
          gte: sevenDaysAgo,
          lte: sixDaysAgo,
        },
        OR: [
          {
            booking: {
              status: { in: [BookingStatus.APPROVED, BookingStatus.PENDING] },
              ride: {
                status: { in: [RideStatus.PUBLISHED, RideStatus.ONGOING] },
              },
            },
          },
          {
            d2dBookingReq: {
              status: {
                in: [
                  D2DBookingRequestStatus.CONFIRMED,
                  D2DBookingRequestStatus.ACCEPTED,
                ],
              },
              ride: {
                status: { in: [RideStatus.PUBLISHED, RideStatus.ONGOING] },
              },
            },
          },
        ],
      },
      include: {
        user: true,
        booking: {
          include: {
            ride: {
              include: {
                driver: true,
                departureLocation: true,
                destinationLocation: true,
              },
            },
          },
        },
        d2dBookingReq: {
          include: {
            ride: {
              include: {
                driver: true,
                departureLocation: true,
                destinationLocation: true,
              },
            },
          },
        },
      },
    });

    for (const txn of transactionsToCapture) {
      try {
        if (!txn.externalReference) continue;

        // Check if payment intent still exists and is capturable
        const paymentIntent = await stripe.paymentIntents.retrieve(
          txn.externalReference
        );

        if (paymentIntent.status !== "requires_capture") {
          logger.debug(
            `Payment intent ${txn.externalReference} is not in requires_capture status, skipping`,
            { status: paymentIntent.status, txId: txn.id }
          );
          continue;
        }

        // Determine which ride to use
        const ride =
          txn.booking?.ride || txn.d2dBookingReq?.ride;
        
        if (!ride) {
          logger.warn(`No ride found for transaction ${txn.id}, skipping capture`);
          continue;
        }

        // Capture the full amount
        await TransactionService.captureStripeFunds({
          paymentIntentId: txn.externalReference,
          txn: txn,
          ride: ride,
        });

        logger.info(
          `Captured funds before expiration for transaction ${txn.id}, payment intent ${txn.externalReference}`
        );
      } catch (err: any) {
        logger.error(
          `Error capturing funds before expiration for transaction ${txn.id}`,
          {
            txId: txn.id,
            externalReference: txn.externalReference,
            err: err.message || err,
          }
        );
        // Continue to next transaction
      }
    }

    logger.info(
      `Completed capture funds before expiration job. Processed ${transactionsToCapture.length} transactions.`
    );
  } catch (error) {
    logger.error("Error running capture funds before expiration cron:", error);
  }
};

export const settleCompletedRides = async () => {
  const now = moment();
  const settlementCutoff = now.clone().subtract(24, "hours").toDate();

  try {
    const ridesToProcess = await prisma.ride.findMany({
      where: {
        isSettled: false,
        settlementProcessingAt: null,

        // No unresolved complaints
        noShows: {
          none: { status: "PENDING" },
        },

        // Has payable participants
        OR: [
          {
            bookings: {
              some: { status: BookingStatus.APPROVED },
            },
          },
          {
            d2dBookingRequests: {
              some: { status: D2DBookingRequestStatus.CONFIRMED },
            },
          },
        ],

        // Complaint window closed
        AND: [
          {
            OR: [
              // Case 1: explicitly completed rides
              {
                status: RideStatus.COMPLETED,
                completedAt: { lte: settlementCutoff },
              },

              // Case 2: implicitly completed by time
              {
                status: { in: [RideStatus.PUBLISHED, RideStatus.ONGOING] },
                estimatedArrivalTime: { lte: settlementCutoff },
              },
            ],
          },
        ],
      },
      take: 5,
      include: {
        departureLocation: true,
        destinationLocation: true,
        driver: {
          include: {
            receivedReferral: true,
            _count: {
              select: {
                postedRides: { where: { status: "COMPLETED" } },
                bookings: {
                  where: {
                    // bookingSeats: { some: { attendedAt: { not: null } } },
                    status: { in: ["APPROVED", "COMPLETED"] },
                  },
                },
                d2dBookingRequests: {
                  where: {
                    status: {
                      in: [
                        D2DBookingRequestStatus.CONFIRMED,
                        D2DBookingRequestStatus.COMPLETED,
                      ],
                    },
                    ride: { status: "COMPLETED" },
                  },
                },
              },
            },
          },
        },
        bookings: {
          where: { status: "APPROVED" },
          include: {
            booker: {
              include: {
                receivedReferral: true,
                _count: {
                  select: {
                    bookings: {
                      where: {
                        status: "COMPLETED",
                        ride: { status: "COMPLETED" },
                      },
                    },
                    postedRides: { where: { status: "COMPLETED" } },
                    d2dBookingRequests: {
                      where: {
                        status: D2DBookingRequestStatus.COMPLETED,
                        ride: { status: "COMPLETED" },
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                bookingSeats: {
                  where: { attendedAt: { not: null } },
                },
              },
            },
            paymentTransaction: {
              include: {
                d2dBookingReq: true,
                booking: true,
                user: true,
              },
            },
            redeemedCoupns: true,
          },
        },
        d2dBookingRequests: {
          where: {
            status: D2DBookingRequestStatus.CONFIRMED,
          },
          include: {
            transaction: {
              include: {
                d2dBookingReq: true,
                booking: true,
                user: true,
              },
            },
            redeemedCoupns: true,
            passenger: {
              include: {
                receivedReferral: true,
                _count: {
                  select: {
                    bookings: {
                      where: {
                        status: { in: ["COMPLETED"] },
                        ride: { status: "COMPLETED" },
                      },
                    },
                    postedRides: { where: { status: "COMPLETED" } },
                    d2dBookingRequests: {
                      where: {
                        status: D2DBookingRequestStatus.COMPLETED,
                        ride: { status: "COMPLETED" },
                      },
                    },
                  },
                },
              },
            },
            bookingSeat: true,
          },
        },
        noShows: true,
      },
    });

    await prisma.ride.updateMany({
      where: {
        id: { in: ridesToProcess.map(r => r.id) },
        settlementProcessingAt: null,
      },
      data: {
        settlementProcessingAt: new Date(),
      },
    });

    const expiresAt = moment().add(1, "year").toDate();

    for (const ride of ridesToProcess) {
      try {
        let anyFailedBooking = false;
        const rideWithRelations = ride as typeof ride & {
          driver: typeof ride.driver;
          bookings: typeof ride.bookings;
          d2dBookingRequests: typeof ride.d2dBookingRequests;
        };

        if (!ride.isDriverCouponIssuedOnCompletion) {
          const createCoupons: Prisma.CouponCreateManyInput[] = [
            {
              userId: ride.driverId,
              source: "RIDE",
              expiresAt,
              quantity: 1,
              originalQuantity: 1,
            },
          ];
          // driver referral gift if first completed ride
          const isDriverFirst =
            rideWithRelations.driver._count.postedRides === 0 &&
            rideWithRelations.driver._count.bookings +
            rideWithRelations.driver._count.d2dBookingRequests ===
            0;
          if (
            isDriverFirst &&
            rideWithRelations.driver.receivedReferral?.inviterId &&
            !ride.isDriverCouponIssuedOnCompletion
          ) {
            createCoupons.push({
              userId: rideWithRelations.driver.receivedReferral.inviterId,
              source: "REFERRAL",
              expiresAt,
              quantity: 1,
              originalQuantity: 1,
            });
          }
          await prisma.coupon.createMany({
            data: createCoupons,
          });
          await prisma.ride.update({
            where: { id: ride.id },
            data: { isDriverCouponIssuedOnCompletion: true },
          });
        }

        // Process bookings sequentially
        const referralIssuedForUsers = new Set<number>();
        for (const booking of rideWithRelations.bookings) {
          const tx = booking.paymentTransaction;
          const createBookingCoupons: Prisma.CouponCreateManyInput[] = [];

          if (!tx) {
            logger.debug(
              `No paymentTransaction for booking ${booking.id}, skipping payment settlement.`
            );
            anyFailedBooking = true;
            continue;
          }

          try {
            // if the transaction is onhold, we have to capture and process driver payout and send receipt to the payer
            if (
              tx.status === "ONHOLD" &&
              tx.externalReference &&
              tx.paymentProvider === "STRIPE"
            ) {
              await TransactionService.captureStripeFunds({
                paymentIntentId: tx.externalReference,
                txn: tx,
                ride: rideWithRelations,
              });

              // 1 coupon per seat for passenger reward
              createBookingCoupons.push({
                userId: booking.userId,
                source: "RIDE",
                expiresAt,
                quantity: booking.seats,
                originalQuantity: booking.seats,
              });
              // booker referral bonus (same as before)
              const isBookerFirst =
                booking.booker._count.bookings === 0 &&
                booking.booker._count.postedRides +
                booking.booker._count.d2dBookingRequests ===
                0;
              if (
                isBookerFirst &&
                booking.booker.receivedReferral?.inviterId &&
                !referralIssuedForUsers.has(booking.userId)
              ) {
                referralIssuedForUsers.add(booking.userId);
                createBookingCoupons.push({
                  userId: booking.booker.receivedReferral.inviterId,
                  source: "REFERRAL",
                  expiresAt,
                  quantity: 1,
                  originalQuantity: 1,
                });
              }
              await prisma.$transaction(async (tx) => {
                await tx.booking.update({
                  where: { id: booking.id },
                  data: {
                    status: BookingStatus.COMPLETED,
                    couponsIssued: true,
                  },
                });
                if (!booking.couponsIssued && createBookingCoupons.length) {
                  await tx.coupon.createMany({
                    data: createBookingCoupons,
                  });
                }
              });
            }
          } catch (err) {
            logger.error("Error processing booking payment during settlement", {
              bookingId: booking.id,
              err,
            });
            // continue to next booking
            anyFailedBooking = true;
            continue;
          }
        } // end bookings loop

        // handle a d2d ride type, it does not have booking, it uses d2dBookingRequests instead.
        for (const request of rideWithRelations.d2dBookingRequests) {
          const tx = request.transaction;
          const createBookingCoupons: Prisma.CouponCreateManyInput[] = [];
          if (!tx) {
            logger.debug(
              `No payment transaction for booking ${request.id}, skipping payment settlement.`
            );
            anyFailedBooking = true;
            continue;
          }

          try {
            // if the transaction is onhold, we have to capture and process driver payout and send receipt to the payer
            if (
              tx.status === "ONHOLD" &&
              tx.externalReference &&
              tx.paymentProvider === "STRIPE"
            ) {
              await TransactionService.captureStripeFunds({
                paymentIntentId: tx.externalReference,
                txn: tx,
                ride,
              });

              // 1 coupon per seat for passenger reward
              createBookingCoupons.push({
                userId: request.passengerId,
                source: "RIDE",
                expiresAt,
                quantity: 1,
                originalQuantity: 1,
              });
              // booker referral bonus (same as before)
              const isBookerFirst =
                request.passenger._count.bookings === 0 &&
                request.passenger._count.postedRides +
                request.passenger._count.d2dBookingRequests ===
                0;
              if (
                isBookerFirst &&
                request.passenger.receivedReferral?.inviterId &&
                !referralIssuedForUsers.has(request.passengerId)
              ) {
                referralIssuedForUsers.add(request.passengerId);
                createBookingCoupons.push({
                  userId: request.passenger.receivedReferral.inviterId,
                  source: "REFERRAL",
                  expiresAt,
                  quantity: 1,
                  originalQuantity: 1,
                });
              }

              await prisma.$transaction(async (tx) => {
                await tx.d2DBookingRequest.update({
                  where: { id: request.id },
                  data: {
                    status: D2DBookingRequestStatus.COMPLETED,
                    couponsIssued: true,
                  },
                });
                if (!request.couponsIssued && createBookingCoupons.length) {
                  await tx.coupon.createMany({
                    data: createBookingCoupons,
                  });
                }
              });
            }
          } catch (err) {
            logger.error("Error processing booking payment during settlement", {
              bookingId: request.id,
              err,
            });
            // continue to next booking
            anyFailedBooking = true;
            continue;
          }
        } // end bookings loop

        if (anyFailedBooking) {
          await prisma.ride.update({
            where: { id: ride.id },
            data: {
              settlementFailedReason:
                "One or more booking payments/payouts failed",
            },
          });
          logger.warn(
            `Ride ${ride.id} settlement had failures; will need a manual settlement trigger.`
          );
          continue; // skip marking as settled
        }

        // mark ride settled (atomic) and debit commission in a single transaction
        await prisma.$transaction(async (tx) => {
          await debitCommissionForCompletedRide(tx, ride.id);
          await tx.ride.update({
            where: { id: ride.id },
            data: {
              isSettled: true,
              ...(ride.status !== "COMPLETED" && { status: "COMPLETED", completedAt: new Date() }),
            },
          });
        });

        // Cleanup redeemed coupons for this ride
        await prisma.redeemedCoupon.deleteMany({
          where: { booking: { rideId: ride.id } },
        });

        logger.info(`Ride ${ride.id} settled successfully.`);
      } catch (err) {
        logger.error("Unexpected error while settling ride", {
          rideId: ride.id,
          err,
        });
        // mark ride for manual review
        await prisma.ride.update({
          where: { id: ride.id },
          data: {
            settlementFailedReason: String(
              err || "Unknown error during settlement"
            ),
          },
        });
      }
    } // end rides loop
  } catch (err) {
    logger.error("Error running settleCompletedRides cron", err);
  }
};

export const initializeRideCronJobs = () => {
  logger.debug("Initializing rides' cron jobs...");

  const thirtyMinReminderJob = new CronJob(
    "* * * * *", // Run every minute
    async () => {
      logger.debug("Running 30 min reminder check...");
      try {
        await remind30minStartOfTheRide();
        logger.debug(
          "Cron job for 30 min reminder check completed successfully"
        );
      } catch (error) {
        logger.error("Error in ride cron jobs:", error);
      }
    },
    null, // onComplete
    false, // start
    "UTC" // timezone
  );

  const startReminderJob = new CronJob(
    "* * * * *", // Run every minute
    async () => {
      logger.debug("Running Start reminder check...");
      try {
        await remindStartOfTheRide();
        logger.debug(
          "Cron job for ride start reminder check completed successfully"
        );
      } catch (error) {
        logger.error("Error in ride start cron jobs:", error);
      }
    },
    null, // onComplete
    false, // start
    "UTC" // timezone
  );

  const threeHourCompleteReminderJob = new CronJob(
    "0 * * * *", // Run every hour
    async () => {
      logger.debug("Running three hour complete ride reminder check...");
      try {
        await remind3hoursToCompleteTheRide();
        logger.debug(
          "Cron job for three hour complete ride reminder check completed successfully"
        );
      } catch (error) {
        logger.error("Error in three hour complete ride cron jobs:", error);
      }
    },
    null, // onComplete
    false, // start
    "UTC" // timezone
  );

  const midNightCompleteReminderJob = new CronJob(
    "0 0 * * *", // Run every day at midnight
    async () => {
      logger.debug("Running midnight ride reminder check...");
      try {
        await midNightReminderToCompleteTheRide();
        await cleanChats();
        logger.debug(
          "Cron job for midnight complete ride reminder check completed successfully"
        );
      } catch (error) {
        logger.error("Error in midnight complete ride cron jobs:", error);
      }
    },
    null, // onComplete
    false, // start
    "UTC" // timezone
  );

  // a job to settle completed rides
  const settleCompletedRidesJob = new CronJob(
    "*/10 * * * *", // Run every 10 minutes
    async () => {
      logger.debug("Running settle completed rides job...");
      try {
        await settleCompletedRides();
        logger.debug("Settle completed rides job completed successfully");
      } catch (error) {
        logger.error("Error in settle completed rides job:", error);
      }
    },
    null, // onComplete
    false, // start
    "UTC" // timezone
  );

  // a job to capture funds before Stripe expiration (6 days after creation)
  const captureFundsBeforeExpirationJob = new CronJob(
    "0 */6 * * *", // Run every 6 hours
    async () => {
      logger.debug("Running capture funds before expiration job...");
      try {
        await captureFundsBeforeExpiration();
        logger.debug("Capture funds before expiration job completed successfully");
      } catch (error) {
        logger.error("Error in capture funds before expiration job:", error);
      }
    },
    null, // onComplete
    false, // start
    "UTC" // timezone
  );

  // Start the cron jobs
  thirtyMinReminderJob.start();
  startReminderJob.start();
  threeHourCompleteReminderJob.start();
  midNightCompleteReminderJob.start();
  settleCompletedRidesJob.start();
  captureFundsBeforeExpirationJob.start();
  logger.debug("Ride cron jobs initialized and started");

  // For testing purposes, let's also run it immediately
  threeHourCompleteReminderJob.fireOnTick();
  midNightCompleteReminderJob.fireOnTick();
  settleCompletedRidesJob.fireOnTick();
};
