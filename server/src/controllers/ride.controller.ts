import { catchAsync } from "../utils/CatchAsync";
import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { AppError } from "../utils/AppError";
import {
  BookingStatus,
  BookingType,
  // ContributionCollectionMethod,
  CouponTarget,
  FeeType,
  LuggageSize,
  MonetizationType,
  PaymentProvider,
  Prisma,
  RedeemedCoupon,
  RideStatus,
  TransactionStatus,
  TransactionType,
  UserRole,
  YesNo,
  ReviewType,
  RideType,
  D2DBookingRequestStatus,
  RideRequest,
  VehicleCategory,
} from "@prisma/client";
import { DbUser, fileSelects, profileSelects } from "../types";
import { prisma } from "../config/database";
import {
  BookRidePayload,
  RidePayload,
} from "../middlewares/validators/ride.request.validator";
import { TransactionService } from "../services/transaction.service";
import { CouponService } from "../services/coupon.service";
import { getDefaultCurrency } from "../utils/currency";
import { NotificationServices } from "../services/notification.service";
import { RatingReviewService } from "../services/ratingReview.service";
import { v4 } from "uuid";
import moment from "moment";
import { RideRequestService } from "../services/rideRequest.service";
import { generateRideBookingAttendenceCode } from "../utils/generateReferralCode";
import { listRides } from "../services/search/rideSearch.service";
import { findOrCreateScheduledRide } from "../services/busRide.service";

export class RideController {
  // Create a new Ride
  static createRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const matched_data = matchedData<RidePayload>(req);
      const user = req.user! as DbUser;
      const userId = user.id;
      const isEN = req.isEnglishPreferred;

