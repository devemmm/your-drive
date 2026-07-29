import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import { DbUser, fileSelects, profileSelects } from "../types";
import {
  RideStatus,
  RideType,
  UserRole,
  LuggageSize,
  D2DBookingRequestStatus,
  FeeType,
  CouponTarget,
  TransactionType,
  PaymentProvider,
  TransactionStatus,
  ReviewType,
  Prisma,
  RideRequest,
} from "@prisma/client";
import { getDefaultCurrency } from "../utils/currency";
import { NotificationServices } from "../services/notification.service";
import { CouponService } from "../services/coupon.service";
import { TransactionService } from "../services/transaction.service";
import {
  D2DBookingReqPayload,
  D2DRidePayload,
} from "../middlewares/validators/d2d.request.validator";
import { v4 } from "uuid";
import { stripe } from "../config/stripe";
import { RatingReviewService } from "../services/ratingReview.service";
import moment from "moment";

async function getD2DConfig() {
  try {
    const settings = await prisma.d2DSetting.findFirst();

    return {
      maxRadius: Number(settings?.maxRadiusKm ?? 25),
      maxPricePerExtraKm: Number(settings?.maxPricePerExtraKm ?? 1.0),
      // cancellationFeeAfterAccepted: Number(
      //   settings?.cancellationFeeAfterAccepted ?? 0
      // ),
    };
  } catch (err) {
    console.error("getD2DConfig error:", err);
    return {
      maxRadius: 25,
      maxPricePerExtraKm: 1,
      // cancellationFeeAfterAccepted: 0,
    };
  }
}

async function getDistanceBetweenPoints(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  try {
    const result = await prisma.$queryRaw<
      Array<{ distance: number }>
    >`SELECT ST_Distance(
        ST_MakePoint(${lng1}, ${lat1})::geography,
        ST_MakePoint(${lng2}, ${lat2})::geography
      ) / 1000 as distance`;
    return result[0]?.distance || 0;
  } catch (error) {
    console.error("Error calculating distance:", error);
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
  }
}

export class D2DController {
  static createD2DRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData<D2DRidePayload>(req);
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

      // Validate driver onboarding
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

      const { maxRadius, maxPricePerExtraKm } = await getD2DConfig();

      // Validate service radius
      if (data.detourRadius > maxRadius)
        return next(
          AppError(
            isEN
              ? `Service radius can not exceed ${maxRadius}km.`
              : `Le rayon de service ne peut pas dépasser ${maxRadius} km.`,
            400
          )
        );

      if (data.extraKmPrice > maxPricePerExtraKm)
        return next(
          AppError(
            isEN
              ? `Price per extra kilometer can not exceed $${maxPricePerExtraKm}.`
              : `Le prix par kilomètre supplémentaire ne peut pas dépasser $${maxPricePerExtraKm}.`,
            400
          )
        );

      // if the contribution method is via platform, check if the stripe account is onboarded
      if (!user.isStripeOnboarded) {
        return res.status(400).json({
          success: false,
          message: isEN
            ? "You must complete Stripe onboarding before posting a ride"
            : "Vous devez terminer l'intégration Stripe avant de publier un trajet",
          errorCode: "STRIPE_NOT_ONBOARDED",
        });
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
      }

      // Check for overlapping rides for this driver
      const overlapRide = await prisma.ride.findFirst({
        where: {
          driverId: user.id,
          isDeleted: false,
          status: { notIn: [RideStatus.CANCELLED, RideStatus.COMPLETED, RideStatus.EXPIRED] },
          AND: [
            {
              departureTime: {
                lt: new Date(data.estimatedArrivalTime),
              },
            },
            {
              estimatedArrivalTime: {
                gt: new Date(data.departureTime),
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
              ? `You already have a ride that overlaps with the selected time period. Existing ride: ${overlapRide.departureLocation.city}, ${overlapRide.departureLocation.regionCode} to ${overlapRide.destinationLocation.city}, ${overlapRide.destinationLocation.regionCode} set to depart at ${overlapRide.departureTime.toLocaleString("en-CA", { timeZone: "UTC" })}, estimated to end ${new Date(overlapRide.estimatedArrivalTime!).toLocaleDateString("en-CA", { timeZone: "UTC" })} GMT.`
              : `Vous avez déjà un trajet qui chevauche la période sélectionnée. Trajet existant: ${overlapRide.departureLocation.city}, ${overlapRide.departureLocation.regionCode} à ${overlapRide.destinationLocation.city}, ${overlapRide.destinationLocation.regionCode} le ${overlapRide.departureTime.toLocaleString("fr-CA", { timeZone: "UTC" })}, estimé se terminer le ${new Date(overlapRide.estimatedArrivalTime!).toLocaleDateString("fr-CA", { timeZone: "UTC" })} GMT.`,
            400
          )
        );
      }

      // Check vehicle availability
      const newDeparture = new Date(data.departureTime);
      const newArrival = new Date(data.estimatedArrivalTime);

      const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });

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
          vehicleId: data.vehicleId,
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
      };

      // check the existance of the ride request
      let rr: RideRequest | null = null;
      if (data.rideRequestId) {
        rr = await prisma.rideRequest.findUnique({ where: { id: data.rideRequestId } })
      };

      // regionCode is no longer derived from province lookup (Rwanda-first; tax model removed).
      const driverStartLocation = await prisma.location.create({
        data: {
          region: data.driverStartLocation.region,
          city: data.driverStartLocation.city,
          address: data.driverStartLocation.address,
          locationName: data.driverStartLocation.locationName,
          latitude: data.driverStartLocation.latitude,
          longitude: data.driverStartLocation.longitude,
          description: data.driverStartLocation.description,
          regionCode: null,
        },
      });
      await prisma.$executeRaw`
                UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${driverStartLocation.longitude}, ${driverStartLocation.latitude}), 4326)
                WHERE id=${driverStartLocation.id}
              `;

      const driverEndLocation = await prisma.location.create({
        data: {
          region: data.driverStopLocation.region,
          city: data.driverStopLocation.city,
          address: data.driverStopLocation.address,
          locationName: data.driverStopLocation.locationName,
          latitude: data.driverStopLocation.latitude,
          longitude: data.driverStopLocation.longitude,
          description: data.driverStopLocation.description,
          regionCode: null,
        },
      });
      await prisma.$executeRaw`
                UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${driverEndLocation.longitude}, ${driverEndLocation.latitude}), 4326)
                WHERE id=${driverEndLocation.id}
              `;

