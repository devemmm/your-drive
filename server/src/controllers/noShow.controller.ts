import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { NoShowService } from "../services/noShow.service";
import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import moment from "moment";
import {
  Booking,
  BookingStatus,
  D2DBookingRequest,
  D2DBookingRequestStatus,
  Location,
  NoShow,
  NoShowStatus,
  RedeemedCoupon,
  ReviewType,
  Ride,
  RideStatus,
  Transaction,
  User,
} from "@prisma/client";
import { profileSelects } from "../types/index";
import { logger, LogLevel } from "../utils/logger";
import { NotificationServices } from "../services/notification.service";

export class NoShowController {
  static reportNoShow = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      try {
        // check if it admin
        const user = req.user!;
        if (user.role === "ADMIN") {
          return next(
            AppError(
              isEN
                ? "Admins cannot report no-shows."
                : "Les administrateurs ne peuvent pas signaler de non-présentation(no-show).",
              403
            )
          );
        }
        const { rideId, userId, reason, reporterType } = matchedData<{
          rideId: number;
          userId: number;
          reason: string;
          reporterType: "DRIVER" | "PASSENGER";
        }>(req, { locations: ["body"] });
        const reportedById = req.user!.id;

        // check if the reporter is not reporting himself
        if (userId === reportedById) {
          return next(
            AppError(
              isEN
                ? "You cannot report yourself for no-show."
                : "Vous ne pouvez pas vous signaler vous-même pour un non-présentation(no-show).",
              400
            )
          );
        }

        const ride = await prisma.ride.findUnique({
          where: { id: rideId, isDeleted: false },
          include: {
            noShows: {
              where: {
                rideId,
                userId,
                reportedById,
              },
            },
            bookings: {
              where: {
                status: BookingStatus.APPROVED,
              },
            },
            d2dBookingRequests: {
              where: {
                status: D2DBookingRequestStatus.CONFIRMED,
              },
            }
          },
        });

        if (!ride) {
          return next(
            AppError(isEN ? "Ride not found." : "Trajet non trouvé.", 404)
          );
        }

        // check if the reporter is part of the ride
        // 1. if reporter is driver, check if he is the driver of the ride
        if (reporterType === "DRIVER") {
          if (ride.driverId !== reportedById) {
            return next(
              AppError(
                isEN
                  ? "You are not the driver of this ride."
                  : "Vous n'êtes pas le conducteur de ce trajet.",
                403
              )
            );
          }
        } else {
          // 2. if reporter is passenger, check if he has an approved booking for the ride
          const isThereAnApprovedBooking = ride.type === "P2P" ? ride.bookings.some(bk => bk.userId === reportedById) : ride.d2dBookingRequests.some(dr => dr.passengerId === reportedById);
          if (!isThereAnApprovedBooking) {
            return next(
              AppError(
                isEN
                  ? "You cannot report no-show for a ride you are not part of."
                  : "Vous ne pouvez pas signaler de non-présentation(no-show) pour un trajet dont vous ne faites pas partie.",
                403
              )
            );
          }

          // 3 check if the reported user is the driver of the ride
          if (ride.driverId !== userId) {
            return next(
              AppError(
                isEN
                  ? "The reported user is not the driver of this ride."
                  : "L'utilisateur signalé n'est pas le conducteur de ce trajet.",
                400
              )
            );
          }
        }

        // check if the ride is not yet departed
        const now = new Date();
        if (ride.departureTime > now) {
          return next(
            AppError(
              isEN
                ? "Cannot report no-show for a ride that it's departure time has not yet passed."
                : "Impossible de signaler un non-présentation(no-show) pour un trajet dont l'heure de départ n'est pas encore passée.",
              400
            )
          );
        }

        // check the right status of the ride for reporting no-show
        if (
          !(
            ride.status === RideStatus.PUBLISHED ||
            ride.status === RideStatus.ONGOING ||
            ride.status === RideStatus.COMPLETED
          )
        ) {
          return next(
            AppError(
              isEN
                ? "Cannot report no-show for a ride that is not in PUBLISHED, ONGOING, or COMPLETED status."
                : "Impossible de signaler un non-présentation(no-show) pour un trajet qui n'est pas dans les statuts PUBLIÉ, EN COURS ou TERMINÉ.",
              400
            )
          );
        }

        // check if it is still within 24 hours from completion of the ride
        let completionTime = ride.completedAt;
        if (!completionTime) {
          completionTime = ride.estimatedArrivalTime;
        }
        const twentyFourHoursLater = moment(completionTime)
          .add(24, "hours")
          .toDate();
        if (now > twentyFourHoursLater) {
          return next(
            AppError(
              isEN
                ? "Cannot report no-show after 24 hours of ride completion."
                : "Impossible de signaler un non-présentation(no-show) après 24 heures de la fin du trajet.",
              400
            )
          );
        }

        // check if the user has already been reported for no-show for this ride by the same reporter
        if (ride.noShows && ride.noShows.length > 0) {
          return next(
            AppError(
              isEN
                ? "You have already reported this user for no-show for this ride."
                : "Vous avez déjà signalé cet utilisateur pour no-show pour ce trajet.",
              400
            )
          );
        }

        const noShow = await prisma.noShow.create({
          data: {
            rideId,
            userId,
            reportedById,
            reason,
            reportType:
              ride.driverId === userId
                ? "PASSENGER_REPORTED_DRIVER"
                : "DRIVER_REPORTED_PASSENGER",
          },
          include: {
            user: {
              select: profileSelects,
            },
            reportedBy: {
              select: profileSelects,
            },
            ride: {
              include: {
                departureLocation: true,
                destinationLocation: true,
              },
            },
          },
        });

        // update the bookings or d2d booking requests as disputed and their respective transactions
        if (ride.driverId === userId) {
          if (ride.type === "P2P") {
            await Promise.allSettled(
              ride.bookings.map(async (bk) => {

                await prisma.booking.update({
                  where: {
                    id: bk.id,
                  },
                  data: {
                    status: BookingStatus.DISPUTED,
                    disputedAt: new Date(),
                    paymentTransaction: {
                      update: {
                        disputedAt: new Date(),
                      }
                    }
                  }
                })
              })
            )
          } else {
            await Promise.allSettled(
              ride.d2dBookingRequests.map(async (dr) => {

                await prisma.d2DBookingRequest.update({
                  where: {
                    id: dr.id,
                  },
                  data: {
                    status: BookingStatus.DISPUTED,
                    disputedAt: new Date(),
                    transaction: {
                      update: {
                        disputedAt: new Date(),
                      }
                    }
                  }
                })
              })
            )
          }
        } else {
          if (ride.type === "P2P") {
            await Promise.allSettled(
              ride.bookings.filter(bkg => bkg.userId === userId).map(async (bk) => {

                await prisma.booking.update({
                  where: {
                    id: bk.id,
                  },
                  data: {
                    status: BookingStatus.DISPUTED,
                    disputedAt: new Date(),
                    paymentTransaction: {
                      update: {
                        disputedAt: new Date(),
                      }
                    }
                  }
                })
              })
            )
          } else {
            await Promise.allSettled(
              ride.d2dBookingRequests.filter(drst => drst.passengerId === userId).map(async (dr) => {

                await prisma.d2DBookingRequest.update({
                  where: {
                    id: dr.id,
                  },
                  data: {
                    status: BookingStatus.DISPUTED,
                    disputedAt: new Date(),
                    transaction: {
                      update: {
                        disputedAt: new Date(),
                      }
                    }
                  }
                })
              })
            )
          }
        }

        // notify the admins abount the no-show report to be reviewed
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN", isDeleted: false },
          select: {
            id: true,
          }
        });
        const adminIds = admins.map(us => us.id);
        if (adminIds.length > 0) {
          await NotificationServices.notifyUsers({
            userIds: adminIds,
            titleEn: "No-Show Reported",
            titleFr: "Non-Présentation(No-Show) Signalé",
            messageEn: `A no-show has been reported for ride ID ${rideId}. Please review the report.`,
            messageFr: `Un non-présentation(no-show) a été signalé pour le trajet ID ${rideId}. Veuillez examiner le rapport.`,
            rideId: ride.id,
          });
        }
        const reportLogData = {
          Level: LogLevel.INFO,
          message: `No-show reported for the ride of ID ${rideId} | Non-Présentation(No-show) signalé pour le trajet d'ID ${rideId}`,
          action: "REPORT_NO_SHOW",
          userId: user.id,
          rideId: rideId,
          meta: {
            userId: userId,
            rideId: rideId,
            noShowId: noShow.id,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            date: new Date().toISOString(),
          }
        }

        logger.warn(reportLogData.message, {
          action: reportLogData.action,
          userId: reportLogData.userId,
          rideId: reportLogData.rideId,
          meta: reportLogData.meta,
        });

        return res.status(201).json({
          status: true,
          message: isEN
            ? "No-show reported successfully."
            : "No-show signalé avec succès.",
          data: noShow,
        });
      } catch (error) {
        return next(
          AppError(
            isEN
              ? "Failed to report no-show."
              : "Échec du signalement du non-présentation(no-show).",
            500
          )
        );
      }
    }
  );

  static getNoShows = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { userId } = matchedData<{ userId: number }>(req, {
        locations: ["params"],
      });

      const noShows = await prisma.noShow.findMany({
        where: {
          userId: userId,
        },
        include: {
          user: {
            select: profileSelects,
          },
          reportedBy: {
            select: profileSelects,
          },
          ride: {
            include: {
              departureLocation: true,
              destinationLocation: true,
            },
          },
        },
      });
      return res.status(200).json({
        status: true,
        message: isEN
          ? "No-shows retrieved successfully."
          : "Non-Présentations(No-shows) récupérés avec succès.",
        data: noShows,
      });
    }
  );

  static getNoShowsByRides = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rideId } = matchedData<{ rideId: number }>(req, {
        locations: ["params"],
      });
      const isEN = req.isEnglishPreferred;

      const noShows = await prisma.noShow.findMany({
        where: {
          rideId: rideId,
        },
        include: {
          user: {
            select: profileSelects,
          },
          reportedBy: {
            select: profileSelects,
          },
          ride: {
            include: {
              departureLocation: true,
              destinationLocation: true,
            },
          },
        },
      });
      return res.status(200).json({
        status: true,
        message: isEN
          ? "No-shows retrieved successfully."
          : "Non-Présentations(No-shows) récupérés avec succès.",
        data: noShows,
      });
    }
  );

  static getAllNoShows = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { page = 1, pageSize = 10 } = matchedData<{
        page?: number;
        pageSize?: number;
      }>(req, { locations: ["query"] });

      const [noShows, total] = await prisma.$transaction([
        prisma.noShow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: "desc" }],
          include: {
            user: {
              select: profileSelects,
            },
            reportedBy: {
              select: profileSelects,
            },
            ride: {
              include: {
                departureLocation: true,
                destinationLocation: true,
              },
            },
          },
        }),
        prisma.noShow.count(),
      ]);
      return res.status(200).json({
        status: true,
        message: isEN
          ? "No-shows retrieved successfully."
          : "Non-Présentations(No-shows) récupérés avec succès.",
        data: noShows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }
  );

  static getNoShowStatistics = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const stats = await NoShowService.getNoShowStats();

      return res.status(200).json({
        status: true,
        message: isEN
          ? "No-show statistics retrieved successfully."
          : "Statistiques de non-présentation(no-show) récupérées avec succès.",
        data: stats,
      });
    }
  );

  static confirmNoShow = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { id, reviewNotes } = matchedData<{
        id: number;
        reviewNotes?: string;
      }>(req);

      const noShow = await prisma.noShow.findUnique({
        where: { id },
        include: {
          ride: {
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
                where: { status: BookingStatus.APPROVED },
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
                where: { status: D2DBookingRequestStatus.CONFIRMED },
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
          },
        },
      });

      if (!noShow) {
        return next(
          AppError(
            isEN ? "No-show not found." : "Non-Présentation(No-show) introuvable.",
            404
          )
        );
      }

      if (noShow.status !== NoShowStatus.PENDING) {
        return next(
          AppError(
            isEN
              ? "This no-show has already been reviewed."
              : "Ce non-présentation(no-show) a déjà été examiné.",
            400
          )
        );
      }

      const updated = await prisma.noShow.update({
        where: { id },
        data: {
          status: NoShowStatus.CONFIRMED,
          reviewNotes,
          resolvedAt: new Date(),
        },
        include: {
          user: {
            select: profileSelects,
          },
          reportedBy: {
            select: profileSelects,
          },
          ride: {
            include: {
              departureLocation: true,
              destinationLocation: true,
            },
          },
        },
      });

      const isDriverNoShow = noShow.userId === noShow.ride.driverId;

      if (isDriverNoShow) {
        await NoShowService.resolveDriverNoShow(noShow as NoShow & {
          ride: Ride & {
            driver: User;
            departureLocation: Location;
            destinationLocation: Location;
            bookings: (Booking & {
              paymentTransaction: Transaction | null;
              redeemedCoupns: RedeemedCoupon[];
            })[];
            d2dBookingRequests: (D2DBookingRequest & {
              transaction: Transaction | null;
              redeemedCoupns: RedeemedCoupon[];
            })[];
          };
        });
      } else {
        await NoShowService.resolvePassengerNoShow(noShow as NoShow & {
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
        });
      }

      // notify the reporter about the confirmation of the no-show report
      await NotificationServices.notifyUsers({
        userIds: [noShow.reportedById],
        titleEn: "No-Show Report Confirmed",
        titleFr: "Rapport de Non-Présentation Confirmé",
        messageEn: `Your no-show report for ride ${updated.ride.departureLocation.city} to ${updated.ride.destinationLocation.city} has been confirmed.`,
        messageFr: `Votre rapport de non-présentation(no-show) pour le trajet de ${updated.ride.departureLocation.city} à ${updated.ride.destinationLocation.city} a été confirmé.`,
        rideId: noShow.rideId,
      });

      const getNoShowConfirmLogData = {
        Level: LogLevel.INFO,
        message: isEN ? "No-show confirmed" : "Non-Présentation(No-show) confirmé",
        action: "CONFIRM_NO_SHOW",
        userId: req.user?.id,
        meta: {
          userId: req.user?.id,
          noShowId: updated.id,
          date: new Date().toISOString(),
        },
      };
      logger.info(getNoShowConfirmLogData.message, {
        action: getNoShowConfirmLogData.action,
        userId: getNoShowConfirmLogData.userId,
        meta: getNoShowConfirmLogData.meta,
      });

      return res.status(200).json({
        status: true,
        message: isEN ? "No-show confirmed." : "Non-Présentation(No-show) confirmé.",
        data: updated,
      });
    }
  );


  static rejectNoShow = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { id, reviewNotes } = matchedData<{
        id: number;
        reviewNotes?: string;
      }>(req);

      const noShow = await prisma.noShow.findUnique({ where: { id } });
      if (!noShow) {
        return next(
          AppError(isEN ? "No-show not found." : "Non-Présentation(No-show) introuvable.", 404)
        );
      }

      if (noShow.status !== "PENDING") {
        return next(
          AppError(
            isEN
              ? "This no-show has already been reviewed."
              : "Ce non-présentation(no-show) a déjà été examiné.",
            400
          )
        );
      }

      const updated = await prisma.noShow.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewNotes,
          resolvedAt: new Date(),
        },
        include: {
          user: {
            select: profileSelects,
          },
          reportedBy: {
            select: profileSelects,
          },
          ride: {
            include: {
              departureLocation: true,
              destinationLocation: true,
              bookings: {
                where: {
                  status: BookingStatus.DISPUTED,
                }
              },
              d2dBookingRequests: {
                where: {
                  status: D2DBookingRequestStatus.DISPUTED,
                }
              }
            },
          },
        },
      });

      // update the bookings or d2d booking requests as disputed and their respective transactions
      const ride = updated.ride;
      const userId = noShow.userId;

      if (ride.driverId === userId) {
        if (ride.type === "P2P") {
          await Promise.allSettled(
            ride.bookings.map(async (bk) => {

              await prisma.booking.update({
                where: {
                  id: bk.id,
                },
                data: {
                  status: BookingStatus.APPROVED,
                  disputeResolvedAt: new Date(),
                  paymentTransaction: {
                    update: {
                      disputeResolvedAt: new Date(),
                    }
                  }
                }
              })
            })
          )
        } else {
          await Promise.allSettled(
            ride.d2dBookingRequests.map(async (dr) => {

              await prisma.d2DBookingRequest.update({
                where: {
                  id: dr.id,
                },
                data: {
                  status: D2DBookingRequestStatus.CONFIRMED,
                  disputeResolvedAt: new Date(),
                  transaction: {
                    update: {
                      disputeResolvedAt: new Date(),
                    }
                  }
                }
              })
            })
          )
        }
      } else {
        if (ride.type === "P2P") {
          await Promise.allSettled(
            ride.bookings.filter(bkg => bkg.userId === userId).map(async (bk) => {

              await prisma.booking.update({
                where: {
                  id: bk.id,
                },
                data: {
                  status: BookingStatus.APPROVED,
                  disputeResolvedAt: new Date(),
                  paymentTransaction: {
                    update: {
                      disputeResolvedAt: new Date(),
                    }
                  }
                }
              })
            })
          )
        } else {
          await Promise.allSettled(
            ride.d2dBookingRequests.filter(drst => drst.passengerId === userId).map(async (dr) => {

              await prisma.d2DBookingRequest.update({
                where: {
                  id: dr.id,
                },
                data: {
                  status: D2DBookingRequestStatus.CONFIRMED,
                  disputeResolvedAt: new Date(),
                  transaction: {
                    update: {
                      disputeResolvedAt: new Date(),
                    }
                  }
                }
              })
            })
          )
        }
      }

      // notify the reporter about the rejection of the no-show report
      await NotificationServices.notifyUsers({
        userIds: [noShow.reportedById],
        titleEn: "No-Show Report Rejected",
        titleFr: "Rapport de Non-Présentation(No-Show) Rejeté",
        messageEn: `Your no-show report for ride ${updated.ride.departureLocation.city} to ${updated.ride.destinationLocation.city} has been rejected.`,
        messageFr: `Votre rapport de non-présentation(no-show) pour le trajet de ${updated.ride.departureLocation.city} à ${updated.ride.destinationLocation.city} a été rejeté.`,
        rideId: noShow.rideId,
      });

      const getNoShowRejectLogData = {
        Level: LogLevel.INFO,
        message: isEN ? "No-show rejected" : "Non-Présentation(No-show) rejeté",
        action: "REJECT_NO_SHOW",
        userId: req.user?.id,
        meta: {
          userId: req.user?.id,
          noShowId: updated.id,
          date: new Date().toISOString(),
        },
      };
      logger.info(getNoShowRejectLogData.message, {
        action: getNoShowRejectLogData.action,
        userId: getNoShowRejectLogData.userId,
        meta: getNoShowRejectLogData.meta,
      });

      return res.status(200).json({
        status: true,
        message: isEN ? "No-show rejected." : "Non-Présentation(No-show) rejeté.",
        data: updated,
      });
    }
  );


}