      // Check if user is admin
      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins are not allowed"
              : "Les administrateurs ne sont pas autorisés",
            403
          )
        );
      }

      // check if the driver is onboarded
      if (!user.isDriverOnboarded) {
        return res.status(400).json({
          success: false,
          message: isEN
            ? "You must complete driver onboarding before positing a ride"
            : "Vous devez terminer l'intégration du conducteur avant de publier un trajet",
          errorCode: "DRIVER_NOT_ONBOARDED",
        });
      }

      // if the contribution method is via platform, check if the stripe account is onboarded
      const contributionMethod = req.body.contributionCollectionMethod;
      if (contributionMethod === "VIA_PLATFORM" && !user.isStripeOnboarded) {
        return res.status(400).json({
          success: false,
          message: isEN
            ? "You must complete Stripe onboarding before posting a ride with platform contribution collection"
            : "Vous devez terminer l'intégration Stripe avant de publier un trajet avec collecte de contribution via la plateforme",
          errorCode: "STRIPE_NOT_ONBOARDED",
        });
      }

      // Gate: vehicle must be KYC-approved before it can be used for a ride.
      if (matched_data.vehicleId) {
        const veh = await prisma.vehicle.findUnique({
          where: { id: matched_data.vehicleId },
          select: { kycStatus: true, userId: true },
        });
        if (!veh || veh.userId !== user.id) {
          return next(
            AppError(
              isEN ? "Vehicle not found." : "Véhicule introuvable.",
              404,
            ),
          );
        }
        if (veh.kycStatus !== "APPROVED") {
          return next(
            AppError(
              isEN
                ? veh.kycStatus === "REJECTED"
                  ? "This vehicle's documents were rejected. Resubmit before posting a ride with it."
                  : "This vehicle is awaiting admin approval. You can use it for rides once approved."
                : veh.kycStatus === "REJECTED"
                  ? "Les documents de ce véhicule ont été rejetés. Soumettez-les à nouveau avant de publier un trajet."
                  : "Ce véhicule est en attente d'approbation par l'administrateur.",
              403,
            ),
          );
        }
      }

      // we limit up to 5 draft rides
      const numDraft = await prisma.ride.count({
        where: { driverId: user.id, status: RideStatus.DRAFT },
      });

      if (numDraft >= 5) {
        return next(
          AppError(
            isEN
              ? "We only allow up to 5 draft rides, please first publish your draft rides."
              : "Nous n'autorisons que jusqu'à 5 trajets brouillon, veuillez d'abord publier vos trajets brouillon.",
            400
          )
        );
      };

      // Check for overlapping rides for this driver
      const overlapRide = await prisma.ride.findFirst({
        where: {
          driverId: userId,
          isDeleted: false,
          status: { notIn: [RideStatus.CANCELLED, RideStatus.COMPLETED, RideStatus.EXPIRED] },
          AND: [
            {
              departureTime: {
                lt: new Date(matched_data.estimatedArrivalTime),
              },
            },
            {
              estimatedArrivalTime: {
                gt: new Date(matched_data.departureTime),
              },
            },
          ],
        },
        include: {
          departureLocation: true,
          destinationLocation: true,
        }
      });

      if (overlapRide) {
        return next(
          AppError(
            isEN
              ? `You already have a ride that overlaps with the selected time period. Existing ride: ${overlapRide.departureLocation.city}, ${overlapRide.departureLocation.regionCode} to ${overlapRide.destinationLocation.city}, ${overlapRide.destinationLocation.regionCode} set to depart at ${overlapRide.departureTime.toLocaleDateString("en-CA", { timeZone: "UTC" })} GMT, estimated to end ${new Date(overlapRide.estimatedArrivalTime!).toLocaleDateString("en-CA", { timeZone: "UTC" })} GMT.`
              : `Vous avez déjà un trajet qui chevauche la période sélectionnée. Trajet existant: ${overlapRide.departureLocation.city}, ${overlapRide.departureLocation.regionCode} à ${overlapRide.destinationLocation.city}, ${overlapRide.destinationLocation.regionCode} le ${overlapRide.departureTime.toLocaleDateString("fr-CA", { timeZone: "UTC" })} GMT, estimé se terminer le ${new Date(overlapRide.estimatedArrivalTime!).toLocaleDateString("fr-CA", { timeZone: "UTC" })} GMT.`,
            400
          )
        );
      }

      const newDeparture = new Date(matched_data.departureTime);
      const newArrival = new Date(matched_data.estimatedArrivalTime);

      const vehicle = await prisma.vehicle.findUnique({ where: { id: matched_data.vehicleId } });

      if (!vehicle) {
        return next(
          AppError(
            isEN
              ? "Vehicle not found."
              : "Véhicule non trouvé.",
            404
          )
        );
      }

      if (vehicle.category === 'MOTORBIKE' && matched_data.availableSeats > 1) {
        return next(
          AppError(
            isEN
              ? "Motorbike rides can only have 1 available seat."
              : "Les trajets en moto ne peuvent avoir qu'1 place disponible.",
            400
          )
        );
      }

      const conflictingVehicleRide = await prisma.ride.findFirst({
        where: {
          vehicleId: matched_data.vehicleId,
          isDeleted: false,
          status: {
            notIn: [
              RideStatus.CANCELLED,
              RideStatus.COMPLETED,
              RideStatus.EXPIRED,
            ],
          },
          departureTime: {
            lt: newArrival,
          },
          estimatedArrivalTime: {
            gt: newDeparture,
          },
        },
        select: {
          id: true,
          departureTime: true,
          estimatedArrivalTime: true,
          status: true,
          departureLocation: true,
          destinationLocation: true,
        },
      });


      if (conflictingVehicleRide) {
        return next(
          AppError(
            isEN
              ? `This vehicle is already assigned to another ride that overlaps with the selected time period. Conflicting ride: from ${conflictingVehicleRide.departureLocation.city}, ${conflictingVehicleRide.departureLocation.regionCode} to ${conflictingVehicleRide.destinationLocation.city}, ${conflictingVehicleRide.destinationLocation.regionCode}, departing at ${conflictingVehicleRide.departureTime.toLocaleDateString("en-CA", { timeZone: "UTC" })} GMT, estimated to end ${new Date(conflictingVehicleRide.estimatedArrivalTime!).toLocaleDateString("en-CA", { timeZone: "UTC" })} GMT.`
              : `Ce véhicule est déjà attribué à un autre trajet qui chevauche la période sélectionnée. Trajet en conflit: de ${conflictingVehicleRide.departureLocation.city}, ${conflictingVehicleRide.departureLocation.regionCode} à ${conflictingVehicleRide.destinationLocation.city}, ${conflictingVehicleRide.destinationLocation.regionCode}, départ le ${conflictingVehicleRide.departureTime.toLocaleDateString("fr-CA", { timeZone: "UTC" })} GMT, estimé se terminer le ${new Date(conflictingVehicleRide.estimatedArrivalTime!).toLocaleDateString("fr-CA", { timeZone: "UTC" })} GMT.`,
            404
          )
        );
      }

      // Content moderation for additional notes and location names
      // const contentToModerate = [];

      // if (matched_data.preferences?.additionalNotes?.trim()) {
      //   contentToModerate.push({
      //     content: matched_data.preferences.additionalNotes.trim(),
      //     context: {
      //       contentType: "ride_notes" as const,
      //       userRole: "USER" as const,
      //       questionContext: `Additional notes for ride from ${matched_data.departure.locationName} to ${matched_data.destination.locationName}`,
      //     },
      //   });
      // }

      // Moderate location names for inappropriate content
      // const locationNames = [
      //   matched_data.departure.locationName,
      //   matched_data.destination.locationName,
      //   ...(matched_data.stopovers?.map((s) => s.locationName) || []),
      // ].filter((name) => name && name.trim());

      // for (const locationName of locationNames) {
      //   contentToModerate.push({
      //     content: locationName.trim(),
      //     context: {
      //       contentType: "location_name" as const,
      //       userRole: "USER" as const,
      //       questionContext: "Location name for ride posting",
      //     },
      //   });
      // }

      // Perform moderation if there's content to moderate
      // if (contentToModerate.length > 0) {
      //   const moderationResults = await Promise.all(
      //     contentToModerate.map(({ content, context }) =>
      //       ModerationController.validateContentInline(content, context)
      //     )
      //   );

      //   const invalidContent = moderationResults.find(
      //     (result) => !result.isValid
      //   );
      //   if (invalidContent) {
      //     return next(
      //       AppError(
      //         isEN
      //           ? invalidContent.message
      //           : "Le contenu fourni n'est pas approprié.",
      //         400
      //       )
      //     );
      //   }

      // If luggageSize is NONE, set luggageCount to undefined
      if (
        matched_data.preferences &&
        matched_data.preferences.luggageSize === LuggageSize.NONE
      ) {
        matched_data.preferences.luggageCount = undefined;
      }

      // regionCode is no longer derived from province lookup (Rwanda-first; tax model removed).

      // check the existance of the ride request
      let rr: RideRequest | null = null;
      if (matched_data.rideRequestId) {
        rr = await prisma.rideRequest.findUnique({ where: { id: matched_data.rideRequestId } })
      };

      // Create ride
      const ride = await prisma.ride.create({
        data: {
          departureTime: new Date(matched_data.departureTime),
          availableSeats: matched_data.availableSeats,
          totalSeats: matched_data.availableSeats,
          contribution: matched_data.contribution,
          ...rr && {
            rideRequest: {
              connect: {
                id: rr.id,
              }
            },
          },
          departureLocation: {
            create: {
              ...matched_data.departure,
              regionCode: null,
            },
          },
          destinationLocation: {
            create: {
              ...matched_data.destination,
              regionCode: null,
            },
          },
          preferences: { create: { ...matched_data.preferences } },
          stopovers: {
            createMany: {
              data:
                matched_data.stopovers?.map((sv) => ({
                  ...sv,
                  regionCode: null,
                })) || [],
            },
          },
          bookingType: matched_data.bookingType || BookingType.AUTOMATIC,
          status: RideStatus.DRAFT,
          driver: { connect: { id: userId } },
          vehicle: { connect: { id: matched_data.vehicleId } },
          estimatedArrivalTime: new Date(matched_data.estimatedArrivalTime),
          // TODO(payments): Stripe is not available in Rwanda. All rides currently
          // use OFF_PLATFORM (cash) collection. When a supported provider (MoMo,
          // Airtel Money, Flutterwave) is added, read this from matched_data.
          contributionCollectionMethod: "OFF_PLATFORM" as any,
          chatThread: {
            create: {
              ownerId: userId,
              users: { connect: { id: userId } },
            },
          },
        },
        include: {
          driver: {
            select: {
              ...profileSelects,
              averageRating: true,
              totalRatings: true,
            },
          },
          vehicle: {
            include: {
              files: { select: { ...fileSelects, userId: false } },
              defaultImage: { select: { ...fileSelects, userId: false } },
            },
          },
          departureLocation: true,
          destinationLocation: true,
          stopovers: true,
          chatThread: {
            include: {
              users: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profileImage: {
                    select: {
                      url: true,
                    },
                  },
                },
              },
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profileImage: {
                    select: {
                      url: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Update geo points for locations
      const locations = [
        ...ride.stopovers,
        ride.departureLocation,
        ride.destinationLocation,
      ];
      await Promise.all(
        locations.map(async (loc) => {
          await prisma.$executeRaw`
            UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${loc.longitude}, ${loc.latitude}), 4326)
            WHERE id=${loc.id}
          `;
        })
      );

      let message = isEN
        ? "A draft ride is successfully created, draft rides are only visible to you, so now you can edit it and publish it when you are ready."
        : "Un brouillon de trajet a été créé avec succès, les brouillons de trajet ne sont visibles que par vous, vous pouvez donc maintenant le modifier et le publier lorsque vous êtes prêt.";

      return res.status(201).json({
        success: true,
        message,
        data: ride,
      });
    }
  );

  // Update an existing Ride (only if no bookings and not ongoing/completed/cancelled)
  static updateRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rideId, ...matched_data } = matchedData<
        RidePayload & { rideId: number }
      >(req);
      const user = req.user! as DbUser;
      const userId = user.id;
      const isEN = req.isEnglishPreferred;

      // Only drivers can update their own rides
      if (user.role === UserRole.ADMIN) {
        return next(AppError(isEN ? "Not allowed" : "Non autorisé", 403));
      }

      // Fetch ride with bookings count and status
      const ride = await prisma.ride.findUnique({
        where: { id: rideId, driverId: userId, isDeleted: false },
        include: {
          _count: { select: { bookings: true } },
          bookings: { select: { id: true, status: true } },
        },
      });

      if (!ride) {
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );
      }

      // Only allow update if the ride is in draft state
      if (ride.status !== RideStatus.DRAFT) {
        return next(
          AppError(
            isEN
              ? "Ride can only be updated when it is in draft state."
              : "Le trajet ne peut être mise à jour que lorsqu'elle est en état de brouillon.",
            400
          )
        );
      }

      // Check for overlapping rides for this driver but not this ride
      const overlapRide = await prisma.ride.findFirst({
        where: {
          driverId: user.id,
          isDeleted: false,
          id: { not: rideId },
          status: { notIn: [RideStatus.CANCELLED, RideStatus.COMPLETED, RideStatus.EXPIRED] },
          AND: [
            {
              departureTime: {
                lt: new Date(matched_data.estimatedArrivalTime),
              },
            },
            {
              estimatedArrivalTime: {
                gt: new Date(matched_data.departureTime),
              },
            },
          ],
        },
        include: {
          departureLocation: true,
          destinationLocation: true,
        }
      });

      if (overlapRide) {
        return next(
          AppError(
            isEN
              ? `You already have a ride that overlaps with the selected time period. Existing ride: ${overlapRide.departureLocation.city}, ${overlapRide.departureLocation.regionCode} to ${overlapRide.destinationLocation.city}, ${overlapRide.destinationLocation.regionCode} set to depart at ${overlapRide.departureTime.toLocaleDateString("en-CA", { timeZone: "UTC" })} GMT, estimated to end ${new Date(overlapRide.estimatedArrivalTime!).toLocaleDateString("en-CA", { timeZone: "UTC" })} GMT.`
              : `Vous avez déjà un trajet qui chevauche la période sélectionnée. Trajet existant: ${overlapRide.departureLocation.city}, ${overlapRide.departureLocation.regionCode} à ${overlapRide.destinationLocation.city}, ${overlapRide.destinationLocation.regionCode} le ${overlapRide.departureTime.toLocaleDateString("fr-CA", { timeZone: "UTC" })} GMT, estimé se terminer le ${new Date(overlapRide.estimatedArrivalTime!).toLocaleDateString("fr-CA", { timeZone: "UTC" })} GMT.`,
            400
          )
        );
      }

      // Check vehicle availability (excluding this ride)
      const newDeparture = new Date(matched_data.departureTime);
      const newArrival = new Date(matched_data.estimatedArrivalTime);

      const vehicle = await prisma.vehicle.findUnique({ where: { id: matched_data.vehicleId } });

      if (!vehicle) {
        return next(
          AppError(
            isEN
              ? "Vehicle not found."
              : "Véhicule non trouvé.",
            404
          )
        );
      }

      const conflictingVehicleRide = await prisma.ride.findFirst({
        where: {
          vehicleId: matched_data.vehicleId,
          isDeleted: false,
          id: { not: rideId },
          status: {
            notIn: [
              RideStatus.CANCELLED,
              RideStatus.COMPLETED,
              RideStatus.EXPIRED,
            ],
          },
          departureTime: {
            lt: newArrival,
          },
          estimatedArrivalTime: {
            gt: newDeparture,
          },
        },
        select: {
          id: true,
          departureTime: true,
          estimatedArrivalTime: true,
          status: true,
          departureLocation: true,
          destinationLocation: true,
        },
      });


      if (conflictingVehicleRide) {
        return next(
          AppError(
            isEN
              ? `This vehicle is already assigned to another ride that overlaps with the selected time period. Conflicting ride: from ${conflictingVehicleRide.departureLocation.city}, ${conflictingVehicleRide.departureLocation.regionCode} to ${conflictingVehicleRide.destinationLocation.city}, ${conflictingVehicleRide.destinationLocation.regionCode}, departing at ${conflictingVehicleRide.departureTime.toLocaleDateString("en-CA", { timeZone: "UTC" })} GMT, estimated to end ${new Date(conflictingVehicleRide.estimatedArrivalTime!).toLocaleDateString("en-CA", { timeZone: "UTC" })} GMT.`
              : `Ce véhicule est déjà attribué à un autre trajet qui chevauche la période sélectionnée. Trajet en conflit: de ${conflictingVehicleRide.departureLocation.city}, ${conflictingVehicleRide.departureLocation.regionCode} à ${conflictingVehicleRide.destinationLocation.city}, ${conflictingVehicleRide.destinationLocation.regionCode}, départ le ${conflictingVehicleRide.departureTime.toLocaleDateString("fr-CA", { timeZone: "UTC" })} GMT, estimé se terminer le ${new Date(conflictingVehicleRide.estimatedArrivalTime!).toLocaleDateString("fr-CA", { timeZone: "UTC" })} GMT.`,
            404
          )
        );
      }

      // If luggageSize is NONE, set luggageCount to undefined
      if (
        matched_data.preferences &&
        matched_data.preferences.luggageSize === LuggageSize.NONE
      ) {
        matched_data.preferences.luggageCount = undefined;
      }

      // Update ride and related entities
      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: {
          departureTime: new Date(matched_data.departureTime),
          availableSeats: matched_data.availableSeats,
          totalSeats: matched_data.availableSeats,
          contribution: matched_data.contribution,
          estimatedArrivalTime: new Date(matched_data.estimatedArrivalTime),
          vehicle: { connect: { id: matched_data.vehicleId } },
          bookingType: matched_data.bookingType || BookingType.AUTOMATIC,
          // TODO(payments): see note above — forced to OFF_PLATFORM until Rwanda
          // payment provider (MoMo / Airtel / Flutterwave) is integrated.
          contributionCollectionMethod: "OFF_PLATFORM" as any,
          // Overwrite locations and preferences
          departureLocation: {
            update: {
              ...matched_data.departure,
              regionCode: null,
            },
          },
          destinationLocation: {
            update: {
              ...matched_data.destination,
              regionCode: null,
            },
          },
          preferences: {
            update: { ...matched_data.preferences },
          },
          // Remove and recreate stopovers
          stopovers: {
            deleteMany: {},
            createMany: { data: matched_data.stopovers || [] },
          },
        },
        include: {
          driver: {
            select: {
              ...profileSelects,
              averageRating: true,
              totalRatings: true,
            },
          },
          departureLocation: true,
          destinationLocation: true,
          stopovers: true,
          preferences: true,
          vehicle: {
            include: {
              files: { select: { ...fileSelects, userId: false } },
              defaultImage: { select: { ...fileSelects, userId: false } },
            },
          },
        },
      });

      // Update geo points for locations
      const locations = [
        ...updatedRide.stopovers,
        updatedRide.departureLocation,
        updatedRide.destinationLocation,
      ];
      await Promise.all(
        locations.map(async (loc) => {
          await prisma.$executeRaw`
            UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${loc.longitude}, ${loc.latitude}), 4326)
            WHERE id=${loc.id}
          `;
        })
      );

      return res.status(200).json({
        success: true,
        message: isEN
          ? "Ride updated successfully"
          : "Trajet mise à jour avec succès",
        data: updatedRide,
      });
    }
  );

  // Paginated get all rides with filtering, ordering, and dashboard context
  static getAllRides = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        orderBy = "departureTime",
        sort = "asc",
        ...filters
      } = matchedData<{
        page?: number;
        pageSize?: number;
        orderBy?: string;
        sort?: "asc" | "desc";
        departureCity?: string;
        destinationCity?: string;
        status?: RideStatus;
        minContribution?: number;
        maxContribution?: number;
        departureTime?: number;
        userLatitude?: number;
        userLongitude?: number;
        radiusKm?: number;
        kind?: "posted" | "booked";
        type?: RideType;
        vehicleCategory?: VehicleCategory;
      }>(req, { locations: ["query"] });

      const user = req.user as DbUser | undefined;
      const skip = (page - 1) * pageSize;

      // use raw query if coordinate are provided
      if (filters.userLatitude && filters.userLongitude) {
        const radius = filters.radiusKm || 30;
        const userLat = filters.userLatitude;
        const userLng = filters.userLongitude;

        const whereConditions: Prisma.Sql[] = [
          Prisma.sql`r.status = 'PUBLISHED'`,
          Prisma.sql`r."isBlocked" = false`,
          Prisma.sql`r."isDeleted" = false`,
          Prisma.sql`r."departureTime" >= NOW()`,
          Prisma.sql`r."availableSeats" > 0`,
        ];

        // D2D rides with rideRequestId can only be seen by the request creator
        if (user?.id) {
          whereConditions.push(
            Prisma.sql`NOT (r.type = 'D2D' AND r."rideRequestId" IS NOT NULL AND r."driverId" != ${user.id} AND rr."userId" != ${user.id})`
          );
        } else {
          // Public users cannot see D2D rides with rideRequestId
          whereConditions.push(
            Prisma.sql`NOT (r.type = 'D2D' AND r."rideRequestId" IS NOT NULL)`
          );
        }

        if (filters.departureCity) {
          whereConditions.push(
            Prisma.sql`LOWER(dl.city) LIKE ${`%${filters.departureCity.toLowerCase()}%`}`
          );
        }

        if (filters.destinationCity) {
          whereConditions.push(
            Prisma.sql`LOWER(dest.city) LIKE ${`%${filters.destinationCity.toLowerCase()}%`}`
          );
        }

        if (filters.minContribution) {
          whereConditions.push(
            Prisma.sql`r.contribution >= ${filters.minContribution}`
          );
        }

        if (filters.maxContribution) {
          whereConditions.push(
            Prisma.sql`r.contribution <= ${filters.maxContribution}`
          );
        }

        if (filters.type) {
          whereConditions.push(
            Prisma.sql`r.type = ${filters.type}::"RideType"`
          );
        }

        if (filters.vehicleCategory) {
          whereConditions.push(
            Prisma.sql`v.category = ${filters.vehicleCategory}::"VehicleCategory"`
          );
        }

        if (filters.departureTime) {
          const startOfDay = moment(filters.departureTime)
            .startOf("day")
            .toDate();
          const endOfDay = moment(filters.departureTime).endOf("day").toDate();
          whereConditions.push(
            Prisma.sql`r."departureTime" >= ${startOfDay} AND r."departureTime" <= ${endOfDay}`
          );
        }

        // Geospatial condition
        whereConditions.push(
          Prisma.sql`ST_DWithin(dl."locationPoint", ST_MakePoint(${userLng}, ${userLat})::geography, ${radius * 1000
            })`
        );

        const [rides, [{ count: total } = { count: 0 }]] =
          await prisma.$transaction([
            prisma.$queryRaw<any[]>(
              Prisma.sql`
              SELECT
                r.*,

                -- 🚘 Vehicle
                json_build_object(
                    'id', v.id,
                    'make', v.make,
                    'model', v.model,
                    'color', v.color,
                    'plateNumber', v."plateNumber",
                    'defaultImage', json_build_object(
                      'id', vi.id,
                      'url', vi."url",
                      'type', vi."type",
                      'category', vi."category"
                    ),
                    'files', (
                      SELECT COALESCE(json_agg(
                        json_build_object(
                          'id', a.id,
                          'url', a.url,
                          'type', a.type,
                          'category', a.category,
                          'vehicleId', a."vehicleId"
                        )
                      ) FILTER (WHERE a.id IS NOT NULL), '[]'::json)
                      FROM "Asset" a
                      WHERE a."vehicleId" = v.id
                    )
                  ) AS vehicle,

                -- 👤 Driver
                json_build_object(
                  'id', d.id,
                  'firstName', d."firstName",
                  'lastName', d."lastName",
                  'email', d.email,
                  'phoneNumber', d."phoneNumber",
                  'language', d."language",
                  'averageRating', d."averageRating",
                  'totalRatings', d."totalRatings",
                  'profileImage', json_build_object(
                    'url', pi.url
                  )
                ) AS driver,

                -- 📍 Departure Location
                json_build_object(
                  'id', dl.id,
                  'country', dl.country,
                  'region', dl.region,
                  'regionCode', dl."regionCode",
                  'city', dl.city,
                  'locationName', dl."locationName",
                  'address', dl.address,
                  'latitude', dl.latitude,
                  'longitude', dl.longitude
                ) AS "departureLocation",

                -- 📍 Destination Location
                json_build_object(
                  'id', dest.id,
                  'country', dest.country,
                  'region', dest.region,
                  'regionCode', dest."regionCode",
                  'city', dest.city,
                  'locationName', dest."locationName",
                  'address', dest.address,
                  'latitude', dest.latitude,
                  'longitude', dest.longitude
                ) AS "destinationLocation",

                -- 🎯 Ride Preferences
                json_build_object(
                  'id', rp.id,
                  'rideId', rp."rideId",
                  'smoking', rp.smoking,
                  'pets', rp.pets,
                  'airConditioning', rp."airConditioning",
                  'ladiesOnly', rp."ladiesOnly",
                  'bicycleSupport', rp."bicycleSupport",
                  'snowTires', rp."snowTires",
                  'luggageSize', rp."luggageSize",
                  'luggageCount', rp."luggageCount",
                  'additionalNotes', rp."additionalNotes",
                  'music', rp."music",
                  'gentsOnly', rp."gentsOnly",
                  'createdAt', rp."createdAt",
                  'updatedAt', rp."updatedAt"
                ) AS preferences,

                -- 🛑 Stopovers
                (
                  SELECT COALESCE(json_agg(
                    json_build_object(
                      'id', s.id,
                      'country', s.country,
                      'region', s.region,
                      'city', s.city,
                      'locationName', s."locationName",
                      'address', s.address,
                      'latitude', s.latitude,
                      'longitude', s.longitude,
                      'rideStopoverId', s."rideStopoverId"
                    )
                  ) FILTER (WHERE s.id IS NOT NULL), '[]'::json)
                  FROM "Location" s
                  WHERE s."rideStopoverId" = r.id
                ) AS stopovers,

                -- ✅ Bookings (only approved, grouped as array)
                (
                  SELECT COALESCE(json_agg(
                    json_build_object(
                      'id', b.id,
                      'userId', b."userId",
                      'status', b.status,
                      'rideId', b."rideId"
                    )
                  ) FILTER (WHERE b.id IS NOT NULL), '[]'::json)
                  FROM "Booking" b
                  WHERE b."rideId" = r.id AND b.status = 'APPROVED'
                ) AS bookings,

                -- 📏 Distance
                ST_Distance(dl."locationPoint", ST_MakePoint(${userLng}, ${userLat})::geography) AS distance

              FROM "Ride" r
              LEFT JOIN "Vehicle" v ON v.id = r."vehicleId"
              LEFT JOIN "Asset" vi ON v."defaultImageId" = vi.id
              LEFT JOIN "User" d ON d.id = r."driverId"
              LEFT JOIN "Asset" pi ON pi."userId" = d."id"
              LEFT JOIN "RidePreference" rp ON rp."rideId" = r.id
              LEFT JOIN "Location" dl ON dl.id = r."departureLocationId"
              LEFT JOIN "Location" dest ON dest.id = r."destinationLocationId"
              LEFT JOIN "RideRequest" rr ON rr.id = r."rideRequestId"

              WHERE ${Prisma.join(whereConditions, " AND ")}
              ORDER BY distance ASC
              LIMIT ${Prisma.raw(String(pageSize))}
              OFFSET ${Prisma.raw(String(skip))}
              `
            ),

            prisma.$queryRaw<any>(
              Prisma.sql`
              SELECT COUNT(*)::int FROM "Ride" r
              LEFT JOIN "Vehicle" v ON v.id = r."vehicleId"
              LEFT JOIN "Location" dl ON dl.id = r."departureLocationId"
              LEFT JOIN "Location" dest ON dest.id = r."destinationLocationId"
              LEFT JOIN "RideRequest" rr ON rr.id = r."rideRequestId"
              WHERE ${Prisma.join(whereConditions, " AND ")}
              `
            ),
          ]);

        const formatted = rides.map((r) => {
          const {
            distance,
            driver,
            bookings,
            departureLocation,
            destinationLocation,
            ...rest
          } = r;
          const {
            totalRatings,
            averageRating,
            id,
            profileImage,
            firstName,
            ...profile
          } = driver;

          const hasApprovedBooking = bookings?.some(
            (b: any) => b.status === "APPROVED" && b.userId === user?.id
          );

          const canSeeFullDriver =
            user?.role === UserRole.ADMIN ||
            r.driverId === user?.id ||
            hasApprovedBooking;

          return {
            distanceKm: distance ? (distance / 1000).toFixed(2) : undefined,
            driver: canSeeFullDriver
              ? driver // full driver profile
              : { id, profileImage, firstName, totalRatings, averageRating }, // restricted
            ...(r.type == "D2D"
              ? {
                driverStartLocation: departureLocation,
                driverStopLocation: destinationLocation,
              }
              : {
                departureLocation,
                destinationLocation,
              }),
            ...rest,
          };
        });
        return res.json({
          success: true,
          data: formatted,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        });
      } else {
        let where: Prisma.RideWhereInput = { isDeleted: false };

        // 🚦 Handle dashboard context
        if (user) {
          if (user.role !== UserRole.ADMIN) {
            if (!filters.kind) {
              return next(
                AppError(
                  req.isEnglishPreferred
                    ? "Kind filter is required for non-admin users"
                    : "Le filtre de type est requis pour les utilisateurs non administrateurs",
                  400
                )
              );
            }
            if (filters.kind === "posted") {
              where.driverId = user.id;
            } else if (filters.kind === "booked") {
              where.bookings = { some: { userId: user.id } };
            }
          }
        } else {
          // Public access: show only published rides
          where.status = RideStatus.PUBLISHED;
          where.isBlocked = false;
          where.departureTime = { gte: new Date() };
          where.availableSeats = { gt: 0 };
          where.isDeleted = false;
          // Public users cannot see D2D rides with rideRequestId
          where.NOT = { type: RideType.D2D, rideRequestId: { not: null } };
        }

        // D2D rides with rideRequestId can only be seen by the request creator or driver
        if (user && user.role !== UserRole.ADMIN) {
          where.OR = [
            {
              NOT: {
                AND: [
                  { type: RideType.D2D },
                  { rideRequestId: { not: null } },
                  { driverId: { not: user.id } },
                  { rideRequest: { userId: { not: user.id } } },
                ],
              },
            },
          ];
        }

        // 🧠 Apply Filters
        if (filters.departureCity) {
          where.departureLocation = {
            is: {
              city: {
                contains: filters.departureCity as string,
                mode: "insensitive",
              },
            },
          };
        }

        if (filters.destinationCity) {
          where.destinationLocation = {
            is: {
              city: {
                contains: filters.destinationCity as string,
                mode: "insensitive",
              },
            },
          };
        }

        if (filters.status) {
          where.status = filters.status;
        }

        if (filters.minContribution || filters.maxContribution) {
          where.contribution = {};
          if (filters.minContribution)
            where.contribution.gte = filters.minContribution;
          if (filters.maxContribution)
            where.contribution.lte = filters.maxContribution;
        }

        if (filters.departureTime) {
          const startOfDay = moment(filters.departureTime)
            .startOf("day")
            .toDate();
          const endOfDay = moment(filters.departureTime).endOf("day").toDate();
          where.departureTime = {
            gte: startOfDay,
            lte: endOfDay,
          };
        }

        if (filters.type) {
          where.type = filters.type;
        }

        if (filters.vehicleCategory) {
          where.vehicle = { category: filters.vehicleCategory };
        }

        // 🧾 Ordering
        let order: Prisma.RideOrderByWithRelationInput = {};
        order[orderBy as keyof Prisma.RideOrderByWithRelationInput] = sort;

        // 🔍 Execute Query
        const [rides, total] = await prisma.$transaction([
          prisma.ride.findMany({
            where,
            skip,
            take: pageSize,
            include: {
              driver: {
                select: {
                  ...profileSelects,
                  averageRating: true,
                  totalRatings: true,
                },
              },
              vehicle: {
                include: {
                  files: { select: { ...fileSelects, userId: false } },
                  defaultImage: { select: { ...fileSelects, userId: false } },
                },
              },
              preferences: true,
              departureLocation: true,
              destinationLocation: true,
              stopovers: true,
              bookings: {
                where: {
                  status: BookingStatus.APPROVED,
                },
                select: {
                  id: true,
                  userId: true,
                  rideId: true,
                  status: true,
                },
              },
              ...(filters.kind === "posted" && {
                _count: {
                  select: {
                    bookingSeats: {
                      where: {
                        attendedAt: {
                          not: null,
                        },
                      },
                    },
                    ...(user?.role === UserRole.ADMIN && {
                      reports: { where: { status: "OPEN" } },
                    }),
                  },
                },
                d2dBookingRequests: {
                  include: {
                    pickupLocation: true,
                    dropoffLocation: true,
                  },
                  orderBy: [{ status: "asc" }, { createdAt: "asc" }],
                  take: 10,
                },
              }),
              ...(filters.kind !== "posted" && user?.role === UserRole.ADMIN && {
                _count: {
                  select: { reports: { where: { status: "OPEN" } } },
                },
              }),
            },
            orderBy: order,
          }),
          prisma.ride.count({ where }),
        ]);

        const formattedRides = rides.map((ride) => {
          const {
            bookings,
            driver,
            departureLocation,
            destinationLocation,
            ...rest
          } = ride;

          const hasApprovedBooking = bookings?.some(
            (b) => b.status === BookingStatus.APPROVED && b.userId === user?.id
          );

          const canSeeFullDriver =
            user?.role === UserRole.ADMIN ||
            ride.driverId === user?.id ||
            hasApprovedBooking;

          const {
            totalRatings,
            averageRating,
            id,
            profileImage,
            firstName,
            ...driverProfile
          } = driver;

          return {
            ...rest,
            driver: canSeeFullDriver
              ? driver
              : { id, profileImage, firstName, totalRatings, averageRating },
            ...(ride.type == "D2D"
              ? {
                driverStartLocation: departureLocation,
                driverStopLocation: destinationLocation,
              }
              : {
                departureLocation,
                destinationLocation,
              }),
          };
        });

        return res.status(200).json({
          success: true,
          data: formattedRides,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        });
      }
    }
  );

  // Get ride by ID
  static getRideById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rideId } = matchedData<{ rideId: number }>(req);
      const user = req.user;

      const where: Prisma.RideWhereUniqueInput = { id: rideId };

      if (user) {
        if (user.role !== UserRole.ADMIN) {
          where.OR = [
            { driverId: user.id },
            { bookings: { some: { userId: user.id } } },
            {
              status: RideStatus.PUBLISHED,
              isBlocked: false,
              isDeleted: false,
            }
          ];
          where.isDeleted = false;
          where.isBlocked = false;
        }
      } else {
        // Public access: show only published rides
        where.status = RideStatus.PUBLISHED;
        where.isBlocked = false;
        where.isDeleted = false;
      }

      const ride = await prisma.ride.findUnique({
        where,
        include: {
          chatThread: {
            select: {
              users: {
                select: {
                  id: true,
                  firstName: true,
                  profileImage: {
                    select: { url: true },
                  },
                },
              },
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  profileImage: {
                    select: { url: true },
                  },
                },
              },
            },
          },
          driver: {
            select: {
              ...profileSelects,
              averageRating: true,
              totalRatings: true,
            },
          },
          vehicle: {
            include: {
              files: { select: { ...fileSelects, userId: false } },
              defaultImage: { select: { ...fileSelects, userId: false } },
            },
          },
          preferences: true,
          departureLocation: true,
          destinationLocation: true,
          stopovers: true,
          route: { include: { stops: { orderBy: { order: "asc" } } } },
          bookings: {
            // Include all non-cancelled bookings so the requesting user can see
            // their own booking even in PENDING state
            where: { status: { notIn: [BookingStatus.CANCELLED, BookingStatus.EXPIRED] } },
            select: {
              id: true,
              userId: true,
              status: true,
              seats: true,
              createdAt: true,
              bookingSeats: {
                select: { attendanceCode: true },
              },
              booker: {
                select: {
                  id: true,
                  firstName: true,
                  profileImage: {
                    select: { url: true },
                  },
                },
              },
            },
          },
          d2dBookingRequests: {
            where: { status: D2DBookingRequestStatus.CONFIRMED },
            include: {
              passenger: {
                select: {
                  id: true,
                  firstName: true,
                  profileImage: {
                    select: { url: true },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              bookingSeats: { where: { attendedAt: { not: null } } },
            },
          },
          rideRequest: true,
        },
      });

      if (!ride) {
        return next(
          AppError(
            req.isEnglishPreferred ? "Ride not found" : "Trajet non trouvé",
            404
          )
        );
      }

      // --- Apply driver visibility rules ---
      const {
        _count,
        bookings,
        driver,
        departureLocation,
        destinationLocation,
        d2dBookingRequests,
        ...rest
      } = ride;

      const hasApprovedBooking = bookings?.some(
        (b) => b.status === BookingStatus.APPROVED && b.userId === user?.id
      );

      const canSeeFullDriver =
        user?.role === UserRole.ADMIN ||
        ride.driverId === user?.id ||
        hasApprovedBooking;

      const {
        totalRatings,
        averageRating,
        id,
        profileImage,
        firstName,
        ...driverProfile
      } = driver;

      const bookers = bookings.length
        ? bookings.map((bk) => bk.booker)
        : d2dBookingRequests.map((rq) => rq.passenger);

      // Include bookings so passengers can see their own booking status.
      // When the requester is the driver, show all bookings; otherwise show
      // only the requester's own bookings (to avoid leaking other passengers).
      const visibleBookings = user
        ? (ride.driverId === user.id
            ? bookings
            : bookings.filter((b) => b.userId === user.id))
        : [];

      res.json({
        success: true,
        data: {
          ...rest,
          bookings: visibleBookings,
          isRideRequester: ride.rideRequest?.userId === user?.id,
          driver: canSeeFullDriver
            ? driver
            : { id, profileImage, firstName, totalRatings, averageRating },
          ...(ride.driverId === user?.id && {
            bookers: Array.from(
              new Map(bookers.map((b) => [b.id, b])).values()
            ),
          }),
          ...(ride.type == "D2D"
            ? {
              driverStartLocation: departureLocation,
              driverStopLocation: destinationLocation,
            }
            : {
              departureLocation,
              destinationLocation,
            }),
        },
      });
    }
  );

  // Book a ride (handles coupon, subscription, payment, and notifications)
  static bookARide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        rideId,
        seatsBooked = 1,
        useCoupons = false,
        boardingStopId,
        alightingStopId,
      } = matchedData<BookRidePayload>(req);
      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      // Admin cannot book
      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins are not allowed"
              : "Les administrateurs ne sont pas autorisés",
            403
          )
        );
      }

      // --- 1) Fetch ride + minimal relations ---
      const ride = await prisma.ride.findUnique({
        where: { id: rideId, isDeleted: false },
        include: {
          driver: true,
          departureLocation: true,
          stopovers: true,
        },
      });

      if (!ride)
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );

      // if the ride is a d2d type, respond with a clear message
      if (ride.type === RideType.D2D) {
        return next(
          AppError(
            isEN
              ? "This ride is a door-to-door ride and cannot be booked directly. Please request a D2D booking."
              : "Ce trajet est un trajet porte-à-porte et ne peut pas être réservé directement. Veuillez demander une réservation porte-à-porte.",
            400
          )
        );
      }

      // --- 2) Basic state checks ---
      if (ride.status !== RideStatus.PUBLISHED)
        return next(
          AppError(
            isEN
              ? "Ride is not available for booking"
              : "Le trajet n'est pas disponible à la réservation",
            400
          )
        );

      if (ride.isBlocked)
        return next(
          AppError(isEN ? "Ride is blocked" : "Le trajet est bloqué", 400)
        );

      // Prevent self-booking
      if (ride.driverId === user.id)
        return next(
          AppError(
            isEN
              ? "Driver cannot book own ride"
              : "Le conducteur ne peut pas réserver son propre trajet",
            400
          )
        );

      // Departure time must be in future
      if (new Date() >= ride.departureTime)
        return next(
          AppError(
            isEN
              ? "Cannot book, departure time already passed"
              : "Impossible de réserver, l'heure de départ est déjà passée",
            400
          )
        );

      // 10 minutes cut-off
      const now = new Date();
      const tenMinutesBeforeDeparture = new Date(
        ride.departureTime.getTime() - 10 * 60 * 1000
      );
      if (now >= tenMinutesBeforeDeparture) {
        return next(
          AppError(
            isEN
              ? "Booking is not allowed within 10 minutes to departure time."
              : "La réservation n'est pas autorisée dans les 10 minutes précédant l'heure de départ.",
            400
          )
        );
      }

      // --- 3) Seat availability checks ---
      if (ride.availableSeats < seatsBooked)
        return next(
          AppError(
            isEN
              ? `${ride.availableSeats <= 0
                ? "No seats available, the ride is fully booked."
                : `Not enough seats available. Only ${ride.availableSeats} seat(s) left.`
              }`
              : `${ride.availableSeats <= 0
                ? "Aucuns sièges disponibles, le trajet est complètement réservé."
                : `Pas assez de places disponibles. Il ne reste que ${ride.availableSeats} place(s).`
              }`,
            400
          )
        );

      // Prevent passenger coupon if driver coupon used on this ride
      if (useCoupons && ride.appliedDriverCoupons) {
        return next(
          AppError(
            isEN
              ? "A driver loyalty coupon is active on this trip. Passenger coupons cannot be applied this time."
              : "Un coupon de fidélité conducteur est actif sur ce trajet. Les coupons passagers ne peuvent pas être appliqués cette fois.",
            400
          )
        );
      }

      // --- 4) Commission & fee calculation ---
      // Note: obtain commission settings from DB or config
      const commissionSetting = await prisma.commissionSettings.findFirst();

      const commissionRate = Number(commissionSetting?.rate || 10) / 100; // stored as decimal like 0.10
      // const defaultPlatformFee = Number(defaultFeeSetting?.amount || 1.0); // e.g., $1

      const baseContribution =
        Math.floor(ride.contribution * seatsBooked * 100) / 100;

      // if contribution is zero use defaultPlatformFee as platform fee
      let platformFee = 0;
      if (baseContribution === 0) {
        // platform fee scales with seats — assume defaultFee per seat; if you want otherwise change:
        const defaultFeeSetting = await prisma.feeSetting.findFirst({
          where: { active: true, type: FeeType.DEFAULT_PLATFORM_FEE },
        });
        platformFee =
          Math.ceil((defaultFeeSetting?.amount || 1) * seatsBooked * 100) / 100;
      } else {
        platformFee = Math.ceil(baseContribution * commissionRate * 100) / 100;
      }

      // Passenger coupon flow: coupon only reduces platformFee
      let discountAmount = 0;
      let couponUsedCount = 0;
      let discountPercent = 0;
      const originalYourDriveFee = platformFee;
      if (useCoupons) {
        const rule = await prisma.couponRedemptionRule.findUnique({
          where: { target: CouponTarget.RIDE_BOOKING },
        });
        const requiredCoupons = (rule?.requiredCoupons ?? 5) * seatsBooked;
        const { totalCoupons } = await CouponService.getUserCouponBalance(
          user.id
        );

        // Proportional discount
        const rat = Math.min(totalCoupons / requiredCoupons, 1); // cap at 100%
        const ratio = Math.floor(rat * 100) / 100;

        discountAmount = Math.floor(platformFee * ratio * 100) / 100;
        const finalFee = Math.ceil((platformFee - discountAmount) * 100) / 100;

        // How many coupons we consume
        const couponsToConsume = Math.min(totalCoupons, requiredCoupons);

        // Save for paymentSession metadata:
        platformFee = finalFee;
        couponUsedCount = couponsToConsume;
        discountPercent = ratio * 100;
        // We don't redeem coupons here — redeeming should happen when confirmPaymentForSession actually completes (or do it now if you prefer).
        // If you want to reserve coupons at session creation, call CouponService.redeemCoupons(...) here.
      }

      // --- 5) Final total to be authorized (no tax math) ---
      const totalToAuthorize = baseContribution + platformFee;

      // --- Off-platform (cash/direct) payment flow: create the booking immediately ---
      // When the ride's contribution is collected directly (cash), skip the
      // PaymentSession + PaymentIntent dance and create the Booking row now.
      if (ride.contributionCollectionMethod === "OFF_PLATFORM") {
        const isAutomatic = ride.bookingType === BookingType.AUTOMATIC;
        const seatCodes = isAutomatic
          ? await Promise.all(
              Array.from({ length: seatsBooked }).map(async () => ({
                attendanceCode: await generateRideBookingAttendenceCode(),
                rideId: ride.id,
              }))
            )
          : [];

        const booking = await prisma.booking.create({
          data: {
            rideId: ride.id,
            vehicleId: ride.vehicleId,
            seats: seatsBooked,
            userId: user.id,
            status: isAutomatic ? BookingStatus.APPROVED : BookingStatus.PENDING,
            monitizationType: MonetizationType.PAYMENT,
            boardingStopId: boardingStopId ?? null,
            alightingStopId: alightingStopId ?? null,
            ...(isAutomatic && seatCodes.length > 0 && {
              bookingSeats: { create: seatCodes },
            }),
          },
          include: {
            bookingSeats: true,
            booker: { select: profileSelects },
          },
        });

        if (isAutomatic) {
          await prisma.ride.update({
            where: { id: ride.id },
            data: {
              availableSeats: { decrement: seatsBooked },
              chatThread: {
                update: {
                  users: { connect: { id: user.id } },
                },
              },
            },
          });
        }

        // Notify the driver (best effort — don't fail request on notification error)
        try {
          await NotificationServices.notifyUsers({
            userIds: [ride.driverId],
            titleEn: isAutomatic ? "New Booking" : "New Booking Request",
            titleFr: isAutomatic ? "Nouvelle Réservation" : "Nouvelle Demande de Réservation",
            messageEn: `${user.firstName} has ${isAutomatic ? "booked" : "requested to book"} ${seatsBooked} seat(s) on your ride.`,
            messageFr: `${user.firstName} a ${isAutomatic ? "réservé" : "demandé à réserver"} ${seatsBooked} place(s) sur votre trajet.`,
            rideId: ride.id,
          });
        } catch (err) {
          console.error("notifyUsers (booking) failed:", err);
        }

        return res.status(200).json({
          success: true,
          message: isEN
            ? "Booking confirmed. Pay the driver directly."
            : "Réservation confirmée. Payez le conducteur directement.",
          data: {
            bookingId: booking.id,
            status: booking.status,
            seatsBooked,
            baseAmount: baseContribution,
            platformFee: originalYourDriveFee,
            totalAmount: totalToAuthorize,
            currency: "RWF",
            attendanceCodes: booking.bookingSeats.map((s) => s.attendanceCode),
          },
        });
      }

      // --- 7) Create a payment session (frontend will confirm it) ---
      const stripeCustomerId =
        await TransactionService.getOrCreateStripeCustomer(user);

      const session = await prisma.paymentSession.create({
        data: {
          id: `cr_ps_${v4()}`,
          userId: user.id,
          rideId: ride.id,
          seatsToBook: seatsBooked,
          amount: baseContribution, // base contribution (driver part)
          platformAmount: platformFee, // platform fee (commission or default)
          totalAmount: totalToAuthorize, // base + platform fee (no tax)
          currency: getDefaultCurrency(),
          // provinceCode and taxSnapshot dropped
          transactionType: TransactionType.RIDE_BOOKING, // ensure enum exists
          stripeCustomerId,
          driverAmount: baseContribution,
          discountPct: discountPercent,
          discountAmount,
          couponsToConsume: couponUsedCount,
          paymentProvider: PaymentProvider.STRIPE,
        },
      });

      // 8) return session + breakdown
      return res.status(200).json({
        success: true,
        message: isEN
          ? "Payment required to complete booking. Confirm payment to authorize funds."
          : "Paiement requis pour finaliser la réservation. Confirmez le paiement pour autoriser les fonds.",
        data: {
          sessionId: session.id,
          baseAmount: Number(session.amount),
          currency: session.currency || getDefaultCurrency(),
          yourDriveFee: originalYourDriveFee,
          discount: discountPercent,
          discountAmount,
          seatsBooked,
          totalToPay: totalToAuthorize,
          ...(useCoupons && {
            usedCoupons: couponUsedCount,
          }),
        },
      });
    }
  );

  // // Helper function to add coupon
  // static addCoupon = async (
  //   userId: number,
  //   source: CouponSource,
  //   quantity = 1
  // ) => {
  //   const expiresAt = new Date();
  //   expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  //   const newCoupon = await prisma.coupon.create({
  //     data: {
  //       userId,
  //       source,
  //       expiresAt,
  //       quantity,
  //       originalQuantity: quantity,
  //     },
  //   });
  //   return newCoupon;
  // };

  // static isUserFirstRide = async (userId: number): Promise<boolean> => {
  //   const totalCompletedRides = await prisma.ride.count({
  //     where: {
  //       status: "COMPLETED",
  //       OR: [
  //         { driverId: userId },
  //         {
  //           bookings: {
  //             some: {
  //               userId,
  //               status: BookingStatus.APPROVED,
  //               bookingSeats: { some: { attendedAt: { not: null } } },
  //             },
  //           },
  //         },
  //       ],
  //     },
  //   });

  //   return totalCompletedRides === 0;
  // };

  // static processCouponRewards = async (
  //   userId: number,
  //   isFirstRide: boolean
  // ) => {
  //   await this.addCoupon(userId, "RIDE");
  //   if (isFirstRide) {
  //     const referral = await prisma.referral.findUnique({
  //       where: { inviteeId: userId },
  //       include: {
  //         inviter: true,
  //       },
  //     });

  //     // If user was referred by someone, reward the referrer
  //     if (referral?.inviter) {
  //       await this.addCoupon(referral.inviter.id, "REFERRAL");
  //     }
  //   }
  // };

  static completeRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { rideId } = matchedData<{ rideId: number }>(req);

      // Check if user is admin
      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins are not allowed"
              : "Les administrateurs ne sont pas autorisés",
            403
          )
        );
      }

      // Find the ride with all necessary relations
      const rideExists = await prisma.ride.findUnique({
        where: { id: rideId, driverId: user.id, isDeleted: false },
        include: {
          driver: {
            include: {
              _count: {
                select: {
                  postedRides: {
                    where: { status: RideStatus.COMPLETED },
                  },
                  bookings: {
                    where: {
                      status: BookingStatus.APPROVED,
                      bookingSeats: {
                        some: {
                          attendedAt: { not: null },
                        },
                      },
                      ride: {
                        status: RideStatus.COMPLETED,
                      },
                    },
                  },
                },
              },
              receivedReferral: {
                include: {
                  inviter: true,
                },
              },
            },
          },
          vehicle: true,
          preferences: true,
          bookings: {
            where: {
              status: BookingStatus.APPROVED,
              bookingSeats: {
                some: {
                  attendedAt: { not: null },
                },
              },
            },
            include: {
              booker: {
                include: {
                  _count: {
                    select: {
                      bookings: {
                        where: {
                          status: BookingStatus.APPROVED,
                          bookingSeats: {
                            some: {
                              attendedAt: { not: null },
                            },
                          },
                          ride: {
                            status: RideStatus.COMPLETED,
                          },
                        },
                      },
                      postedRides: {
                        where: {
                          status: RideStatus.COMPLETED,
                        },
                      },
                    },
                  },
                  receivedReferral: {
                    include: {
                      inviter: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  bookingSeats: {
                    where: {
                      attendedAt: { not: null },
                    },
                  },
                },
              },
              paymentTransaction: true,
            },
          },
        },
      });

      // Basic validations
      if (!rideExists) {
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );
      }

      if (rideExists.isBlocked) {
        return next(
          AppError(isEN ? "Ride is blocked" : "Trajet est bloqué", 403)
        );
      }

      // check if the ride is in correct state 'ONGOING'
      if (rideExists.status !== RideStatus.ONGOING) {
        return next(
          AppError(
            isEN ? "Ride did not start" : "La trajet n'a pas commencé.",
            400
          )
        );
      }

      // check if it is after departure time
      if (new Date() <= rideExists.departureTime) {
        return next(
          AppError(
            isEN
              ? "Ride can not be completed before departure time"
              : "La trajet ne peut pas être complétée avant l'heure de départ.",
            400
          )
        );
      }

      const completedRide = await prisma.ride.update({
        where: {
          id: rideId,
        },
        data: {
          status: RideStatus.COMPLETED,
          completedAt: new Date(),
          bookings: {
            updateMany: {
              where: { status: "APPROVED", rideId },
              data: {
                status: "COMPLETED",
              },
            },
          },
        },
        include: {
          driver: {
            select: {
              ...profileSelects,
              averageRating: true,
              totalRatings: true,
            },
          },
          vehicle: {
            include: {
              files: { select: { ...fileSelects, userId: false } },
              defaultImage: { select: { ...fileSelects, userId: false } },
            },
          },
          preferences: true,
          departureLocation: true,
          destinationLocation: true,
          stopovers: true,
          bookings: {
            where: {
              status: { in: [BookingStatus.APPROVED, BookingStatus.COMPLETED] },
            },
            include: {
              booker: {
                select: profileSelects,
              },
            },
          },
          d2dBookingRequests: {
            where: { status: D2DBookingRequestStatus.CONFIRMED },
            include: {
              passenger: {
                select: profileSelects,
              },
            },
          },
          _count: {
            select: {
              bookingSeats: {
                where: {
                  attendedAt: { not: null },
                },
              },
            },
          },
        },
      });

      if (
        completedRide.bookings.length ||
        completedRide.d2dBookingRequests.length
      ) {
        let userIds: number[] = [];
        if (completedRide.bookings.length) {
          userIds = completedRide.bookings.map((bkg) => bkg.userId);
        } else {
          userIds = completedRide.d2dBookingRequests.map(
            (rq) => rq.passengerId
          );
        }
        await NotificationServices.notifyUsers({
          userIds,
          titleEn: "Ride Completed",
          titleFr: "Trajet terminée",
          messageEn: `The ride ${completedRide.departureLocation.city}${completedRide.departureLocation.regionCode
            ? `, ${completedRide.departureLocation.regionCode}`
            : ""
            } -> ${completedRide.destinationLocation.city}${completedRide.destinationLocation.regionCode
              ? `, ${completedRide.destinationLocation.regionCode}`
              : ""
            } marked as completed. You have 24 hours to report any issues(no-shows, misconduct, etc.). Now you can rate the driver. Thank you for riding with us!.`,
          messageFr: `La trajet ${completedRide.departureLocation.city}${completedRide.departureLocation.regionCode
            ? `, ${completedRide.departureLocation.regionCode}`
            : ""
            } -> ${completedRide.destinationLocation.city}${completedRide.destinationLocation.regionCode
              ? `, ${completedRide.destinationLocation.regionCode}`
              : ""
            } est marquée comme terminée. Vous avez 24 heures pour signaler tout problème (non-présentation, inconduite, etc.). Vous pouvez maintenant évaluer le chauffeur. Merci d'avoir pris le volant avec nous!`,
          rideId: completedRide.id,
        });
      }

      return res.status(200).json({
        success: true,
        message: isEN
          ? "Ride completed successfully."
          : "Trajet terminée avec succès.",
        data: completedRide,
      });
    }
  );

  static makeRideAttendance = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { code, rideId } = matchedData<{ code: string; rideId: number }>(
        req
      );
      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      // Check if user is admin
      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins are not allowed"
              : "Les administrateurs ne sont pas autorisés",
            403
          )
        );
      }

      const seat = await prisma.bookingSeat.findUnique({
        where: { attendanceCode: code, rideId, ride: { isDeleted: false } },
        include: {
          booking: {
            include: {
              booker: {
                include: {
                  _count: {
                    select: {
                      bookings: {
                        where: {
                          status: BookingStatus.APPROVED,
                          bookingSeats: {
                            some: {
                              attendedAt: { not: null },
                            },
                          },
                          ride: {
                            status: RideStatus.COMPLETED,
                          },
                        },
                      },
                      postedRides: {
                        where: {
                          status: RideStatus.COMPLETED,
                        },
                      },
                    },
                  },
                  receivedReferral: {
                    include: {
                      inviter: true,
                    },
                  },
                },
              },
              // _count: {
              //   select: {
              //     bookingSeats: {
              //       where: {
              //         attendedAt: { not: null },
              //       },
              //     },
              //   },
              // },
              paymentTransaction: true,
            },
          },
          ride: true,
        },
      });

      if (!seat || !seat.ride) {
        return next(
          AppError(isEN ? "Seat not found" : "Siège non trouvé", 400)
        );
      }

      // seat was expired
      if (seat.isExpired) {
        return next(
          AppError(
            isEN ? "Attendance code expired" : "Code de présence expiré",
            400
          )
        );
      }

      if (seat.ride.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Not allowed to access this ride"
              : "Non autorisé à accéder à cette trajet",
            403
          )
        );
      }
      if (seat.ride.isBlocked) {
        return next(
          AppError(
            isEN
              ? "Ride is blocked, contact support"
              : "La trajet est bloquée, contactez le support"
          )
        );
      }
      if (seat.ride.status === RideStatus.CANCELLED) {
        return next(
          AppError(
            isEN
              ? "Can not mark a seat as attended when the ride has been cancelled"
              : "Impossible de marquer un siège comme présent lorsque la trajet est annulée",
            400
          )
        );
      }

      const now = new Date();
      const thirtyMinutesBefore = new Date(
        seat.ride.departureTime.getTime() - 30 * 60 * 1000
      );
      if (now < thirtyMinutesBefore) {
        return next(
          AppError(
            isEN
              ? "Attendance can be made within at starting 30 minutes to departure time"
              : "La présence peut être enregistrée à partir de 30 minutes avant l'heure de départ.",
            403
          )
        );
      }
      if (seat.attendedAt) {
        return next(
          AppError(isEN ? "Seat already used" : "Siège déjà utilisé", 400)
        );
      }

      const markedSeat = await prisma.bookingSeat.update({
        where: { id: seat.id },
        data: { attendedAt: new Date() },
        select: {
          ride: {
            select: {
              _count: {
                select: {
                  bookingSeats: {
                    where: {
                      attendedAt: { not: null },
                    },
                  },
                },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        message: isEN
          ? "Seat marked as attended"
          : "Siège marqué comme présent",
        data: {
          attendedSeatsCount: markedSeat.ride._count.bookingSeats,
        },
      });
    }
  );

  static startRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rideId } = matchedData<{ rideId: number }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      // Check if user is admin
      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins are not allowed"
              : "Les administrateurs ne sont pas autorisés",
            403
          )
        );
      }

      const ride = await prisma.ride.findUnique({
        where: { id: rideId, driverId: user.id, isDeleted: false },
        include: {
          _count: {
            select: {
              bookings: {
                where: {
                  status: BookingStatus.APPROVED,
                },
              },
              d2dBookingRequests: {
                where: {
                  status: D2DBookingRequestStatus.CONFIRMED,
                },
              },
            },
          },
        },
      });

      if (!ride)
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );

      if (ride.isBlocked) {
        return next(
          AppError(
            isEN
              ? "Ride is blocked, contact support"
              : "La trajet est bloquée, contactez le support"
          )
        );
      }

      const now = new Date();
      const depTime = ride.departureTime.getTime();
      const thirtyMinutesBefore = new Date(depTime - 30 * 60 * 1000);
      if (now < thirtyMinutesBefore) {
        return next(
          AppError(
            isEN
              ? "The ride can be started around 30 minutes to departure time"
              : "La présence peut être enregistrée à partir de 30 minutes avant l'heure de départ.",
            403
          )
        );
      }

      // const oneHourAfterDeparture = new Date(depTime + 60 * 60 * 1000);
      // if (now > oneHourAfterDeparture) {
      //   return next(
      //     AppError(
      //       isEN
      //         ? "Ride cannot be started more than 1 hour after the scheduled departure time."
      //         : "La trajet ne peut pas être commencée plus d'une heure après l'heure de départ prévue.",
      //       400
      //     )
      //   );
      // }

      if (ride.status !== RideStatus.PUBLISHED)
        return next(
          AppError(
            isEN
              ? "Ride should be in published state."
              : "La trajet devrait être dans un état publié.",
            400
          )
        );

      // If no approved bookings, cannot start
      if (ride._count.bookings === 0 && ride._count.d2dBookingRequests === 0) {
        return next(
          AppError(
            isEN
              ? `Cannot start ride without ${ride.type === RideType.P2P
                ? "approved bookings"
                : "confirmed door to door booking requests."
              }`
              : `Impossible de commencer la course sans ${ride.type === RideType.P2P
                ? "réservations approuvées"
                : "demandes de réservation porte-à-porte confirmées."
              }`,
            400
          )
        );
      }

      const updated = await prisma.ride.update({
        where: { id: ride.id },
        data: {
          status: RideStatus.ONGOING,
          startedAt: new Date(),
        },
        include: {
          driver: {
            select: {
              ...profileSelects,
              averageRating: true,
              totalRatings: true,
            },
          },
          vehicle: {
            include: {
              files: { select: { ...fileSelects, userId: false } },
              defaultImage: { select: { ...fileSelects, userId: false } },
            },
          },
          preferences: true,
          departureLocation: true,
          destinationLocation: true,
          stopovers: true,
          bookings: {
            where: {
              status: BookingStatus.APPROVED,
            },
            include: {
              booker: {
                select: profileSelects,
              },
            },
          },
          d2dBookingRequests: {
            where: {
              status: D2DBookingRequestStatus.CONFIRMED,
            },
          },
          _count: {
            select: {
              bookingSeats: {
                where: {
                  attendedAt: { not: null },
                },
              },
            },
          },
        },
      });

      if (updated.bookings.length || updated.d2dBookingRequests.length) {
        let userIds: number[] = [];
        if (updated.bookings.length) {
          userIds = updated.bookings.map((bkg) => bkg.userId);
        } else {
          userIds = updated.d2dBookingRequests.map((rq) => rq.passengerId);
        }
        // const userIds = updated.bookings.map((bk) => bk.userId);
        await NotificationServices.notifyUsers({
          userIds,
          titleEn: "Ride Start",
          titleFr: "Départ du trajet",
          messageEn: `The ride ${updated.departureLocation.city}${updated.departureLocation.regionCode
            ? `, ${updated.departureLocation.regionCode}`
            : ""
            } -> ${updated.destinationLocation.city}${updated.destinationLocation.regionCode
              ? `, ${updated.destinationLocation.regionCode}`
              : ""
            } has started(departed).`,
          messageFr: `Le trajet ${updated.departureLocation.city}${updated.departureLocation.regionCode
            ? `, ${updated.departureLocation.regionCode}`
            : ""
            } -> ${updated.destinationLocation.city}${updated.destinationLocation.regionCode
              ? `, ${updated.destinationLocation.regionCode}`
              : ""
            } a commencé (est parti).`,
          rideId: ride.id,
        });
      }

      const { departureLocation, destinationLocation, ...rest } = updated;

      res.json({
        success: true,
        message: isEN
          ? "Ride marked as started, is now in ongoing state"
          : "La trajet marquée comme commencée est maintenant dans l'état ongoing.",
        data: {
          ...rest,
          ...(ride.type == "D2D"
            ? {
              driverStartLocation: departureLocation,
              driverStopLocation: destinationLocation,
            }
            : {
              departureLocation,
              destinationLocation,
            }),
        },
      });
    }
  );

  static publishRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rideId, useCoupons = false } = matchedData<{
        rideId: number;
        useCoupons?: boolean;
      }>(req);
      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      const ride = await prisma.ride.findUnique({
        where: { id: rideId, driverId: user.id, isDeleted: false },
        include: {
          driver: true,
          vehicle: true,
          preferences: true,
          departureLocation: true,
          destinationLocation: true,
          stopovers: true,
        },
      });

      if (!ride)
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );

      if (ride.status !== RideStatus.DRAFT)
        return next(
          AppError(
            isEN
              ? "Ride must be in draft to be published"
              : "Le trajet doit être en brouillon pour être publié.",
            400
          )
        );

      if (new Date() >= ride.departureTime)
        return next(
          AppError(
            isEN
              ? "Ride cannot be published, departure time has passed."
              : "Le trajet ne peut pas être publié, l'heure de départ est passée.",
            400
          )
        );

      let driverCouponUsed = false;
      let usedCoupons = 0;
      let totalCoupons = 0;

      if (useCoupons) {
        // Find rule for driver publishing/commission reduction
        const rule = await prisma.couponRedemptionRule.findUnique({
          where: { target: CouponTarget.RIDE_POSTING },
        });
        const requiredCoupons = rule?.requiredCoupons || 5;

        const { coupons, totalCoupons: Tc } =
          await CouponService.getUserCouponBalance(user.id);
        totalCoupons = Tc;

        if (totalCoupons < requiredCoupons) {
          return next(
            AppError(
              isEN
                ? `Insufficient coupons. You need ${requiredCoupons} but only have ${totalCoupons}`
                : `Coupons insuffisants. Vous avez besoin de ${requiredCoupons}, mais vous n'en avez que ${totalCoupons}`,
              400
            )
          );
        }

        await CouponService.redeemCoupons(
          requiredCoupons,
          coupons,
          "Driver commission discount | Remise sur la commission du chauffeur"
        );
        driverCouponUsed = true;
        usedCoupons = requiredCoupons;
      }

      const updated = await prisma.ride.update({
        where: { id: rideId },
        data: {
          status: RideStatus.PUBLISHED,
          publishedAt: new Date(),
          monitizationType: driverCouponUsed
            ? MonetizationType.COUPON
            : MonetizationType.FREE,
          appliedDriverCoupons: driverCouponUsed,
        },
        include: {
          driver: {
            select: {
              ...profileSelects,
              averageRating: true,
              totalRatings: true,
            },
          },
          vehicle: {
            include: {
              files: { select: { ...fileSelects, userId: false } },
              defaultImage: { select: { ...fileSelects, userId: false } },
            },
          },
          preferences: true,
          departureLocation: true,
          destinationLocation: true,
          stopovers: true,
        },
      });

      try {
        await RideRequestService.handleRideRequestMatches(updated);
      } catch (err) {
        // Match-making is a best-effort side effect — don't fail the request if it errors
        console.error("handleRideRequestMatches failed:", err);
      }
      const { departureLocation, destinationLocation, ...rest } = updated;

      return res.json({
        success: true,
        message: isEN
          ? "Ride published successfully."
          : "Trajet publié avec succès.",
        data: {
          ...rest,
          ...(ride.type == "D2D"
            ? {
              driverStartLocation: departureLocation,
              driverStopLocation: destinationLocation,
            }
            : {
              departureLocation,
              destinationLocation,
            }),
        },
        ...(driverCouponUsed && {
          usedCoupons,
          remainingCoupons: totalCoupons - usedCoupons,
        }),
      });
    }
  );

  /**
   * Posted-P2P-ride search. The query body, suggestions fallback, and
   * response shape live in `services/search/rideSearch.service` — the
   * canonical source of truth shared with the unauthenticated mirror
   * at `PublicRideController.list`.
   *
   * This handler is currently only reachable through the legacy public
   * route mount and so passes `viewer.isGuest = true` to preserve the
   * existing PII-stripped contract. If a future change adds an authed
   * mount, swap to `{ isGuest: false, userId: req.user!.id }` here.
   */
  static searchRides = catchAsync(async (req: Request, res: Response) => {
    const {
      page = 1,
      pageSize = 10,
      departureCity,
      destinationCity,
      departureTime,
      minContribution,
      maxContribution,
      userLatitude,
      userLongitude,
      radiusKm = 30,
      preferences = {},
      type,
      vehicleCategory,
      originCity,
      destCity,
    } = matchedData<{
      page?: number;
      pageSize?: number;
      departureCity?: string;
      destinationCity?: string;
      departureTime?: number;
      minContribution?: number;
      maxContribution?: number;
      userLatitude?: number;
      userLongitude?: number;
      radiusKm?: number;
      type?: RideType;
      vehicleCategory?: VehicleCategory;
      originCity?: string;
      destCity?: string;
      preferences?: {
        smoking?: boolean;
        pets?: boolean;
        airConditioning?: boolean;
        ladiesOnly?: boolean;
        gentsOnly?: boolean;
        bicycleSupport?: boolean;
        snowTires?: boolean;
        luggageSize?: LuggageSize;
        luggageCount?: boolean;
      };
    }>(req, { locations: ["query"] });

    const result = await listRides({
      viewer: { isGuest: true },
      filters: {
        page,
        pageSize,
        departureCity,
        destinationCity,
        departureTime,
        minContribution,
        maxContribution,
        userLatitude,
        userLongitude,
        radiusKm,
        preferences,
        type,
        vehicleCategory,
        originCity,
        destCity,
      },
    });

    return res.status(200).json({
      success: true,
      data: result.items,
      suggestions: result.items.length === 0 ? result.suggestions : [],
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  });

  // Cancel a Ride
  static cancelRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rideId, reason } = matchedData<{
        rideId: number;
        reason: string;
      }>(req);
      const user = req.user! as DbUser;

      const userId = user.id;
      const isEN = req.isEnglishPreferred;

      // Check if user is admin
      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins are not allowed"
              : "Les administrateurs ne sont pas autorisés",
            403
          )
        );
      }

      const ride = await prisma.ride.findUnique({
        where: { id: rideId, driverId: user.id, isDeleted: false },
        include: {
          _count: {
            select: {
              bookings: {
                where: {
                  status: BookingStatus.APPROVED,
                },
              },
              d2dBookingRequests: {
                where: {
                  status: D2DBookingRequestStatus.CONFIRMED,
                },
              },
            },
          },
          bookings: {
            where: {
              status: { in: [BookingStatus.APPROVED, BookingStatus.PENDING] },
            },
            include: {
              paymentTransaction: {
                where: {
                  status: {
                    in: [
                      TransactionStatus.ONHOLD,
                      TransactionStatus.PAID,
                      TransactionStatus.PARTIALLY_REFUNDED,
                      TransactionStatus.PENDING,
                    ],
                  },
                  externalReference: { not: null },
                },
              },
              booker: {
                select: {
                  language: true,
                },
              },
              redeemedCoupns: true,
            },
          },
          d2dBookingRequests: {
            where: {
              status: {
                in: [
                  D2DBookingRequestStatus.CONFIRMED,
                  D2DBookingRequestStatus.ACCEPTED,
                  D2DBookingRequestStatus.POSTED,
                ],
              },
            },
            include: {
              transaction: true,
              passenger: {
                select: {
                  language: true,
                },
              },
              redeemedCoupns: true,
            },
          },
          departureLocation: true,
          destinationLocation: true,
        },
      });

      if (!ride) {
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );
      }

      if (ride.isBlocked) {
        return next(
          AppError(
            isEN
              ? "Ride is blocked, contact support"
              : "La trajet est bloquée, contactez le support"
          )
        );
      }

      if (ride.status !== RideStatus.PUBLISHED) {
        return next(
          AppError(
            isEN
              ? "Ride should be in published state"
              : "La trajet devrait être dans l'état published"
          )
        );
      }

      if (userId !== ride.driverId) {
        return next(
          AppError(
            isEN
              ? "You are not authorised to access this ride."
              : "Vous n'êtes pas autorisé à accéder à ce trajet.",
            403
          )
        );
      }

      const bookings = ride.bookings;

      let cancelledRide = null;

      // if no approved bookings, allow cancellation
      if (ride._count.bookings === 0 || ride._count.d2dBookingRequests === 0) {
        cancelledRide = await prisma.ride.update({
          where: { id: rideId },
          data: {
            status: RideStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: reason,
            cancellationReviewed: true,
          },
          include: {
            driver: {
              select: {
                ...profileSelects,
                averageRating: true,
                totalRatings: true,
              },
            },
            vehicle: {
              include: {
                files: { select: { ...fileSelects, userId: false } },
                defaultImage: { select: { ...fileSelects, userId: false } },
              },
            },
            preferences: true,
            departureLocation: true,
            destinationLocation: true,
            stopovers: true,
          },
        });
      } else {
        // // Enforce cancellation allowance (max 1 confirmed cancellation in 6 months)
        // const sixMonthsAgo = new Date();
        // sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // const recentCancelled = await prisma.ride.count({
        //   where: {
        //     driverId: userId,
        //     cancelledAt: { gte: sixMonthsAgo },
        //     status: RideStatus.CANCELLED,
        //     cancellationCountsAgainstAllowance: YesNo.YES, // Only count rides that count against the allowance
        //   },
        // });

        // if (recentCancelled >= 1) {
        //   // only one cancellation with confirmed users allowed in 6 months
        //   return next(
        //     AppError(
        //       isEN
        //         ? "You have exceeded your cancellation allowance. You can only cancel one ride with confirmed bookings in the last 6 months."
        //         : "Vous avez dépassé votre quota d'annulation. Vous ne pouvez annuler qu'une seule trajet avec des réservations confirmées au cours des 6 derniers mois.",
        //       403
        //     )
        //   );
        // }

        cancelledRide = await prisma.ride.update({
          where: { id: rideId },
          data: {
            status: RideStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: reason,
          },
          include: {
            driver: {
              select: {
                ...profileSelects,
                averageRating: true,
                totalRatings: true,
              },
            },
            vehicle: {
              include: {
                files: { select: { ...fileSelects, userId: false } },
                defaultImage: { select: { ...fileSelects, userId: false } },
              },
            },
            preferences: true,
            departureLocation: true,
            destinationLocation: true,
            stopovers: true,
          },
        });

        // Add cancellation review on a driver's profile
        await RatingReviewService.createRatingReview(
          cancelledRide.driverId,
          cancelledRide.id,
          1, // 1 star for cancellation
          "Ride cancelled by driver | Trajet annulée par le conducteur",
          undefined,
          ReviewType.CANCELLATION
        );
      }
      if (bookings.length) {
        // Notify all bookers about the ride cancellation
        const userIds = bookings.map((bkg) => bkg.userId);

        // Refund paid transactions and cancel pending transactions and this can be done in background with queues
        const couponsToRefund: RedeemedCoupon[] = [];
        await Promise.allSettled(
          bookings.map(async (booking) => {
            const txn = booking.paymentTransaction;
            if (booking.redeemedCoupns.length) {
              couponsToRefund.concat(booking.redeemedCoupns);
            } else if (txn && txn.externalReference) {
              if (
                txn.status === TransactionStatus.PAID ||
                txn.status === TransactionStatus.PARTIALLY_REFUNDED
              ) {
                // Refund the transaction
                await TransactionService.cancelOrRefundTransaction(
                  txn,
                  "REFUND"
                );
              }
              if (
                txn.status === TransactionStatus.ONHOLD ||
                txn.status === TransactionStatus.PENDING
              ) {
                // Cancel the transaction
                await TransactionService.cancelOrRefundTransaction(
                  txn,
                  "CANCEL"
                );
              }
            }
          })
        );

        await prisma.booking.updateMany({
          where: { id: { in: bookings.map((bkg) => bkg.id) } },
          data: {
            status: BookingStatus.CANCELLED,
            reason: "Ride cancelled | Trajet annulé",
            cancelledAt: new Date(),
          },
        });

        await prisma.bookingSeat.updateMany({
          where: { bookingId: { in: bookings.map((bkg) => bkg.id) } },
          data: {
            expiredAt: new Date(),
            isExpired: true,
            expireReason: "Ride cancelled | Trajet annulé",
          },
        });

        // refund the coupons if applicable
        if (couponsToRefund.length) {
          await CouponService.refundCoupons(couponsToRefund);
        }

        await NotificationServices.notifyUsers({
          userIds,
          titleEn: "Ride Cancelled",
          titleFr: "Trajet Annulée",
          messageEn: `The ride ${ride.departureLocation?.city} -> ${ride.destinationLocation?.city} has been cancelled by the driver.`,
          messageFr: `La trajet ${ride.departureLocation?.city} -> ${ride.destinationLocation?.city} a été annulée par le conducteur.`,
          rideId: ride.id,
        });
      }

      if (ride.d2dBookingRequests.length) {
        // Notify all bookers about the ride cancellation
        const userIds = ride.d2dBookingRequests.map((bkg) => bkg.passengerId);

        // Refund paid transactions and cancel pending transactions and this can be done in background with queues
        const couponsToRefund: RedeemedCoupon[] = [];
        await Promise.allSettled(
          ride.d2dBookingRequests.map(async (booking) => {
            const txn = booking.transaction;
            if (booking.redeemedCoupns.length) {
              couponsToRefund.concat(booking.redeemedCoupns);
            }
            if (txn && txn.externalReference) {
              if (
                txn.status === TransactionStatus.PAID ||
                txn.status === TransactionStatus.PARTIALLY_REFUNDED
              ) {
                // Refund the transaction
                await TransactionService.cancelOrRefundTransaction(
                  txn,
                  "REFUND"
                );
              } else if (
                txn.status === TransactionStatus.ONHOLD ||
                txn.status === TransactionStatus.PENDING
              ) {
                // Cancel the transaction
                await TransactionService.cancelOrRefundTransaction(
                  txn,
                  "CANCEL"
                );
              }
            }
          })
        );

        await prisma.d2DBookingRequest.updateMany({
          where: { id: { in: ride.d2dBookingRequests.map((bkg) => bkg.id) } },
          data: {
            status: D2DBookingRequestStatus.CANCELED,
            reason: "Ride cancelled | Trajet annulé",
            canceledAt: new Date(),
          },
        });

        await prisma.bookingSeat.updateMany({
          where: {
            d2dBookingId: { in: ride.d2dBookingRequests.map((bkg) => bkg.id) },
          },
          data: {
            expiredAt: new Date(),
            isExpired: true,
            expireReason: "Ride cancelled | Trajet annulé",
          },
        });

        // refund the coupons if applicable
        if (couponsToRefund.length) {
          await CouponService.refundCoupons(couponsToRefund);
        }

        await NotificationServices.notifyUsers({
          userIds,
          titleEn: "Ride Cancelled",
          titleFr: "Trajet Annulée",
          messageEn: `The ride ${ride.departureLocation?.city} -> ${ride.destinationLocation?.city} has been cancelled by the driver.`,
          messageFr: `La trajet ${ride.departureLocation?.city} -> ${ride.destinationLocation?.city} a été annulée par le conducteur.`,
          rideId: ride.id,
        });
      }

      return res.status(200).json({
        success: true,
        message: isEN
          ? "Ride cancelled successfully"
          : "Trajet annulée avec succès",
        data: cancelledRide,
      });
    }
  );

  // Delete a Ride
  static deleteRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rideId } = matchedData<{
        rideId: number;
      }>(req);
      const user = req.user! as DbUser;

      const isEN = req.isEnglishPreferred;

      // Check if user is admin
      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins are not allowed"
              : "Les administrateurs ne sont pas autorisés",
            403
          )
        );
      }

      const ride = await prisma.ride.findUnique({
        where: { id: rideId, driverId: user.id, isDeleted: false },
        include: {
          _count: {
            select: {
              bookings: true,
              d2dBookingRequests: true,
            },
          },
          bookings: {
            where: {
              status: { in: [BookingStatus.APPROVED, BookingStatus.PENDING] },
            },
            include: {
              paymentTransaction: {
                where: {
                  status: {
                    in: [
                      TransactionStatus.ONHOLD,
                      TransactionStatus.PAID,
                      TransactionStatus.PARTIALLY_REFUNDED,
                      TransactionStatus.PENDING,
                    ],
                  },
                  externalReference: { not: null },
                },
              },
              booker: {
                select: {
                  language: true,
                },
              },
            },
          },
          d2dBookingRequests: {
            where: {
              status: D2DBookingRequestStatus.CONFIRMED,
            },
            include: {
              transaction: true,
            },
          },
          departureLocation: true,
          destinationLocation: true,
        },
      });

      if (!ride) {
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );
      }

      const now = new Date();
      if (
        ride.status === RideStatus.ONGOING ||
        (ride.estimatedArrivalTime &&
          now >= ride.departureTime &&
          now < ride.estimatedArrivalTime)
      ) {
        return next(
          AppError(
            isEN
              ? "Ride cannot be deleted when it is in ongoing state"
              : "La trajet ne peut pas être supprimée lorsqu'elle est dans l'état ongoing."
          )
        );
      }

      const bookings = ride.bookings;
      const approvedBookings = bookings.filter(
        (bkg) => bkg.status == BookingStatus.APPROVED
      );
      const confirmedBkgReqs = ride.d2dBookingRequests.filter(
        (rqs) => rqs.status === D2DBookingRequestStatus.CONFIRMED
      );
      // if ride is in published state and there are approved bookings, refuse to delete
      // this is to prevent deleting a ride that is in published state and has approved bookings
      if (ride.status === RideStatus.PUBLISHED && approvedBookings.length > 0) {
        return next(
          AppError(
            isEN
              ? "Sorry, Ride cannot be deleted as it has approved bookings, you can cancle the bookings first or cancle the ride first."
              : "Désolé, la trajet ne peut pas être supprimée car elle a des réservations approuvées, vous pouvez d'abord annuler les réservations ou annuler la trajet en premier."
          )
        );
      }
      if (ride.status === RideStatus.PUBLISHED && confirmedBkgReqs.length > 0) {
        return next(
          AppError(
            isEN
              ? "Sorry, Ride cannot be deleted as it has confirmed booking request, you can cancle the booking request first or cancle the ride first."
              : "Désolé, le trajet ne peut pas être supprimé car il y a une demande de réservation confirmée. Vous pouvez d'abord annuler la demande de réservation ou annuler le trajet en premier."
          )
        );
      }

      if (ride.status === RideStatus.COMPLETED && !ride.isSettled) {
        return next(
          AppError(
            isEN
              ? "Sorry, Ride cannot be deleted it is not yet fully completed!"
              : "Désolé, le trajet ne peut pas être supprimé car il n'est pas encore complètement terminé!"
          )
        );
      }

      // if ride is in draft state or no bookings, allow deleting
      if (
        ride.status === RideStatus.DRAFT ||
        (ride._count.bookings === 0 && ride._count.d2dBookingRequests === 0)
      ) {
        await prisma.ride.delete({
          where: { id: rideId },
        });
      } else {
        // We mark the ride as deleted
        await prisma.ride.update({
          where: { id: rideId },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
      }
      if (ride.status === RideStatus.PUBLISHED && bookings.length) {
        // Notify all bookers about the booking cancellations
        const bookerIds = bookings.map((bk) => bk.userId);
        await NotificationServices.notifyUsers({
          userIds: bookerIds,
          titleEn: "Booking Cancelled",
          titleFr: "Réservation annulée",
          messageEn: `The booking for the ride from ${ride.departureLocation?.city} -> ${ride.destinationLocation?.city} has been cancelled, due to the ride will not be made.`,
          messageFr: `La réservation pour le trajet de ${ride.departureLocation?.city} -> ${ride.destinationLocation?.city} a été annulée, car le trajet ne sera pas effectué.`,
          rideId: ride.id,
        });

        // Refund paid transactions and cancel pending transactions and this can be done in background with queues
        await Promise.allSettled(
          bookings.map(async (booking) => {
            const txn = booking.paymentTransaction;
            if (txn && txn.externalReference) {
              if (
                txn.status === TransactionStatus.PAID ||
                txn.status === TransactionStatus.PARTIALLY_REFUNDED
              ) {
                // Refund the transaction
                await TransactionService.cancelOrRefundTransaction(
                  txn,
                  "REFUND"
                );
              } else if (
                txn.status === TransactionStatus.ONHOLD ||
                txn.status === TransactionStatus.PENDING
              ) {
                // Cancel the transaction
                await TransactionService.cancelOrRefundTransaction(
                  txn,
                  "CANCEL"
                );
              }
            }
          })
        );

        await prisma.booking.updateMany({
          where: { id: { in: bookings.map((bkg) => bkg.id) } },
          data: {
            status: BookingStatus.CANCELLED,
            reason: "Ride cancelled",
            cancelledAt: new Date(),
          },
        });
      }
      // if id is a d2d ride
      if (
        ride.status === RideStatus.PUBLISHED &&
        ride.d2dBookingRequests.length
      ) {
        // Notify all bookers about the booking cancellations
        const bookerIds = ride.d2dBookingRequests.map((bk) => bk.passengerId);
        await NotificationServices.notifyUsers({
          userIds: bookerIds,
          titleEn: "Booking Cancelled",
          titleFr: "Réservation annulée",
          messageEn: `The booking for the ride from ${ride.departureLocation?.city} -> ${ride.destinationLocation?.city} has been cancelled, due to the ride will not be made.`,
          messageFr: `La réservation pour le trajet de ${ride.departureLocation?.city} -> ${ride.destinationLocation?.city} a été annulée, car le trajet ne sera pas effectué.`,
          rideId: ride.id,
        });

        // Refund paid transactions and cancel pending transactions and this can be done in background with queues
        await Promise.allSettled(
          ride.d2dBookingRequests.map(async (bookingReq) => {
            const txn = bookingReq.transaction;
            if (txn && txn.externalReference) {
              if (
                txn.status === TransactionStatus.PAID ||
                txn.status === TransactionStatus.PARTIALLY_REFUNDED
              ) {
                // Refund the transaction
                await TransactionService.cancelOrRefundTransaction(
                  txn,
                  "REFUND"
                );
              } else if (
                txn.status === TransactionStatus.ONHOLD ||
                txn.status === TransactionStatus.PENDING
              ) {
                // Cancel the transaction
                await TransactionService.cancelOrRefundTransaction(
                  txn,
                  "CANCEL"
                );
              }
            }
          })
        );

        await prisma.d2DBookingRequest.updateMany({
          where: { id: { in: ride.d2dBookingRequests.map((bkg) => bkg.id) } },
          data: {
            status: D2DBookingRequestStatus.CANCELED,
            reason: "Ride cancelled",
            canceledAt: new Date(),
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: isEN
          ? "Ride deleted successfully"
          : "Trajet supprimé avec succès",
      });
    }
  );

  // Block a Ride or edit the blocking reason
  static blockRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rideId, reason } = matchedData<{
        rideId: number;
        reason: string;
      }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const ride = await prisma.ride.findUnique({
        where: { id: rideId, isDeleted: false },
      });

      if (!ride) {
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );
      }

      const blocked = await prisma.ride.update({
        where: { id: rideId },
        data: {
          isBlocked: true,
          blockedAt: new Date(),
          blockingReason: reason,
          blockerId: user.id,
        },
        include: {
          driver: {
            select: {
              ...profileSelects,
              averageRating: true,
              totalRatings: true,
            },
          },
          vehicle: {
            include: {
              files: { select: { ...fileSelects, userId: false } },
              defaultImage: { select: { ...fileSelects, userId: false } },
            },
          },
          preferences: true,
          departureLocation: true,
          destinationLocation: true,
          stopovers: true,
        },
      });

      const { departureLocation, destinationLocation, ...rest } = blocked;

      return res.status(200).json({
        success: true,
        message: isEN
          ? ride.isBlocked
            ? "Blocking reason successfully updated."
            : `Ride is successfully blocked.`
          : ride.isBlocked
            ? "La raison de blocage a été mise à jour avec succès."
            : `Le trajet est réussi bloqué.`,
        data: {
          ...rest,
          ...(ride.type == "D2D"
            ? {
              driverStartLocation: departureLocation,
              driverStopLocation: destinationLocation,
            }
            : {
              departureLocation,
              destinationLocation,
            }),
        },
      });
    }
  );

  // Unblock a Ride
  static ubblockRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rideId } = matchedData<{
        rideId: number;
      }>(req);

      const isEN = req.isEnglishPreferred;

      const ride = await prisma.ride.findUnique({
        where: { id: rideId, isDeleted: false },
      });

      if (!ride) {
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );
      }
      if (!ride.isBlocked) {
        return next(
          AppError(
            isEN ? "Ride is not blocked" : "La trajet n'est pas bloquée",
            400
          )
        );
      }

      const unblocked = await prisma.ride.update({
        where: { id: rideId },
        data: {
          isBlocked: false,
          blockedAt: null,
          blockingReason: null,
          blockerId: null,
        },
        include: {
          driver: {
            select: {
              ...profileSelects,
              averageRating: true,
              totalRatings: true,
            },
          },
          vehicle: {
            include: {
              files: { select: { ...fileSelects, userId: false } },
              defaultImage: { select: { ...fileSelects, userId: false } },
            },
          },
          preferences: true,
          departureLocation: true,
          destinationLocation: true,
          stopovers: true,
        },
      });

      const { departureLocation, destinationLocation, ...rest } = unblocked;
      return res.status(200).json({
        success: true,
        message: isEN
          ? `Ride is successfully unblocked.`
          : `Le trajet est réussi débloqué.`,
        data: {
          ...rest,
          ...(ride.type == "D2D"
            ? {
              driverStartLocation: departureLocation,
              driverStopLocation: destinationLocation,
            }
            : {
              departureLocation,
              destinationLocation,
            }),
        },
      });
    }
  );

  static reviewRideCancellation = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rideId, cancellationCountsAgainstAllowance } = matchedData<{
        rideId: number;
        cancellationCountsAgainstAllowance: YesNo;
      }>(req);
      const isEN = req.isEnglishPreferred;
      const user = req.user!;

      const ride = await prisma.ride.findUnique({
        where: { id: rideId, isDeleted: false },
      });

      if (!ride) {
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );
      }

      if (ride.status !== RideStatus.CANCELLED) {
        return next(
          AppError(
            isEN
              ? "Only cancelled rides can be reviewed"
              : "Seules les trajets annulées peuvent être examinées",
            400
          )
        );
      }

      if (ride.cancellationReviewed) {
        return next(
          AppError(
            isEN
              ? "Ride cancellation has already been reviewed"
              : "L'annulation de la trajet a déjà été examinée",
            400
          )
        );
      }

      const updated = await prisma.ride.update({
        where: { id: rideId },
        data: {
          cancellationReviewed: true,
          cancellationReviewedAt: new Date(),
          cancellationReviewedById: user.id,
          cancellationCountsAgainstAllowance,
        },
        include: {
          driver: {
            select: {
              ...profileSelects,
              averageRating: true,
              totalRatings: true,
            },
          },
          vehicle: {
            include: {
              files: { select: { ...fileSelects, userId: false } },
              defaultImage: { select: { ...fileSelects, userId: false } },
            },
          },
          preferences: true,
          departureLocation: true,
          destinationLocation: true,
          stopovers: true,
        },
      });
      const { departureLocation, destinationLocation, ...rest } = updated;

      return res.status(200).json({
        success: true,
        message: isEN
          ? "Ride cancellation is successfull reviewed."
          : "L'annulation de la trajet a été examinée avec succès.",
        data: {
          ...rest,
          ...(ride.type == "D2D"
            ? {
              driverStartLocation: departureLocation,
              driverStopLocation: destinationLocation,
            }
            : {
              departureLocation,
              destinationLocation,
            }),
        },
      });
    }
  );

  static createFromSchedule = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { routeDepartureId, date } = req.body as { routeDepartureId: number; date: string };
    if (routeDepartureId == null || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      return next(AppError("routeDepartureId and date (YYYY-MM-DD) are required", 400));
    }
    try {
      const ride = await findOrCreateScheduledRide({ routeDepartureId: Number(routeDepartureId), date });
      res.json({ ride });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "DEPARTURE_NOT_FOUND") return next(AppError("Departure not found", 404));
      if (msg === "PAST_DEPARTURE") return next(AppError("That departure is in the past", 400));
      throw e;
    }
  });

  static getManifest = catchAsync(async (req: Request, res: Response) => {
    const rideId = Number(req.params.id);
    const driverId = (req.user as any).id;
    const ride = await prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
      select: { id: true, driverId: true },
    });
    if (ride.driverId !== driverId) return res.status(403).json({ error: "NOT_RIDE_DRIVER" });
    const seats = await prisma.bookingSeat.findMany({
      where: { rideId, isExpired: false },
      select: {
        id: true, attendanceCode: true, attendedAt: true,
        booking: {
          select: {
            seats: true,
            boardingStop: { select: { name: true } },
            booker: { select: { firstName: true, lastName: true, phoneNumber: true } },
          },
        },
      },
    });
    const bookingSeats = seats.map(s => ({
      id: s.id,
      attendanceCode: s.attendanceCode,
      attendedAt: s.attendedAt,
      passengerName: s.booking ? `${s.booking.booker.firstName} ${s.booking.booker.lastName}`.trim() : "Walk-up",
      seats: s.booking?.seats ?? 1,
      boardingStop: s.booking?.boardingStop?.name ?? null,
    }));
    res.json({ bookingSeats });
  });
}