      // Create D2D ride
      const ride = await prisma.ride.create({
        data: {
          driverId: user.id,
          vehicleId: data.vehicleId,
          departureTime: new Date(data.departureTime),
          estimatedArrivalTime: new Date(data.estimatedArrivalTime),
          availableSeats: data.availableSeats,
          totalSeats: data.availableSeats,
          contribution: data.contribution,
          status: RideStatus.DRAFT,
          type: RideType.D2D,
          detourRadius: data.detourRadius,
          extraKmPrice: data.extraKmPrice,
          departureLocationId: driverStartLocation.id,
          destinationLocationId: driverEndLocation.id,
          preferences: { create: { ...data.preferences } },
          ...rr && {
            rideRequestId: rr.id,
          },
          isLocked: false,
          chatThread: {
            create: {
              ownerId: user.id,
              users: { connect: { id: user.id } },
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
          departureLocation: true,
          destinationLocation: true,
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

      const { departureLocation, destinationLocation, ...rst } = ride;

      res.status(201).json({
        success: true,
        message: isEN
          ? "D2D ride created successfully with service radius"
          : "Trajet D2D créé avec succès avec rayon de service",
        data: {
          ...rst,
          driverStartLocation: departureLocation,
          driverStopLocation: destinationLocation,
        },
      });
    }
  );

  static updateD2DRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const body = matchedData<
        D2DRidePayload & {
          rideId: number;
        }
      >(req);

      const user = req.user as DbUser;
      const isEN = req.isEnglishPreferred;

      // Only drivers can update their own rides
      if (user.role === UserRole.ADMIN) {
        return next(AppError(isEN ? "Not allowed" : "Non autorisé", 403));
      }

      const ride = await prisma.ride.findUnique({
        where: { id: body.rideId, driverId: user.id, isDeleted: false },
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

      const { maxRadius, maxPricePerExtraKm } = await getD2DConfig();

      // Validate service radius
      if (body.detourRadius > maxRadius)
        return next(
          AppError(
            isEN
              ? `Service radius can not exceed ${maxRadius}km.`
              : `Le rayon de service ne peut pas dépasser ${maxRadius} km.`,
            400
          )
        );

      if (body.extraKmPrice > maxPricePerExtraKm)
        return next(
          AppError(
            isEN
              ? `Price per extra kilometer can not exceed $${maxPricePerExtraKm}.`
              : `Le prix par kilomètre supplémentaire ne peut pas dépasser $${maxPricePerExtraKm}.`,
            400
          )
        );

      // Check for overlapping rides for this driver but not this ride
      const overlapRide = await prisma.ride.findFirst({
        where: {
          driverId: user.id,
          isDeleted: false,
          id: { not: body.rideId },
          status: { notIn: [RideStatus.CANCELLED, RideStatus.COMPLETED, RideStatus.EXPIRED] },
          AND: [
            {
              departureTime: {
                lt: new Date(body.estimatedArrivalTime),
              },
            },
            {
              estimatedArrivalTime: {
                gt: new Date(body.departureTime),
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
      const newDeparture = new Date(body.departureTime);
      const newArrival = new Date(body.estimatedArrivalTime);

      const vehicle = await prisma.vehicle.findUnique({ where: { id: body.vehicleId } });

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
          vehicleId: body.vehicleId,
          isDeleted: false,
          id: { not: body.rideId },
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
        body.preferences &&
        body.preferences.luggageSize === LuggageSize.NONE
      ) {
        body.preferences.luggageCount = undefined;
      }

      // Update departure and destination locations separately
      const dsl = await prisma.location.update({
        where: { id: ride.departureLocationId },
        data: {
          ...body.driverStartLocation,
          regionCode: null,
        },
      });
      await prisma.$executeRaw`
                UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${dsl.longitude}, ${dsl.latitude}), 4326)
                WHERE id=${dsl.id}
              `;

      const del = await prisma.location.update({
        where: { id: ride.destinationLocationId },
        data: {
          ...body.driverStopLocation,
          regionCode: null,
        },
      });

      await prisma.$executeRaw`
                UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${del.longitude}, ${del.latitude}), 4326)
                WHERE id=${del.id}
              `;

      const updated = await prisma.ride.update({
        where: { id: ride.id },
        data: {
          vehicleId: body.vehicleId,
          departureTime: new Date(body.departureTime),
          estimatedArrivalTime: new Date(body.estimatedArrivalTime),
          availableSeats: body.availableSeats,
          totalSeats: body.availableSeats,
          contribution: body.contribution,
          detourRadius: body.detourRadius,
          extraKmPrice: body.extraKmPrice,
          preferences: {
            update: { ...body.preferences },
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
          vehicle: {
            include: {
              files: { select: { ...fileSelects, userId: false } },
              defaultImage: { select: { ...fileSelects, userId: false } },
            },
          }
        },
      });

      const { departureLocation, destinationLocation, ...rst } = updated;

      return res.json({
        success: true,
        message: isEN
          ? "Ride updated successfully."
          : "Trajet mis à jour avec succès.",
        data: {
          ...rst,
          driverStartLocation: departureLocation,
          driverStopLocation: destinationLocation,
        },
      });
    }
  );

  static requestToBookAD2DRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData<D2DBookingReqPayload>(req);

      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      const ride = await prisma.ride.findUnique({
        where: { id: data.rideId, isDeleted: false },
        include: {
          driver: {
            select: profileSelects,
          },
          departureLocation: true,
          destinationLocation: true,
          vehicle: true,
        },
      });
      if (
        !ride ||
        ride.type !== RideType.D2D ||
        ride.status !== RideStatus.PUBLISHED
      )
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );

      if (ride.isLocked) {
        return next(
          AppError(
            isEN
              ? "This ride is no longer available (already booked)."
              : "Ce trajet n'est plus disponible (déjà réservé).",
            400
          )
        );
      }

      if (ride.driverId == user.id) {
        return next(
          AppError(
            isEN
              ? "You can not request to book your own ride."
              : "Vous ne pouvez pas demander à réserver votre propre trajet.",
            403
          )
        );
      }
      const pickupProvinceCode = null;
      const dropoffProvinceCode = null;

      // if (
      //   data.pickup.city.toLowerCase() !==
      //     ride.departureLocation.city.toLowerCase() ||
      //   pickupProvinceCode !== ride.departureLocation.regionCode
      // ) {
      //   return next(
      //     AppError(
      //       isEN
      //         ? "The pickup city does not match the driver's departure city."
      //         : "La ville de ramassage ne correspond pas à la ville de départ du conducteur.",
      //       400
      //     )
      //   );
      // }
      // if (
      //   data.dropoff.city.toLowerCase() !==
      //     ride.destinationLocation.city.toLowerCase() ||
      //   dropoffProvinceCode !== ride.destinationLocation.regionCode
      // ) {
      //   return next(
      //     AppError(
      //       isEN
      //         ? "The dropoff city does not match the driver's destination city."
      //         : "La ville de dépôt ne correspond pas à la ville de destination du conducteur.",
      //       400
      //     )
      //   );
      // }

      const allowedRadius = ride.detourRadius || 0;
      const extraKmPrice = ride.extraKmPrice || 0;

      // const detourDistanceFromDriverToDeparture =
      //   Math.round(
      //     (await getDistanceBetweenPoints(
      //       ride.departureLocation.latitude,
      //       ride.departureLocation.longitude,
      //       data.pickup.latitude,
      //       data.pickup.longitude
      //     )) * 100
      //   ) / 100;

      const extraKms = data.pickupExtraKms + data.dropoffExtraKms;
      const extraCharge = Math.round(extraKms * extraKmPrice * 100) / 100;
      // const withinRadius = extraKms === 0;

      const pickupPayload = data["pickup"];
      const pickupLocationData = {
        regionCode: pickupProvinceCode,
        locationName:
          (pickupPayload.locationName as string) ||
          (pickupPayload.address as string) ||
          (pickupPayload.city as string) ||
          // (pickupPayload.name as string) ||
          "Unnamed location",
        region: String(pickupPayload.region ?? ""),
        city: String(pickupPayload.city ?? ""),
        latitude: Number(pickupPayload.latitude ?? 0),
        longitude: Number(pickupPayload.longitude ?? 0),
        address: pickupPayload?.address,
        description: pickupPayload?.description,
      };
      const pickup = await prisma.location.create({
        data: pickupLocationData,
      });
      await prisma.$executeRaw`
                UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${pickup.longitude}, ${pickup.latitude}), 4326)
                WHERE id=${pickup.id}
              `;

      const dropoffPayload = data["dropoff"];
      const dropoffLocationData = {
        regionCode: dropoffProvinceCode,
        locationName:
          dropoffPayload.locationName ||
          dropoffPayload.address ||
          dropoffPayload.city ||
          // (dropoffPayload.name as string) ||
          "Unnamed location",
        region: String(dropoffPayload.region ?? ""),
        city: String(dropoffPayload.city ?? ""),
        latitude: Number(dropoffPayload.latitude ?? 0),
        longitude: Number(dropoffPayload.longitude ?? 0),
        address: dropoffPayload?.address,
        description: dropoffPayload?.description,
      };
      const dropoff = await prisma.location.create({
        data: dropoffLocationData,
      });
      await prisma.$executeRaw`
                UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${dropoff.longitude}, ${dropoff.latitude}), 4326)
                WHERE id=${dropoff.id}
              `;

      const basePrice = ride.contribution;
      const totalAmount = Math.round((basePrice + extraCharge) * 100) / 100;

      const request = await prisma.d2DBookingRequest.create({
        data: {
          rideId: ride.id,
          passengerId: user.id,
          pickupLocationId: pickup.id,
          dropoffLocationId: dropoff.id,
          detourDistance: data.pickupExtraKms + data.dropoffExtraKms + (allowedRadius * 2),
          pickupExtraKms: data.pickupExtraKms,
          dropoffExtraKms: data.dropoffExtraKms,
          totalAmount,
          status: D2DBookingRequestStatus.POSTED,
          extraKms: extraKms,
          extraKmsAmount: extraCharge,
        },
        include: {
          passenger: {
            select: profileSelects,
          },
          ride: {
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
          },
          pickupLocation: true,
          dropoffLocation: true,
        },
      });

      await NotificationServices.notifyUsers({
        userIds: [ride.driverId],
        titleEn: "New D2D Request",
        titleFr: "Nouvelle demande D2D",
        messageEn: `Passenger requested a ride. Pickup detour distance: ${(data.pickupExtraKms + allowedRadius).toFixed(
          2
        )}km, dropoff detour distance: ${(data.dropoffExtraKms + allowedRadius).toFixed(
          2
        )}km, Total: $${totalAmount.toFixed(2)}`,
        messageFr: `Le passager a demandé une trajet. Distance de détour pour la prise en charge : ${(data.pickupExtraKms + allowedRadius).toFixed(2)} km, distance de détour pour le dépôt : ${(data.dropoffExtraKms + allowedRadius).toFixed(2)} km, Total : $${totalAmount.toFixed(2)}`,
        rideId: ride.id,
      });

      const { departureLocation, destinationLocation, ...restRide } =
        request.ride;

      res.status(201).json({
        success: true,
        message: isEN ? "D2D request submitted." : "Demande D2D soumise.",
        data: {
          ...request,
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          },
        },
      });
    }
  );

  static bookAD2DRide = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData<{
        rideId: number;
        pickupExtraKms: number;
        dropoffExtraKms: number;
        useCoupons?: boolean;
      }>(req);

      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      const ride = await prisma.ride.findUnique({
        where: { id: data.rideId, isDeleted: false },
        include: {
          driver: {
            select: profileSelects,
          },
          departureLocation: true,
          destinationLocation: true,
          vehicle: true,
          rideRequest: true,
        },
      });
      if (
        !ride ||
        ride.type !== RideType.D2D ||
        ride.status !== RideStatus.PUBLISHED
      )
        return next(
          AppError(isEN ? "Ride not found" : "Trajet non trouvé", 404)
        );

      if (ride.isLocked) {
        return next(
          AppError(
            isEN
              ? "This ride is no longer available (already booked)."
              : "Ce trajet n'est plus disponible (déjà réservé).",
            400
          )
        );
      }

      if (ride.driverId == user.id) {
        return next(
          AppError(
            isEN
              ? "You can not request to book your own ride."
              : "Vous ne pouvez pas demander à réserver votre propre trajet.",
            403
          )
        );
      }

      if (data.useCoupons && ride.appliedDriverCoupons) {
        return next(
          AppError(
            isEN
              ? "A driver loyalty coupon is active on this trip. Passenger coupons cannot be applied this time."
              : "Un coupon de fidélité conducteur est actif sur ce trajet. Les coupons passagers ne peuvent pas être appliqués cette fois.",
            400
          )
        );
      }

      // check if the requester of the ride
      if (!ride.rideRequest || ride.rideRequest.userId !== user.id) {
        return next(
          AppError(
            isEN ? "You are not authorized to book this ride." : "Vous n'êtes pas autorisé à réserver ce trajet.",
            403
          )
        );
      };

      const allowedRadius = ride.detourRadius || 0;
      const extraKmPrice = ride.extraKmPrice || 0;

      const extraKms = data.pickupExtraKms + data.dropoffExtraKms;
      const extraCharge = Math.round(extraKms * extraKmPrice * 100) / 100;

      // const pickupPayload = data["pickup"];
      // const pickupLocationData = {
      //   regionCode: pickupProvinceCode,
      //   locationName:
      //     (pickupPayload.locationName as string) ||
      //     (pickupPayload.address as string) ||
      //     (pickupPayload.city as string) ||
      //     // (pickupPayload.name as string) ||
      //     "Unnamed location",
      //   region: String(pickupPayload.region ?? ""),
      //   city: String(pickupPayload.city ?? ""),
      //   latitude: Number(pickupPayload.latitude ?? 0),
      //   longitude: Number(pickupPayload.longitude ?? 0),
      //   address: pickupPayload?.address,
      //   description: pickupPayload?.description,
      // };
      // const pickup = await prisma.location.create({
      //   data: pickupLocationData,
      // });
      // await prisma.$executeRaw`
      //           UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${pickup.longitude}, ${pickup.latitude}), 4326)
      //           WHERE id=${pickup.id}
      //         `;

      // const dropoffPayload = data["dropoff"];
      // const dropoffLocationData = {
      //   regionCode: dropoffProvinceCode,
      //   locationName:
      //     dropoffPayload.locationName ||
      //     dropoffPayload.address ||
      //     dropoffPayload.city ||
      //     // (dropoffPayload.name as string) ||
      //     "Unnamed location",
      //   region: String(dropoffPayload.region ?? ""),
      //   city: String(dropoffPayload.city ?? ""),
      //   latitude: Number(dropoffPayload.latitude ?? 0),
      //   longitude: Number(dropoffPayload.longitude ?? 0),
      //   address: dropoffPayload?.address,
      //   description: dropoffPayload?.description,
      // };
      // const dropoff = await prisma.location.create({
      //   data: dropoffLocationData,
      // });
      // await prisma.$executeRaw`
      //           UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${dropoff.longitude}, ${dropoff.latitude}), 4326)
      //           WHERE id=${dropoff.id}
      //         `;

      const basePrice = ride.contribution;
      const totalAmount = Math.round((basePrice + extraCharge) * 100) / 100;

      const request = await prisma.d2DBookingRequest.create({
        data: {
          rideId: ride.id,
          passengerId: user.id,
          pickupLocationId: ride.rideRequest.originId!,
          dropoffLocationId: ride.rideRequest.destinationId!,
          detourDistance: data.pickupExtraKms + data.dropoffExtraKms + (allowedRadius * 2),
          pickupExtraKms: data.pickupExtraKms,
          dropoffExtraKms: data.dropoffExtraKms,
          totalAmount,
          status: D2DBookingRequestStatus.ACCEPTED,
          extraKms: extraKms,
          extraKmsAmount: extraCharge,
        },
        include: {
          passenger: {
            select: profileSelects,
          },
          ride: {
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
          },
          pickupLocation: true,
          dropoffLocation: true,
        },
      });

      // await NotificationServices.notifyUsers({
      //   userIds: [ride.driverId],
      //   titleEn: "New D2D Request",
      //   titleFr: "Nouvelle demande D2D",
      //   messageEn: `Passenger requested a ride. Pickup detour distance: ${(data.pickupExtraKms + allowedRadius).toFixed(
      //     2
      //   )}km, dropoff detour distance: ${(data.dropoffExtraKms + allowedRadius).toFixed(
      //     2
      //   )}km, Total: $${totalAmount.toFixed(2)}`,
      //   messageFr: `Le passager a demandé une trajet. Distance de détour pour la prise en charge : ${(data.pickupExtraKms + allowedRadius).toFixed(2)} km, distance de détour pour le dépôt : ${(data.dropoffExtraKms + allowedRadius).toFixed(2)} km, Total : $${totalAmount.toFixed(2)}`,
      //   rideId: ride.id,
      // });

      // const { departureLocation, destinationLocation, ...restRide } =
      //   request.ride;

      // initialize payments
      // Prevent passenger coupon if driver coupon used on this ride

      // Commission & fee calculation ---
      // Note: obtain commission settings from DB or config
      const commissionSetting = await prisma.commissionSettings.findFirst();

      const commissionRate = Number(commissionSetting?.rate || 10) / 100; // stored as decimal like 0.10
      // const defaultPlatformFee = Number(defaultFeeSetting?.amount || 1.0); // e.g., $1

      const baseContribution = Math.floor(totalAmount * 100) / 100;

      // if contribution is zero use defaultPlatformFee as platform fee
      let platformFee = 0;
      if (baseContribution === 0) {
        const defaultFeeSetting = await prisma.feeSetting.findFirst({
          where: { active: true, type: FeeType.DEFAULT_PLATFORM_FEE },
        });
        platformFee = Math.ceil((defaultFeeSetting?.amount || 1) * 100) / 100;
      } else {
        platformFee = Math.ceil(baseContribution * commissionRate * 100) / 100;
      }

      // Passenger coupon flow: coupon only reduces platformFee
      let discountAmount = 0;
      let couponUsedCount = 0;
      let discountPercent = 0;
      const originalYourDriveFee = platformFee;
      if (data.useCoupons) {
        const rule = await prisma.couponRedemptionRule.findUnique({
          where: { target: CouponTarget.RIDE_BOOKING },
        });
        const requiredCoupons = rule?.requiredCoupons ?? 5;
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

      // Final total to be authorized (no tax math) ---
      const totalToAuthorize = baseContribution + platformFee;

      // Create a payment session (frontend will confirm it) ---
      const stripeCustomerId =
        await TransactionService.getOrCreateStripeCustomer(user);

      const session = await prisma.paymentSession.create({
        data: {
          id: `cr_ps_${v4()}`,
          userId: user.id,
          rideId: request.rideId,
          // seatsToBook: seatsBooked,
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
          d2dBookingId: request.id,
        },
      });

      // return session + breakdown
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
          extraKmsAmount: extraCharge,
          totalToPay: totalToAuthorize,
          ...(data.useCoupons && {
            usedCoupons: couponUsedCount,
          }),
        },
      });


      // res.status(201).json({
      //   success: true,
      //   message: isEN ? "D2D request submitted." : "Demande D2D soumise.",
      //   data: {
      //     ...request,
      //     ride: {
      //       ...restRide,
      //       driverStartLocation: departureLocation,
      //       driverStopLocation: destinationLocation,
      //     },
      //   },
      // });
    }
  );

  static acceptD2DRequest = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId } = matchedData<{ requestId: number }>(req);
      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      const reqData = await prisma.d2DBookingRequest.findUnique({
        where: { id: requestId },
        include: {
          passenger: {
            select: profileSelects,
          },
          ride: {
            include: {
              driver: {
                select: profileSelects,
              },
              vehicle: true,
              departureLocation: true,
              destinationLocation: true,
              _count: {
                select: {
                  d2dBookingRequests: {
                    where: {
                      status: D2DBookingRequestStatus.ACCEPTED,
                    },
                  },
                },
              },
            },
          },
          pickupLocation: true,
          dropoffLocation: true,
        },
      });

