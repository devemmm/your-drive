import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { DbUser, profileSelects } from "../types";
import { AppError } from "../utils/AppError";
import {
  Booking,
  BookingStatus,
  PaymentProvider,
  Prisma,
  ReviewType,
  RideStatus,
  TransactionStatus,
  UserRole,
} from "@prisma/client";
import { stripe } from "../config/stripe";
import { io } from "../server";
import { NotificationServices } from "../services/notification.service";
import { BookingService } from "../services/booking.service";
import { generateRideBookingAttendenceCode } from "../utils/generateReferralCode";
import { CouponService } from "../services/coupon.service";
import { TransactionService } from "../services/transaction.service";
import { logger, LogLevel } from "../utils/logger";
import { RatingReviewService } from "../services/ratingReview.service";

export class BookingController {
  // GET all bookings controller
  static getAllBookings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        status,
        rideId,
        bookingRelation = "booked_by_me",
      } = matchedData<{
        page: number;
        pageSize: number;
        status?: BookingStatus;
        order?: "asc" | "desc";
        rideId?: number;
        bookingRelation?: "booked_by_me" | "booked_from_my_rides";
      }>(req);

      const isEN = req.isEnglishPreferred;

      const user = req.user! as DbUser;
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      let where: Prisma.BookingWhereInput = {};

      if (user.role === UserRole.USER) {
        if (bookingRelation === "booked_by_me") {
          where.userId = user.id;
        } else {
          where.ride = { driverId: user.id };
        }
      }

      if (status) {
        where.status = status;
      }

      if (rideId) {
        where.rideId = rideId;
      }

      const [bookings, total] = await prisma.$transaction([
        prisma.booking.findMany({
          skip,
          take,
          where,
          include: {
            ride: {
              include: {
                driver: {
                  select: {
                    ...(user.role === UserRole.ADMIN
                      ? {
                          ...profileSelects,
                        }
                      : {
                          id: true,
                          firstName: true,
                        }),
                    averageRating: true,
                    totalRatings: true,
                  },
                },
                vehicle: {
                  select: {
                    id: true,
                    make: true,
                    model: true,
                    color: true,
                    plateNumber: true,
                    capacity: true,
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
            booker: {
              select: {
                ...(user.role === UserRole.ADMIN
                  ? {
                      ...profileSelects,
                    }
                  : {
                      id: true,
                      firstName: true,
                    }),
              },
            },
            paymentTransaction: true,
            cancelledBy: {
              select: {
                ...(user.role === UserRole.ADMIN
                  ? {
                      ...profileSelects,
                    }
                  : {
                      id: true,
                      firstName: true,
                    }),
              },
            },
            ...(bookingRelation === "booked_by_me" &&
              user.role === UserRole.USER && {
                bookingSeats: true,
              }),
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.booking.count({ where }),
      ]);

      // remove driver information if the booking is not approved
      const finalBookings = bookings.map((bkg) => {
        if (
          user.role !== UserRole.ADMIN &&
          bkg.status !== BookingStatus.APPROVED
        ) {
          const { totalRatings, averageRating, id, firstName, ...profile } =
            bkg.ride.driver;
          return {
            ...bkg,
            ride: {
              ...bkg.ride,
              driver: {
                id,
                firstName,
                totalRatings,
                averageRating,
              },
            },
          };
        }
        return bkg;
      });

      return res.status(200).json({
        success: true,
        data: finalBookings,
        pagination: {
          page,
          pageSize: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      });
    }
  );

  /**
   * Get a specific booking by ID
   */
  static getBooking = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { bookingId } = matchedData<{
        bookingId: number;
      }>(req);
      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      const where: Prisma.BookingWhereUniqueInput = {
        id: bookingId,
      };

      if (user.role === UserRole.USER) {
        where.OR = [{ userId: user.id }, { ride: { driverId: user.id } }];
      }

      const booking = await prisma.booking.findUnique({
        where,
        include: {
          ride: {
            include: {
              driver: {
                select: {
                  id: true,
                  firstName: true,
                  averageRating: true,
                  totalRatings: true,
                  // lastName: true,
                  // email: true,
                  // phoneNumber: true,
                  // profileImage: {
                  //   select: {
                  //     url: true,
                  //   },
                  // },
                },
              },
              vehicle: {
                select: {
                  id: true,
                  make: true,
                  model: true,
                  color: true,
                  capacity: true,
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
          cancelledBy: {
            select: {
              id: true,
              firstName: true,
            },
          },
          booker: {
            select: {
              id: true,
              firstName: true,
            },
          },
          bookingSeats: {
            where: {
              booking: {
                userId: user.id,
              },
            },
          },
        },
      });

      if (!booking) {
        return next(
          AppError(isEN ? "Booking not found" : "Réservation non trouvée", 404)
        );
      }

      const { totalRatings, averageRating, id, firstName, ...profile } =
        booking.ride.driver;

      return res.status(200).json({
        success: true,
        data: {
          ...booking,
          ride: {
            ...booking.ride,
            driver: {
              // ...(booking.status === BookingStatus.APPROVED && {
              //   ...profile,
              // }),
              id,
              firstName,
              totalRatings,
              averageRating,
            },
          },
        },
      });
    }
  );

  /**
   * Approve booking
   */
  static approveBooking = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { bookingId } = matchedData<{ bookingId: number }>(req, {
        locations: ["params"],
      });
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId, ride: { isDeleted: false } },
        include: {
          ride: {
            include: {
              departureLocation: true,
              destinationLocation: true,
              chatThread: {
                include: {
                  users: true,
                  owner: {
                    select: {
                      id: true,
                      firstName: true,
                      // lastName: true,
                      // email: true,
                      // profileImage: {
                      //   select: {
                      //     url: true,
                      //   },
                      // },
                    },
                  },
                },
              },
            },
          },
          paymentTransaction: true,
          booker: true,
          cancelledBy: {
            select: {
              id: true,
              firstName: true,
            },
          },
        },
      });

      if (!booking) {
        return next(
          AppError(isEN ? "Booking not found" : "Réservation non trouvée", 404)
        );
      }

      // Check if user is the driver
      if (booking.ride.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to approve this booking"
              : "Vous n'êtes pas autorisé à approuver cette réservation",
            403
          )
        );
      }

      if (booking.ride.isBlocked) {
        return next(
          AppError(
            isEN
              ? "Ride is blocked, contact support"
              : "La trajet est bloquée, contactez le support"
          )
        );
      }

      // check if the start time has not passed
      if (booking.ride.departureTime <= new Date()) {
        return next(
          AppError(
            isEN
              ? "Ride's departure time has already passed, approving the booking is not possible."
              : "L'heure de départ du trajet est déjà passée, il n'est pas possible d'approuver la réservation."
          )
        );
      }

      // Check if booking is already in a final state
      if (booking.status !== BookingStatus.PENDING) {
        return next(
          AppError(
            isEN
              ? "Cannot approve booking that is not pending."
              : "Ne peut pas approuver une réservation qui n'est pas en attente.",
            400
          )
        );
      }
      // Check if there are enough available seats
      if (booking.ride.availableSeats < booking.seats) {
        return next(
          AppError(
            isEN
              ? "Not enough available seats for this booking"
              : "Pas assez de places disponibles pour cette réservation",
            400
          )
        );
      }
      // If the associated transaction is on hold, capture it
      if (
        booking.paymentTransaction?.status == TransactionStatus.ONHOLD &&
        booking.paymentTransaction.paymentProvider == PaymentProvider.STRIPE &&
        booking.paymentTransaction.externalReference &&
        booking.paymentTransaction.driverAmount === 0
      ) {
        await stripe.paymentIntents.capture(
          booking.paymentTransaction.externalReference
        );
      }
      const updBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.APPROVED,
          ride: {
            update: {
              availableSeats: {
                decrement: booking.seats,
              },
            },
          },
          bookingSeats: {
            create: await Promise.all(
              Array.from({ length: booking.seats }).map(async () => ({
                attendanceCode: await generateRideBookingAttendenceCode(),
                rideId: booking.rideId,
              }))
            ),
          },
        },
        include: {
          ride: {
            include: {
              driver: {
                select: {
                  id: true,
                  firstName: true,
                  // lastName: true,
                  // email: true,
                  // phoneNumber: true,
                  // fcm_token: true,
                  // averageRating: true,
                  // totalRatings: true,
                  // profileImage: {
                  //   select: {
                  //     url: true,
                  //   },
                  // },
                },
              },
              vehicle: {
                select: {
                  id: true,
                  make: true,
                  model: true,
                  color: true,
                  plateNumber: true,
                  capacity: true,
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
          cancelledBy: {
            select: {
              id: true,
              firstName: true,
            },
          },
          bookingSeats: true,
          booker: true,
        },
      });

    

      // Add passenger to chatThread users if chatThread exists
      if (
        booking.ride.chatThread &&
        !booking.ride.chatThread.users.find((us) => us.id === booking.userId)
      ) {
        await prisma.chatThread.update({
          where: { id: booking.ride.chatThread.id },
          data: {
            users: {
              connect: {
                id: booking.userId,
              },
            },
          },
        });
      }

      // cancel all pending bookings and refund the approprietely
      if (updBooking.ride && updBooking.ride.availableSeats <= 0) {
        await BookingService.handleFullBooking(updBooking.ride);
      }

      // notify the booker and send real time update of the booking to automatically update the frontend
      await NotificationServices.notifyUsers({
        userIds: [booking.userId],
        titleEn: "Booking Approved",
        titleFr: "Réservation approuvée",
        messageEn: `Your booking for ride from ${booking.ride.departureLocation.city} to ${booking.ride?.destinationLocation.city} has been approved.`,
        messageFr: `Votre réservation pour le trajet de ${booking.ride.departureLocation.city} à ${booking.ride?.destinationLocation.city} a été approuvée.`,
      });
      io.to(`user-${booking.userId}`).emit("passenger_booking", updBooking);

      // Real-time update already emitted; notifyUser handled preference routing

      const approveLogData = {
        level: LogLevel.INFO,
        message: isEN
          ? `Booking approved successfully.`
          : `Réservation approuvée avec succès.`,
        action: "approveBooking",
        userId: booking.userId,
        meta: {
          bookingId: booking.id,
          rideId: booking.ride.id,
          transactionId: booking.paymentTransaction?.id,
          seats: booking.seats,
          availableSeats: updBooking.ride.availableSeats,
        },
      };

      logger.info(approveLogData.message, {
        action: approveLogData.action,
        userId: approveLogData.userId,
        meta: approveLogData.meta,
      });

      return res.status(200).json({
        success: true,
        data: updBooking,
        message: isEN
          ? `Booking successfully approved.`
          : "Réservation approuvée avec succès.",
      });
    }
  );

  /**
   * Update booking status (decline/cancel)
   */
  static updateBooking = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { status, reason, bookingId } = matchedData<{
        status: BookingStatus;
        reason: string;
        bookingId: number;
      }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId, ride: { isDeleted: false } },
        include: {
          ride: {
            include: {
              departureLocation: true,
              destinationLocation: true,
            },
          },
          paymentTransaction: true,
          booker: true,
          cancelledBy: {
            select: profileSelects,
          },
          redeemedCoupns: true,
        },
      });

      if (!booking) {
        return next(
          AppError(isEN ? "Booking not found" : "Réservation non trouvée", 404)
        );
      }

      // Check if user is the driver
      if (booking.ride.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to update this booking"
              : "Vous n'êtes pas autorisé à mettre à jour cette réservation",
            403
          )
        );
      }

      if (booking.ride.isBlocked) {
        return next(
          AppError(
            isEN
              ? "Ride is blocked, contact support"
              : "La trajet est bloquée, contactez le support"
          )
        );
      }

      let updBooking: Booking | null = null;
      // const isBookerEn = booking.booker?.language === Language.EN;
      let message = isEN
        ? `Booking successfully updated.`
        : "Réservation mise à jour avec succès.";

      switch (status) {
        case BookingStatus.DECLINED: {
          // Check if booking is already in a final state
          if (booking.status !== BookingStatus.PENDING) {
            return next(
              AppError(
                isEN
                  ? "Cannot decline booking that is not pending"
                  : "Ne peut pas annuler une réservation qui n'est pas en attente",
                400
              )
            );
          }
          // the associated transaction is on hold, cancel it
          const transaction = booking.paymentTransaction;
          if (
            transaction &&
            transaction.status == TransactionStatus.ONHOLD &&
            transaction.paymentProvider == PaymentProvider.STRIPE &&
            transaction.externalReference
          ) {
            await stripe.paymentIntents.cancel(transaction.externalReference);
          }
          updBooking = await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.DECLINED,
              reason,
              ...(transaction && {
                paymentTransaction: {
                  update: {
                    status: TransactionStatus.CANCELLED,
                    // clientSecret: null,
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
              cancelledBy: {
                select: profileSelects,
              },
            },
          });

          // notify the booker and send real time update of the booking to automatically update the frontend
          await NotificationServices.notifyUsers({
            userIds: [booking.userId],
            titleEn: "Booking Declined",
            titleFr: "Réservation refusée",
            messageEn: `Your booking for ride from ${
              booking.ride.departureLocation.city
            } ${booking.ride.departureLocation.regionCode ?? ""} to ${
              booking.ride?.destinationLocation.city
            } ${
              booking.ride?.destinationLocation.regionCode ?? ""
            } has been declined.`,
            messageFr: `Votre réservation pour le trajet de ${
              booking.ride.departureLocation.city
            } ${booking.ride.departureLocation.regionCode || ""} à ${
              booking.ride?.destinationLocation.city
            } ${
              booking.ride?.destinationLocation.regionCode || ""
            } a été refusée.`,
          });
          io.to(`user-${booking.userId}`).emit("passenger_booking", updBooking);

          message = isEN
            ? `Booking successfully declined.`
            : "Réservation refusée avec succès.";

          break;
        }
        case BookingStatus.CANCELLED: {
          if (booking.status !== BookingStatus.APPROVED) {
            return next(
              AppError(
                isEN
                  ? "Booking cannot be cancelled"
                  : "La réservation ne peut pas être annulée",
                400
              )
            );
          }

          if (booking.ride.status !== RideStatus.PUBLISHED) {
          return next(
            AppError(
              isEN
                ? "The ride should be in published state in order to cancel the booking"
                : "Le trajet doit être dans un état publié pour pouvoir annuler la réservation",
              400
            )
          );
        }

          updBooking = await prisma.$transaction(async (tx) => {
            // Full refund (contribution + booking fee)
            const txn = booking.paymentTransaction;

            if (
              txn &&
              txn.externalReference &&
              txn.status === TransactionStatus.PAID
            ) {
              await stripe.refunds.create({
                payment_intent: txn.externalReference,
              });

              await tx.transaction.update({
                where: { id: txn.id },
                data: {
                  refundedAmount: txn.amount,
                  status: TransactionStatus.REFUNDED,
                  isRefunded: true,
                  refundedAt: new Date(),
                },
              });
            } else if (
              txn &&
              txn.externalReference &&
              txn.status === TransactionStatus.ONHOLD
            ) {
              await stripe.paymentIntents.cancel(txn.externalReference);

              await tx.transaction.update({
                where: { id: txn.id },
                data: {
                  status: TransactionStatus.CANCELLED,
                },
              });
            }

            await tx.ride.update({
              where: { id: booking.rideId },
              data: {
                availableSeats: {
                  increment: booking.seats || 1,
                },
              },
            });

            const updated = await tx.booking.update({
              where: { id: booking.id },
              data: {
                status: BookingStatus.CANCELLED,
                cancelledAt: new Date(),
                cancellerId: user.id,
                reason,
                bookingSeats: {
                  updateMany: {
                    where: { bookingId: booking.id, isExpired: false },
                    data: {
                      isExpired: true,
                      expireReason: "Booking Cancelled by Driver | Réservation annulée par le conducteur",
                      expiredAt: new Date(),
                    },
                  },
                },
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
                cancelledBy: {
                  select: profileSelects,
                },
              },
            });

            return updated;
          });

          // record cancellation review
          await RatingReviewService.createRatingReview(
            booking.ride.driverId,
            updBooking.rideId,
            1, // minimum for cancellation
            "Driver cancelled the booking",
            undefined,
            ReviewType.CANCELLATION
          );

          // Notify the booker
          await NotificationServices.notifyUsers({
            userIds: [booking.userId],
            titleEn: "Booking Cancelled",
            titleFr: "Réservation annulée",
            messageEn: `Your booking for ride from ${booking.ride.departureLocation.city} to ${booking.ride?.destinationLocation.city} was cancelled.`,
            messageFr: `Votre réservation pour le trajet de ${booking.ride.departureLocation.city} à ${booking.ride?.destinationLocation.city} a été annulée.`,
          });
          io.to(`user-${booking.userId}`).emit("passenger_booking", updBooking);

          message = isEN
            ? "Passenger's booking has been cancelled"
            : "La réservation du passager a été annulée";
          break;
        }

        default:
          throw AppError(
            isEN
              ? "Unsupported booking status."
              : "Statut de réservation non pris en charge."
          );
      }

      // refund the coupons if applicable
      if (
        booking.redeemedCoupns.length
      ) {
        await CouponService.refundCoupons(booking.redeemedCoupns);
      }

      const updateLogData = {
        level: LogLevel.INFO,
        message: isEN
          ? `Booking updated successfully.`
          : "Réservation mise à jour avec succès.",
        action: "updateBooking",
        userId: booking.userId,
        meta: {
          bookingId: booking.id,
          rideId: booking.ride.id,
          status,
          reason,
          transactionId: booking.paymentTransaction?.id,
        },
      };

      logger.info(updateLogData.message, {
        action: updateLogData.action,
        userId: updateLogData.userId,
        meta: updateLogData.meta,
      });

      return res.status(200).json({
        success: true,
        data: updBooking,
        message,
      });
    }
  );

  /**
   * Cancel a booking by a passenger
   */
  static cancelBooking = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { bookingId, reason } = matchedData<{
        bookingId: number;
        reason: string;
      }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      try {
        const existing = await prisma.booking.findUnique({
          where: { id: bookingId, ride: { isDeleted: false } },
          include: {
            ride: { include: { driver: true } },
            paymentTransaction: true,
            cancelledBy: { select: profileSelects },
          },
        });

        if (!existing) {
          return next(
            AppError(
              isEN ? "Booking not found" : "Réservation non trouvée",
              404
            )
          );
        }

        const isPassenger = existing.userId === user.id;
        if (!isPassenger) {
          return next(
            AppError(
              isEN
                ? "You are not authorized to cancel this booking"
                : "Vous n'êtes pas autorisé à annuler cette réservation",
              403
            )
          );
        }

        if (
          existing.status === BookingStatus.DECLINED ||
          existing.status === BookingStatus.CANCELLED
        ) {
          return next(
            AppError(
              isEN
                ? "This booking is already cancelled"
                : "Cette réservation est déjà annulée",
              400
            )
          );
        }

        if (existing.ride.status !== RideStatus.PUBLISHED) {
          return next(
            AppError(
              isEN
                ? "The ride should be in published state in order to cancel the booking"
                : "Le trajet doit être dans un état publié pour pouvoir annuler la réservation",
              400
            )
          );
        }

        const now = new Date();
        const depTime = existing.ride.departureTime;
        const hoursBefore = (depTime.getTime() - now.getTime()) / 3600000;

        const updatedBooking = await prisma.$transaction(async (tx) => {
          let refundAmount = 0;
          let platformAmount = existing.paymentTransaction?.platformAmount || 0;
          let driverAmount = existing.paymentTransaction?.driverAmount || 0;
          // let reversal: Stripe.TransferReversal|undefined = undefined;

          // Refund Logic
          const txn = existing.paymentTransaction;
          if (
            txn &&
            txn.externalReference &&
            txn.status === TransactionStatus.PAID
          ) {
            if (hoursBefore >= 24 || existing.status === BookingStatus.PENDING) {
              refundAmount = txn.driverAmount * 100; // Full ride contribution only
            } else if (hoursBefore >= 2) {
              refundAmount = txn.driverAmount * 0.5 * 100; // 50% contribution
            }

            if (refundAmount > 0) {
              await stripe.refunds.create({
                payment_intent: txn.externalReference,
                amount: Math.round(refundAmount),
                metadata: {
                  reason: "Booking cancelled by the customer/owner",
                },
              });

              await tx.transaction.update({
                where: { id: txn.id },
                data: {
                  refundedAmount: refundAmount / 100,
                  status:
                    refundAmount === txn.amount
                      ? TransactionStatus.REFUNDED
                      : TransactionStatus.PARTIALLY_REFUNDED,
                  isRefunded: true,
                  refundedAt: new Date(),
                },
              });
            }
          } else if (
            txn &&
            txn.externalReference &&
            txn.status === TransactionStatus.ONHOLD
          ) {
            if (existing.status === BookingStatus.PENDING) {
              await stripe.paymentIntents.cancel(txn.externalReference);
            } else {
              let captureAmount = 0;
              if (hoursBefore >= 24) {
                captureAmount = txn.platformAmount * 100; // refund Full ride contribution only, means we capture booking fee only
                driverAmount = 0;
              } else if (hoursBefore >= 2) {
                const da = txn.driverAmount * 0.5;
                const pa = txn.platformAmount;
                captureAmount = Math.ceil((da + pa) * 100); // 50% contribution + booking fee
                platformAmount = pa;
                driverAmount = da;
              }

              if (captureAmount > 0) {
                const intent = await stripe.paymentIntents.retrieve(
                  txn.externalReference
                );
                const captured = await stripe.paymentIntents.capture(txn.externalReference, {
                  amount_to_capture: Math.ceil(captureAmount),
                  metadata: {
                    ...intent.metadata, // keep old metadata
                    platformAmount: platformAmount.toFixed(2),
                    driverAmount: driverAmount.toFixed(2),
                  },
                });
                
                const capturedAmountDollars = captureAmount / 100;
                const refundedAmount = txn.amount - capturedAmountDollars;
                
                await tx.transaction.update({
                  where: { id: txn.id },
                  data: {
                    refundedAmount,
                    status:
                      refundedAmount === txn.amount
                        ? TransactionStatus.REFUNDED
                        : TransactionStatus.PARTIALLY_REFUNDED,
                    isRefunded: true,
                    refundedAt: new Date(),
                  },
                });

                // Process driver payout and send receipt after partial capture
                // This needs to happen outside the transaction to avoid deadlocks
                const chargeId = typeof captured.latest_charge === "string" 
                  ? captured.latest_charge 
                  : captured.latest_charge?.id ?? null;
                
                // Load ride with driver and locations for payout processing
                const rideForPayout = await prisma.ride.findUnique({
                  where: { id: existing.rideId },
                  include: {
                    driver: true,
                    departureLocation: true,
                    destinationLocation: true,
                  },
                });

                if (rideForPayout && driverAmount > 0) {
                  // Reload transaction with relations
                  const txnWithRelations = await prisma.transaction.findUnique({
                    where: { id: txn.id },
                    include: {
                      user: true,
                      booking: true,
                      d2dBookingReq: true,
                    },
                  });

                  if (txnWithRelations) {
                    await TransactionService.processPartialCapturePayoutAndReceipt({
                      txn: txnWithRelations,
                      ride: rideForPayout,
                      capturedAmount: capturedAmountDollars,
                      driverAmount,
                      platformAmount,
                      paymentIntentId: txn.externalReference,
                      chargeId: chargeId ?? undefined,
                    });
                  }
                }
              }
            }
          }

          // Restore seats if already approved
          if (existing.status === BookingStatus.APPROVED) {
            await tx.ride.update({
              where: { id: existing.rideId },
              data: {
                availableSeats: {
                  increment: existing.seats || 1,
                },
              },
            });
          }

          // Update booking status
          const updated = await tx.booking.update({
            where: { id: Number(bookingId) },
            data: {
              status: BookingStatus.CANCELLED,
              cancelledAt: new Date(),
              cancellerId: user.id,
              reason,
              bookingSeats: {
                updateMany: {
                  where: { bookingId: existing.id, isExpired: false },
                  data: {
                    isExpired: true,
                    expireReason: "Booking Cancelled by Passenger",
                    expiredAt: new Date(),
                  },
                },
              },
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
              cancelledBy: {
                select: profileSelects,
              },
            },
          });

          return updated;
        });

        io.to(`user-${updatedBooking.ride.driverId}`).emit(
          "driver_booking",
          updatedBooking
        );
        await NotificationServices.notifyUsers({
          userIds: [updatedBooking.ride.driverId],
          titleEn: "Booking Cancelled",
          titleFr: "Réservation annulée",
          messageEn: `${user.firstName} cancelled their booking.`,
          messageFr: `${user.firstName} a annulé sa réservation.`,
          // data: updatedBooking,
        });

        // Log success with transaction details, refunded amount, and reason for cancellation
        const logData = {
          level: LogLevel.INFO,
          action: "cancelBooking",
          message: isEN
            ? "Booking cancelled successfully."
            : "Réservation annulée avec succès.",
          userId: user.id,
          meta: {
            bookingId: existing.id,
            rideId: existing.ride.id,
            transactionId: existing.paymentTransaction?.id,
            refundedAmount: existing.paymentTransaction?.refundedAmount || 0,
            reason,
          },
        };

        logger.info(logData.message, {
          action: logData.action,
          userId: logData.userId,
          meta: logData.meta,
        });

        return res.status(200).json({
          success: true,
          data: updatedBooking,
          message: isEN
            ? "Booking cancelled successfully"
            : "Réservation annulée avec succès",
        });
      } catch (err: any) {
        // Log errors with transaction details, refunded amount, and reason
        const logError = {
          level: LogLevel.ERROR,
          action: "cancelBooking",
          message: isEN
            ? "Failed to cancel booking"
            : "Échec de l'annulation de la réservation",
          userId: user.id,
          meta: {
            error: err.message,
            bookingId: bookingId,
            reason: "An error occurred during booking cancellation process.", // Reason for failure
          },
        };

        logger.error(logError.message, {
          action: logError.action,
          userId: logError.userId,
          meta: logError.meta,
        });

        return next(AppError(logError.message, 500));
      }
    }
  );
}
