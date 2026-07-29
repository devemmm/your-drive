import {
  BookingStatus,
  BookingType,
  D2DBookingRequest,
  D2DBookingRequestStatus,
  Language,
  Location,
  MonetizationType,
  NotificationPreference,
  PaymentProvider,
  PaymentSession,
  PaymentSessionStatus,
  Ride,
  TransactionStatus,
  TransactionType,
  User,
} from "@prisma/client";
import { prisma } from "../config/database";
import { io } from "../server";
import { NotificationServices } from "./notification.service";
import { stripe } from "../config/stripe";
import { profileSelects } from "../types";
import { generateRideBookingAttendenceCode } from "../utils/generateReferralCode";
import { CouponService } from "./coupon.service";
import { v7 } from "uuid";
import { logger } from "../utils/logger";
import { getDefaultCurrency } from "../utils/currency";

export class BookingService {
  static async finalizeBooking(params: {
    ride: Ride & {
      departureLocation: Location;
      destinationLocation: Location;
      driver: {
        id: number;
        firstName: string | null;
        email: string;
        phoneNumber: string | null;
        language: Language;
        notificationPref: NotificationPreference;
        fcm_token: string | null;
      };
    };
    session: PaymentSession;
    intentId: string;
    redeemedCouponIds?: number[];
  }) {
    const { ride, session, redeemedCouponIds = [], intentId } = params;

    const txn = await prisma.transaction.create({
      data: {
        userId: session.userId,
        rideId: ride.id,
        type: TransactionType.RIDE_BOOKING,
        externalReference: intentId,
        amount: Number(session.totalAmount),
        platformAmount: Number(session.platformAmount),
        driverAmount: Number(session.driverAmount),
        currency: session.currency || getDefaultCurrency(),
        status: TransactionStatus.ONHOLD, // authorized / on-hold
        paymentProvider: session.paymentProvider,
        transactionDate: new Date(),
        transactionId: `cr_trans_${v7()}`,
        discountPct: session.discountPct,
        discount: session.discountAmount,
        couponsUsed: session.couponsToConsume,
      },
    });
    const booking = await prisma.booking.create({
      data: {
        rideId: ride.id,
        vehicleId: ride.vehicleId,
        seats: session.seatsToBook || 0,
        userId: session.userId,
        status:
          ride.bookingType === BookingType.AUTOMATIC
            ? BookingStatus.APPROVED
            : BookingStatus.PENDING,
        transactionId: txn.id,

        // link redeemed coupons (if caller provided redemption ids)
        ...(redeemedCouponIds.length > 0
          ? {
              redeemedCoupns: {
                connect: redeemedCouponIds.map((id) => ({ id })),
              },
            }
          : {}),

        // Booking seats (attendance codes) created for automatic bookings
        ...(ride.bookingType === BookingType.AUTOMATIC && {
          bookingSeats: {
            create: await Promise.all(
              Array.from({ length: session.seatsToBook || 0 }).map(
                async () => ({
                  attendanceCode: await generateRideBookingAttendenceCode(),
                  rideId: ride.id,
                })
              )
            ),
          },
        }),
      },
      include: {
        bookingSeats: true,
        booker: true,
        paymentTransaction: {
          include: {
            user: { select: profileSelects },
            ride: {
              include: {
                departureLocation: true,
                destinationLocation: true,
              },
            },
            plan: true,
            booking: true,
          },
        },
      },
    });

    // 3) Send booking emails for automatic booking seats
  // no email to be sent

    // 4) If automatic booking, decrement ride available seats and connect chat thread user
    if (ride.bookingType === BookingType.AUTOMATIC) {
      const updatedRide = await prisma.ride.update({
        where: { id: ride.id },
        data: {
          availableSeats: { decrement: session.seatsToBook || 0 },
          chatThread: {
            update: {
              users: {
                connect: {
                  id: booking.userId,
                },
              },
            },
          },
        },
        include: {
          departureLocation: true,
          destinationLocation: true,
          driver: {
            select: {
              ...profileSelects,
              averageRating: true,
              totalRatings: true,
            },
          },
        },
      });

      // If ride is now full, handle pending bookings cancellation (this will run outside of db tx for safety)
      if (updatedRide.availableSeats <= 0) {
        // run without blocking the transaction — use setImmediate or schedule
        setImmediate(() => BookingService.handleFullBooking(updatedRide));
      }
    } else {
      const titleEn = "New Booking Request";
      const titleFr = "Nouvelle Demande de Réservation";
      const messageEn = `You have a new booking request for your ride from ${ride.departureLocation.city} to ${ride.destinationLocation.city}.`;
      const messageFr = `Vous avez une nouvelle demande de réservation pour votre course de ${ride.departureLocation.city} à ${ride.destinationLocation.city}.`;
      await NotificationServices.notifyUsers({
        userIds: [ride.driverId],
        titleEn,
        titleFr,
        messageEn,
        messageFr,
        rideId: ride.id,
      });
      io.to(`user-${ride.driverId}`).emit("driver_booking", booking);
    }
    await prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        status: PaymentSessionStatus.PAYMENT_AUTHORIZED,
      },
    });

    // Notify booker (user who made the booking)
    await NotificationServices.notifyUsers({
      userIds: [session.userId],
      titleEn: "Payment Authorized",
      titleFr: "Paiement Autorisé",
      messageEn:
        `Your payment of amount ${booking.paymentTransaction?.amount} for the ride ${ride.departureLocation.city}, ${ride.departureLocation.regionCode} -> ${ride.destinationLocation.city}, ${ride.destinationLocation.regionCode} has been authorized and is on hold.`,
      messageFr:
        `Votre paiement d'un montant de ${booking.paymentTransaction?.amount} pour le trajet ${ride.departureLocation.city}, ${ride.departureLocation.regionCode} -> ${ride.destinationLocation.city}, ${ride.destinationLocation.regionCode} a été autorisé et est en attente.`,
        rideId: ride.id,
    });
    io.to(`user-${session.userId}`).emit("payment_authorized", {
      transaction: txn,
      booking,
    });

    const paymentAuthorizedLogData = {
      level: "info",
      message: `Payment authorized and held for transaction ${txn.transactionId}`,
      action: "WebhookPaymentAuthorized",
      userId: txn.userId,
      meta: {
        transactionId: txn.transactionId,
        status: txn.status,
        timestamp: new Date().toISOString(),
      },
    };
    logger.info(paymentAuthorizedLogData.message, {
      level: paymentAuthorizedLogData.level,
      action: paymentAuthorizedLogData.action,
      userId: paymentAuthorizedLogData.userId,
      meta: paymentAuthorizedLogData.meta,
    });

    const { paymentTransaction, ...bkg } = booking;

    return { booking: bkg, transaction: paymentTransaction };
  }

  static async handleFullBooking(
    ride: Ride & {
      departureLocation: Location;
      destinationLocation: Location;
      driver: Partial<User>;
    }
  ) {
    await NotificationServices.notifyUsers({
      userIds: [ride.driverId],
      titleEn: "Ride Fully Booked",
      titleFr: "Course Entièrement Réservée",
      messageEn: `The ride ${ride.departureLocation.city} ${ride.departureLocation.region} -> ${ride.destinationLocation.city} ${ride.destinationLocation.region} is fully booked. No more seats available.`,
      messageFr: `Le trajet ${ride.departureLocation.city} ${ride.departureLocation.region} -> ${ride.destinationLocation.city} ${ride.destinationLocation.region} est entièrement réservé. Plus de places disponibles.`,
      rideId: ride.id,
    });
    io.to("public").emit("ride_updated", ride);

    const pendingBookings = await prisma.booking.findMany({
      where: {
        rideId: ride.id,
        status: BookingStatus.PENDING,
      },
      include: { paymentTransaction: true, booker: true, redeemedCoupns: true },
    });

    await Promise.allSettled(
      pendingBookings.map(async (bkg) => {
        if (
          bkg.paymentTransaction &&
          bkg.paymentTransaction.externalReference &&
          (bkg.paymentTransaction.status === TransactionStatus.ONHOLD ||
            bkg.paymentTransaction.status === TransactionStatus.PENDING)
        ) {
          try {
            if (
              bkg.paymentTransaction.paymentProvider === PaymentProvider.STRIPE
            ) {
              await stripe.paymentIntents.cancel(
                bkg.paymentTransaction.externalReference
              );
            }
          } catch (error) {
            console.log(error);
          }
        }
        // Check if booking was paid with coupons and refund them
        // let couponRefundMessage = "";
        if (
          bkg.monitizationType === MonetizationType.COUPON &&
          bkg.redeemedCoupns.length
        ) {
          try {
            await CouponService.refundCoupons(bkg.redeemedCoupns);
          } catch (error) {
            console.error(
              `Error refunding coupons for booking ${bkg.id}:`,
              error
            );
          }
        }

        const cancelledBooking = await prisma.booking.update({
          where: {
            id: bkg.id,
          },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            reason:
              bkg.booker.language === Language.EN
                ? "Automatically cancelled because ride became full."
                : "Annulé automatiquement parce que la course est complète.",
            ...(bkg.paymentTransaction && {
              paymentTransaction: {
                update: {
                  status: TransactionStatus.CANCELLED,
                },
              },
            }),
          },
          include: {
            ride: {
              include: {
                driver: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                    fcm_token: true,
                    averageRating: true,
                    totalRatings: true,
                    profileImage: {
                      select: {
                        url: true,
                      },
                    },
                  },
                },
                vehicle: {
                  select: {
                    id: true,
                    make: true,
                    model: true,
                    color: true,
                    plateNumber: true,
                    defaultImage: {
                      select: {
                        url: true,
                      },
                    },
                  },
                },
                departureLocation: true,
                destinationLocation: true,
                stopovers: true,
                preferences: true,
              },
            },
            paymentTransaction: true,
            booker: true,
            cancelledBy: {
              select: profileSelects,
            },
          },
        });

        // update dashboards with cancelled booking
        await NotificationServices.notifyUsers({
          userIds: [cancelledBooking.userId],
          titleEn: "Booking Cancelled",
          titleFr: "Réservation annulée",
          messageEn: `Your booking for ride ${ride.departureLocation.city} -> ${ride.destinationLocation.city} was automatically cancelled because the ride is full.`,
          messageFr: `Votre réservation pour le trajet ${ride.departureLocation.city} -> ${ride.destinationLocation.city} a été automatiquement annulée parce que le trajet est complet.`,
          rideId: ride.id,
        });
        io.to(`user-${cancelledBooking.userId}`).emit(
          "passenger_booking",
          cancelledBooking
        );
        // notification already dispatched via notifyUser
        io.to(`user-${cancelledBooking.ride.driverId}`).emit(
          "driver_booking",
          cancelledBooking
        );
        // notifyUser already handled preference routing
      })
    );
  }

  static async completeD2dRideReqPayment(params: {
      ride: Ride & {
        departureLocation: Location;
        destinationLocation: Location;
        driver: {
          id: number;
          firstName: string | null;
          email: string;
          phoneNumber: string | null;
          language: Language;
          notificationPref: NotificationPreference;
          fcm_token: string | null;
        };
      };
      session: PaymentSession & {
        d2dBooking: D2DBookingRequest;
      };
      intentId: string;
      redeemedCouponIds?: number[];
      user: {
          id: number;
          firstName: string | null;
          lastName: string | null;
          email: string;
          phoneNumber: string | null;
          language: Language;
          notificationPref: NotificationPreference;
          fcm_token: string | null;
        };
    }) {
      const { ride, session, redeemedCouponIds = [], intentId, user } = params;

      const txn = await prisma.transaction.create({
        data: {
          userId: session.userId,
          rideId: ride.id,
          type: TransactionType.RIDE_BOOKING,
          externalReference: intentId,
          amount: Number(session.totalAmount),
          platformAmount: Number(session.platformAmount),
          driverAmount: Number(session.driverAmount),
          currency: session.currency || getDefaultCurrency(),
          status: TransactionStatus.ONHOLD, // authorized / on-hold
          paymentProvider: session.paymentProvider,
          transactionDate: new Date(),
          transactionId: `cr_trans_${v7()}`,
          discountPct: session.discountPct,
          discount: session.discountAmount,
          couponsUsed: session.couponsToConsume,
        },
      });
      const upd = await prisma.d2DBookingRequest.update({
        where: { id: session.d2dBooking.id },
        data: {
          status: D2DBookingRequestStatus.CONFIRMED,
          confirmedAt: new Date(),
          ride: {
            update: {
              isLocked: true,
              chatThread: {
                update: {
                  users: {
                    connect: {
                      id: session.userId,
                    },
                  },
                },
              },
            },
          },
          bookingSeat: {
            create: {
              attendanceCode: await generateRideBookingAttendenceCode(),
              rideId: session.rideId!,
            },
          },
          // link redeemed coupons (if caller provided redemption ids)
          ...(redeemedCouponIds.length > 0
            ? {
                redeemedCoupns: {
                  connect: redeemedCouponIds.map((id) => ({ id })),
                },
              }
            : {}),
        },
        include: {
          bookingSeat: true,
          ride: {
            include: {
              driver: {
                select: profileSelects,
              },
            },
          },
          dropoffLocation: true,
          pickupLocation: true,
        },
      });
      await prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          status: PaymentSessionStatus.PAYMENT_AUTHORIZED,
        },
      });
      if (upd.bookingSeat) {
       // no email to be sent
      }
  
      await NotificationServices.notifyUsers({
        userIds: [ride!.driverId],
        titleEn: "Payment Confirmed - Ride Locked",
        titleFr: "Paiement confirmé - Trajet verrouillé",
        messageEn: "Passenger payment confirmed. Ride is now locked.",
        messageFr:
          "Paiement du passager confirmé. Le trajet est maintenant verrouillé.",
        rideId: session.rideId || undefined,
        // requestId: session.d2dBooking.id,
        // meta: {
        //   rideId: session.rideId,
        // },
      });
      return {
        d2dRequest: upd,
        transaction: txn,
      };
    }
}