      if (!reqData)
        return next(
          AppError(
            isEN
              ? "Booking request not found."
              : "Demande de réservation introuvable",
            404
          )
        );
      if (reqData.ride.driverId !== user.id)
        return next(AppError(isEN ? "Unauthorized." : "Non autorisé.", 403));
      if (reqData.status !== D2DBookingRequestStatus.POSTED)
        return next(
          AppError(
            isEN
              ? "Only posted requests can be accepted."
              : "Seules les demandes publiées peuvent être acceptées.",
            400
          )
        );
      if (reqData.ride.status !== RideStatus.PUBLISHED)
        return next(
          AppError(
            isEN
              ? "Cannot accept new requests for a ride which is not in published state."
              : "Impossible d'accepter de nouvelles demandes pour une course qui n’est pas publiée.",
            400
          )
        );

      if (reqData.ride.isBlocked)
        return next(
          AppError(isEN ? "Ride is blocked" : "Le trajet est bloqué", 400)
        );

      if (reqData.ride.isLocked) {
        return next(
          AppError(
            isEN
              ? "This ride is already locked. Cannot accept new requests."
              : "Ce trajet est déjà verrouillé. Impossible d'accepter de nouvelles demandes.",
            400
          )
        );
      }

      // Only allow one accepted request
      if (reqData.ride._count.d2dBookingRequests > 0) {
        return next(
          AppError(
            isEN
              ? "The ride has an accepted booking request waiting to be confirmed by payment, cannot accept another, either first cancel the accepted one or wait for the passenger to confirm."
              : "La course a une demande de réservation acceptée en attente de confirmation par paiement, elle ne peut pas en accepter une autre. Soit annulez d'abord celle qui est acceptée, soit attendez que le passager confirme.",
            400
          )
        );
      }

      const acceptedReq = await prisma.d2DBookingRequest.update({
        where: { id: reqData.id },
        data: {
          status: D2DBookingRequestStatus.ACCEPTED, // Changed to ACCEPTED status
          acceptedAt: new Date(),
        },
        include: {
          passenger: {
            select: profileSelects,
          },
          ride: {
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
          },
          pickupLocation: true,
          dropoffLocation: true,
        },
      });

      await NotificationServices.notifyUsers({
        userIds: [reqData.passengerId],
        titleEn: "Door to door Booking Request Accepted",
        titleFr: "Demande de réservation porte-à-porte acceptée",
        messageEn:
          "Your door to door booking request was accepted by the driver. Please complete payment to confirm.",
        messageFr:
          "Votre demande de réservation porte-à-porte a été acceptée par le conducteur. Veuillez effectuer le paiement pour confirmer.",
        rideId: reqData.rideId,
        // meta: {
        //   rideId: reqData.rideId,
        //   requestId: reqData.id,
        //   driverName: `${reqData.ride.driver.firstName}`,
        //   driverDetails: reqData.ride.driver,
        //   pricing: {
        //     baseFare: reqData.ride.contribution ?? 0,
        //     extraKms: reqData.extraKms ?? 0,
        //     totalPrice: reqData.totalAmount,
        //   },
        // },
      });

      const { departureLocation, destinationLocation, ...restRide } =
        acceptedReq.ride;

      res.json({
        success: true,
        message: isEN
          ? "Request accepted. Awaiting payment confirmation."
          : "Demande acceptée. En attente de confirmation de paiement.",
        data: {
          ...acceptedReq,
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          },
        },
      });
    }
  );

  static declineD2DBookingRequest = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId, reason } = matchedData<{
        requestId: number;
        reason: string;
      }>(req);
      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      const reqData = await prisma.d2DBookingRequest.findUnique({
        where: { id: requestId },
        include: {
          passenger: {
            select: profileSelects,
          },
          ride: {
            include: {
              driver: {
                select: profileSelects,
              },
              vehicle: true,
              departureLocation: true,
              destinationLocation: true,
              _count: {
                select: {
                  d2dBookingRequests: {
                    where: {
                      status: D2DBookingRequestStatus.ACCEPTED,
                    },
                  },
                },
              },
            },
          },
          pickupLocation: true,
          dropoffLocation: true,
        },
      });

      if (!reqData)
        return next(
          AppError(
            isEN
              ? "Booking request not found."
              : "Demande de réservation introuvable",
            404
          )
        );
      if (reqData.ride.driverId !== user.id)
        return next(AppError(isEN ? "Unauthorized." : "Non autorisé.", 403));
      if (reqData.status !== D2DBookingRequestStatus.POSTED)
        return next(
          AppError(
            isEN
              ? "Only posted requests can be declined."
              : "Seules les demandes publiées peuvent être refusées.",
            400
          )
        );

      const decReq = await prisma.d2DBookingRequest.update({
        where: { id: reqData.id },
        data: {
          status: D2DBookingRequestStatus.DECLINED,
          declinedAt: new Date(),
          reason,
        },
        include: {
          passenger: {
            select: profileSelects,
          },
          ride: {
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
          },
          pickupLocation: true,
          dropoffLocation: true,
        },
      });

      await NotificationServices.notifyUsers({
        userIds: [reqData.passengerId],
        titleEn: "Door to door Booking Request Declined",
        titleFr: "Demande de réservation porte à porte refusée",
        messageEn: `Your door to door booking request for ride ${reqData.ride.departureLocation.city
          }, ${reqData.ride.departureLocation.regionCode ??
          reqData.ride.departureLocation.region
          } -> ${reqData.ride.destinationLocation.city}, ${reqData.ride.destinationLocation.regionCode ??
          reqData.ride.destinationLocation.region
          } was declined`,
        messageFr: `Votre demande de réservation porte-à-porte pour le trajet ${reqData.ride.departureLocation.city
          }, ${reqData.ride.departureLocation.regionCode ??
          reqData.ride.departureLocation.region
          } -> ${reqData.ride.destinationLocation.city}, ${reqData.ride.destinationLocation.regionCode ??
          reqData.ride.destinationLocation.region
          } a été refusée`,
        rideId: reqData.rideId,
        // meta: {
        //   rideId: reqData.rideId,
        //   requestId: reqData.id,
        //   driverName: `${reqData.ride.driver.firstName}`,
        //   driverDetails: reqData.ride.driver,
        //   pricing: {
        //     baseFare: reqData.ride.contribution ?? 0,
        //     extraKms: reqData.extraKms ?? 0,
        //     totalPrice: reqData.totalAmount,
        //   },
        // },
      });

      const { departureLocation, destinationLocation, ...restRide } =
        decReq.ride;

      res.json({
        success: true,
        message: isEN
          ? "Booking request declined"
          : "Demande de réservation refusée.",
        data: {
          ...decReq,
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          },
        },
      });
    }
  );

  static initializePayment = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId, useCoupons } = matchedData<{
        requestId: number;
        useCoupons?: boolean;
      }>(req);
      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      const reqData = await prisma.d2DBookingRequest.findUnique({
        where: { id: requestId },
        include: {
          passenger: true,
          ride: {
            include: {
              departureLocation: true,
              destinationLocation: true,
            },
          },
        },
      });

      if (!reqData)
        return next(
          AppError(
            isEN
              ? "Booking request not found."
              : "Demande de réservation introuvable",
            404
          )
        );
      if (reqData.passengerId !== user.id)
        return next(AppError(isEN ? "Unauthorized." : "Non autorisé.", 403));
      if (reqData.status !== D2DBookingRequestStatus.ACCEPTED)
        return next(
          AppError(
            isEN
              ? "Booking request must be in accepted state."
              : "La demande de réservation doit être dans un état accepté.",
            400
          )
        );

      // initialize payments
      // Prevent passenger coupon if driver coupon used on this ride
      if (useCoupons && reqData.ride.appliedDriverCoupons) {
        return next(
          AppError(
            isEN
              ? "A driver loyalty coupon is active on this trip. Passenger coupons cannot be applied this time."
              : "Un coupon de fidélité conducteur est actif sur ce trajet. Les coupons passagers ne peuvent pas être appliqués cette fois.",
            400
          )
        );
      }

      // Commission & fee calculation ---
      // Note: obtain commission settings from DB or config
      const commissionSetting = await prisma.commissionSettings.findFirst();

      const commissionRate = Number(commissionSetting?.rate || 10) / 100; // stored as decimal like 0.10
      // const defaultPlatformFee = Number(defaultFeeSetting?.amount || 1.0); // e.g., $1

      const baseContribution = Math.floor(Number(reqData.totalAmount) * 100) / 100;

      // if contribution is zero use defaultPlatformFee as platform fee
      let platformFee = 0;
      if (baseContribution === 0) {
        // platform fee scales with seats — assume defaultFee per seat; if you want otherwise change:
        const defaultFeeSetting = await prisma.feeSetting.findFirst({
          where: { active: true, type: FeeType.DEFAULT_PLATFORM_FEE },
        });
        platformFee = Math.ceil((defaultFeeSetting?.amount || 1) * 100) / 100;
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
        const requiredCoupons = rule?.requiredCoupons ?? 5;
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

      // Final total to be authorized (no tax math) ---
      const totalToAuthorize = baseContribution + platformFee;

      // Create a payment session (frontend will confirm it) ---
      const stripeCustomerId =
        await TransactionService.getOrCreateStripeCustomer(user);

      const session = await prisma.paymentSession.create({
        data: {
          id: `cr_ps_${v4()}`,
          userId: user.id,
          rideId: reqData.rideId,
          // seatsToBook: seatsBooked,
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
          d2dBookingId: reqData.id,
        },
      });

      // return session + breakdown
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
          extraKmsAmount: reqData.extraKmsAmount,
          totalToPay: totalToAuthorize,
          ...(useCoupons && {
            usedCoupons: couponUsedCount,
          }),
        },
      });
    }
  );

  static cancelD2DRequest = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId, reason } = matchedData<{
        requestId: number;
        reason: string;
      }>(req);
      const user = req.user as DbUser;
      const isEN = req.isEnglishPreferred;

      const reqData = await prisma.d2DBookingRequest.findUnique({
        where: { id: requestId },
        include: {
          passenger: {
            select: profileSelects,
          },
          transaction: true,
          bookingSeat: true,
          redeemedCoupns: true,
          ride: {
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
          },
          pickupLocation: true,
          dropoffLocation: true,
        },
      });
      if (!reqData)
        return next(
          AppError(
            isEN
              ? "Booking request not found."
              : "Demande de réservation introuvable",
            404
          )
        );
      const isPassenger = reqData.passengerId === user.id;
      const isDriver = reqData.ride.driverId === user.id;
      if (!isPassenger && !isDriver)
        return next(AppError(isEN ? "Unauthorized." : "Non autorisé.", 403));
      if (reqData.status == D2DBookingRequestStatus.CANCELED) {
        return next(
          AppError(
            isEN
              ? "Booking request already cancelled"
              : "Demande de réservation déjà annulée.",
            400
          )
        );
      }
      if (reqData.status == D2DBookingRequestStatus.DECLINED) {
        return next(
          AppError(
            isEN
              ? "Cannot cancel a declined request"
              : "Impossible d'annuler une demande refusée.",
            400
          )
        );
      }

      if (reqData.ride.status !== RideStatus.PUBLISHED) {
        return next(
          AppError(
            isEN
              ? "The ride should be in published state in order to cancel the booking"
              : "Le trajet doit être dans un état publié pour pouvoir annuler la réservation",
            400
          )
        );
      }

      if (reqData.status == D2DBookingRequestStatus.POSTED) {
        const cancelled = await prisma.d2DBookingRequest.update({
          where: { id: requestId },
          data: {
            status: D2DBookingRequestStatus.CANCELED,
            canceledAt: new Date(),
            reason,
            canceledBy: isPassenger
              ? "PASSENGER"
              : isDriver
                ? "DRIVER"
                : "UNKNOWN",
          },
          include: {
            passenger: {
              select: profileSelects,
            },
            ride: {
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
            },
            pickupLocation: true,
            dropoffLocation: true,
          },
        });
        const { departureLocation, destinationLocation, ...restRide } =
          cancelled.ride;
        return res.json({
          success: true,
          message: isEN ? "Request cancelled." : "Demande annulée.",
          data: {
            ...cancelled,
            ride: {
              ...restRide,
              driverStartLocation: departureLocation,
              driverStopLocation: destinationLocation,
            },
          },
        });
      }
      if (isDriver) {
        if (reqData.transaction) {
          if (
            reqData.transaction.status == TransactionStatus.ONHOLD &&
            reqData.transaction.externalReference
          ) {
            await stripe.paymentIntents.cancel(
              reqData.transaction.externalReference
            );
            await prisma.transaction.update({
              where: { id: reqData.transaction.id },
              data: {
                status: TransactionStatus.CANCELLED,
                d2dBookingReq: {
                  update: {
                    status: D2DBookingRequestStatus.CANCELED,
                    canceledAt: new Date(),
                    reason,
                    canceledBy: "DRIVER",
                    ...(reqData.bookingSeat &&
                      !reqData.bookingSeat.isExpired && {
                      bookingSeat: {
                        update: {
                          isExpired: true,
                          expiredAt: new Date(),
                          expireReason: "Booking request Cancelled by Driver",
                        },
                      },
                    }),
                  },
                },
              },
            });
          } else if (
            reqData.transaction.status == TransactionStatus.PAID &&
            reqData.transaction.externalReference
          ) {
            await stripe.refunds.create({
              payment_intent: reqData.transaction.externalReference,
            });
            await prisma.transaction.update({
              where: { id: reqData.transaction.id },
              data: {
                refundedAmount: reqData.transaction.amount,
                status: TransactionStatus.REFUNDED,
                isRefunded: true,
                refundedAt: new Date(),
                d2dBookingReq: {
                  update: {
                    status: D2DBookingRequestStatus.CANCELED,
                    canceledAt: new Date(),
                    reason,
                    canceledBy: "DRIVER",
                    ...(reqData.bookingSeat &&
                      !reqData.bookingSeat.isExpired && {
                      bookingSeat: {
                        update: {
                          isExpired: true,
                          expiredAt: new Date(),
                          expireReason: "Booking request Cancelled by Driver",
                        },
                      },
                    }),
                  },
                },
              },
            });
          }
        } else {
          await prisma.d2DBookingRequest.update({
            where: { id: reqData.id },
            data: {
              status: D2DBookingRequestStatus.CANCELED,
              canceledAt: new Date(),
              reason,
              canceledBy: "DRIVER",
              ...(reqData.bookingSeat &&
                !reqData.bookingSeat.isExpired && {
                bookingSeat: {
                  update: {
                    isExpired: true,
                    expiredAt: new Date(),
                    expireReason: "Booking request Cancelled by Driver",
                  },
                },
              }),
            },
          });
        }

        if (reqData.ride.isLocked) {
          await prisma.ride.update({
            where: { id: reqData.rideId },
            data: {
              isLocked: false,
            },
          });
        }

        // refund the coupons if applicable
        if (reqData.redeemedCoupns.length) {
          await CouponService.refundCoupons(reqData.redeemedCoupns);
        }

        // record cancellation review
        await RatingReviewService.createRatingReview(
          reqData.ride.driverId,
          reqData.rideId,
          1, // minimum for cancellation
          "Driver cancelled the d2d booking request",
          undefined,
          ReviewType.CANCELLATION
        );

        // Notify the booker
        await NotificationServices.notifyUsers({
          userIds: [reqData.passengerId],
          titleEn: "Door to Door Booking Request Cancelled",
          titleFr: "Demande de réservation porte-à-porte annulée",
          messageEn: `Your door to door booking request for ride ${reqData.ride.departureLocation.city} -> ${reqData.ride?.destinationLocation.city} was cancelled.`,
          messageFr: `Votre demande de réservation porte-à-porte pour le trajet ${reqData.ride.departureLocation.city} -> ${reqData.ride?.destinationLocation.city} a été annulée.`,
          rideId: reqData.rideId,
        });
        return res.json({
          success: true,
          message: isEN ? "Request cancelled." : "Demande annulée.",
          // data: cancelled,
        });
      } else {
        // For passenger, cancellation policy has to apply
        const now = new Date();
        const depTime = reqData.ride.departureTime;
        const hoursBefore = (depTime.getTime() - now.getTime()) / 3600000;

        let refundAmount = 0;
        let platformAmount = reqData.transaction?.platformAmount || 0;
        let driverAmount = reqData.transaction?.driverAmount || 0;

        // Refund Logic
        const txn = reqData.transaction;
        if (
          txn &&
          txn.externalReference &&
          txn.status === TransactionStatus.PAID
        ) {
          if (hoursBefore >= 24) {
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

            await prisma.transaction.update({
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

            await prisma.transaction.update({
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
            const chargeId = typeof captured.latest_charge === "string"
              ? captured.latest_charge
              : captured.latest_charge?.id ?? null;

            // Load ride with driver and locations for payout processing
            const rideForPayout = await prisma.ride.findUnique({
              where: { id: reqData.rideId },
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
        await prisma.d2DBookingRequest.update({
          where: { id: reqData.id },
          data: {
            status: D2DBookingRequestStatus.CANCELED,
            canceledAt: new Date(),
            reason,
            canceledBy: "PASSENGER",
            ...(reqData.bookingSeat &&
              !reqData.bookingSeat.isExpired && {
              bookingSeat: {
                update: {
                  isExpired: true,
                  expiredAt: new Date(),
                  expireReason: "Booking request Cancelled by the passenger",
                },
              },
            }),
          },
        });

        if (reqData.ride.isLocked) {
          await prisma.ride.update({
            where: { id: reqData.rideId },
            data: {
              isLocked: false,
            },
          });
        }

        await NotificationServices.notifyUsers({
          userIds: [reqData.ride.driverId],
          titleEn: "Door to door booking request Cancelled",
          titleFr: "Demande de réservation porte à porte annulée",
          messageEn: `${user.firstName} cancelled their door to door booking request of ride ${reqData.ride.departureLocation.city} -> ${reqData.ride?.destinationLocation.city}.`,
          messageFr: `${user.firstName} a annulé sa demande de réservation porte-à-porte pour le trajet ${reqData.ride.departureLocation.city} -> ${reqData.ride?.destinationLocation.city}.`,
          rideId: reqData.rideId,
        });
      }

      res.json({
        success: true,
        message: isEN ? "Request canceled." : "Demande annulée.",
      });
    }
  );

  // get d2d booking requests
  static getD2DBookingRequestById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId } = matchedData<{ requestId: number }>(req, {
        locations: ["params"],
      });

      const user = req.user!;
      const isEn = req.isEnglishPreferred;

      const br = await prisma.d2DBookingRequest.findUnique({
        where: { id: requestId },
        include: {
          pickupLocation: true,
          dropoffLocation: true,
          ride: {
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
          },
          passenger: {
            select: {
              firstName: true,
            },
          },
          bookingSeat: true,
        },
      });

      if (!br) {
        return next(
          AppError(
            isEn ? "D2D request not found" : "Demande D2D non trouvée",
            404
          )
        );
      }

      const isOwner = br.passengerId === user.id;
      const isAdmin = user.role === UserRole.ADMIN;
      const isDriver = br.ride.driverId == user.id;
      if (!isOwner && !isDriver && !isAdmin) {
        return next(AppError(isEn ? "Unauthorized" : "Non autorisé.", 403));
      }

      const { departureLocation, destinationLocation, ...restRide } = br.ride;
      const { bookingSeat, ...restBr } = br;

      return res.json({
        success: true,
        data: {
          ...restBr,
          ...br.passengerId === user.id && {
            bookingSeat,
          },
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          },
        },
      });
    }
  );

  static getD2DRideBookingRequests = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        rideId,
        page = 1,
        pageSize = 10,
      } = matchedData<{ rideId: number; page?: number; pageSize?: number }>(
        req,
        {
          locations: ["params", "query"],
        }
      );

      const user = req.user!;
      const skip = (page - 1) * pageSize;

      const where: Prisma.D2DBookingRequestWhereInput = {
        rideId,
      };
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isAdmin) {
        where.ride = {
          driverId: user.id,
        };
      }

      // Fetch booking requests
      const [requests, count] = await prisma.$transaction([
        prisma.d2DBookingRequest.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
          include: {
            pickupLocation: true,
            dropoffLocation: true,
            passenger: {
              select: {
                firstName: true,
              },
            },
            ride: {
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
            },
          },
        }),
        prisma.d2DBookingRequest.count({ where }),
      ]);

      const finalRs = requests.map((br) => {
        const { departureLocation, destinationLocation, ...restRide } = br.ride;
        return {
          ...br,
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          },
        };
      });

      return res.json({
        success: true,
        data: finalRs,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.ceil(count / pageSize),
        },
      });
    }
  );

  static getAllD2DBookingRequests = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        status,
        passengerId,
        rideId,
        pickupCity,
        dropoffCity,
        date,
        search,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        status?: D2DBookingRequestStatus;
        passengerId?: number;
        rideId?: number;
        pickupCity?: string;
        dropoffCity?: string;
        date?: number;
        search?: string;
      }>(req, { locations: ["query"] });
      const isEn = req.isEnglishPreferred;

      const skip = (page - 1) * pageSize;
      const user = req.user!;
      const where: Prisma.D2DBookingRequestWhereInput = {};

      // Basic filters
      if (status) where.status = status;
      if (passengerId && user.role !== UserRole.ADMIN) {
        return next(AppError(isEn ? "Passenger ID is not allowed for non-admin users" : "L'identifiant du passager n'est pas autorisé pour les utilisateurs non administrateurs", 403));
      }
      if (passengerId) where.passengerId = passengerId;
      if (rideId) where.rideId = rideId;

      if (pickupCity)
        where.pickupLocation = {
          city: { contains: pickupCity, mode: "insensitive" },
        };

      if (dropoffCity)
        where.dropoffLocation = {
          city: { contains: dropoffCity, mode: "insensitive" },
        };

      if (date) {
        where.createdAt = {
          gte: moment(date).startOf("day").toDate(),
          lte: moment(date).endOf("day").toDate(),
        };
      }

      if (search) {
        where.OR = [
          {
            pickupLocation: { city: { contains: search, mode: "insensitive" } },
          },
          {
            dropoffLocation: {
              city: { contains: search, mode: "insensitive" },
            },
          },
          {
            passenger: { firstName: { contains: search, mode: "insensitive" } },
          },
          {
            passenger: { lastName: { contains: search, mode: "insensitive" } },
          },
        ];
      }

      // ACCESS CONTROL LOGIC
      if (user.role !== UserRole.ADMIN) {
        // Passenger → only own D2D requests
        where.OR = search
          ? [
            { passengerId: user.id },

            // Driver → requests for their rides
            {
              ride: {
                driverId: user.id,
              },
            },
            {
              OR: [
                {
                  pickupLocation: {
                    city: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  dropoffLocation: {
                    city: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  passenger: {
                    firstName: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  passenger: {
                    lastName: { contains: search, mode: "insensitive" },
                  },
                },
              ],
            },
          ]
          : [
            { passengerId: user.id },

            // Driver → requests for their rides
            {
              ride: {
                driverId: user.id,
              },
            },
          ];
      }

      // Query
      const [requests, count] = await prisma.$transaction([
        prisma.d2DBookingRequest.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [{ createdAt: "desc" }],
          include: {
            pickupLocation: true,
            dropoffLocation: true,
            passenger: {
              select: {
                firstName: true,
              },
            },
            bookingSeat: true,
            ride: {
              include: {
                driver: {
                  select: {
                    firstName: true,
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
              },
            },
          },
        }),
        prisma.d2DBookingRequest.count({ where }),
      ]);

      const finalRs = requests.map((br) => {
        const { departureLocation, destinationLocation, ...restRide } = br.ride;
        const { bookingSeat, ...restBr } = br;
        return {
          ...restBr,
          ...br.passengerId === user.id && {
            bookingSeat,
          },
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          },
        };
      });

      return res.json({
        success: true,
        data: finalRs,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.ceil(count / pageSize),
        },
      });
    }
  );
}
