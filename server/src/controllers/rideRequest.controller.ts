import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import {
  BookingStatus,
  BookingType,
  ContributionCollectionMethod,
  Location,
  MonetizationType,
  Prisma,
  RideRequestStatus,
  RideStatus,
  RideType,
  UserRole,
} from "@prisma/client";
import { fileSelects, profileSelects } from "../types/index";
import { RideRequestService } from "../services/rideRequest.service";
import { createRideFromAcceptedRequest } from "../services/rideRequestAccept.service";
import { sweepPendingBids } from "../services/bid.service";
import moment from "moment";
import axios from "axios";

export class RideRequestController {
  static createRideRequest = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        origin,
        destination,
        date: dt,
        timeWindowStart: tsdt,
        timeWindowEnd: tedt,
        seats,
        rideType,
        description,
        proposedFare,
        vehicleCategory,
      } = matchedData<{
        origin: {
          city: string;
          province: string;
          latitude?: number;
          longitude?: number;
          locationName?: string;
          address?: string;
        };
        destination: {
          city: string;
          province: string;
          latitude?: number;
          longitude?: number;
          locationName?: string;
          address?: string;
        };
        date?: number;
        timeWindowStart?: number;
        timeWindowEnd?: number;
        seats?: number;
        rideType: RideType;
        description?: string;
        proposedFare?: number;
        vehicleCategory?: string;
      }>(req);

      const isEN = req.isEnglishPreferred;
      const userId = req.user!.id;
      const now = moment();
      const date = dt ? moment(dt) : undefined;
      let timeWindowStart = tsdt ? moment(tsdt) : undefined;
      let timeWindowEnd = tedt ? moment(tedt) : undefined;

      if (date && date.isBefore(now.clone().startOf("day"))) {
        return next(
          AppError(
            isEN
              ? "The date before today is not accepted"
              : "La date avant aujourd'hui n'est pas acceptée"
          )
        );
      }

      // If neither date nor timeWindowStart provided, treat as "ride wanted now"
      // — set timeWindowStart to server's current time so there's no client/server
      // clock drift issue.
      if (!date && !timeWindowStart) {
        timeWindowStart = now.clone();
      }

      // If timeWindowStart was provided but is in the past (e.g. client clock
      // slightly behind), clamp to now instead of rejecting.
      if (timeWindowStart && timeWindowStart.isBefore(now)) {
        timeWindowStart = now.clone();
      }

      if (date && timeWindowStart && !timeWindowStart.isSame(date, "day")) {
        return next(
          AppError(
            isEN
              ? "Time window start must match the selected date"
              : "Le début de la fenêtre temporelle doit correspondre à la date sélectionnée",
            400
          )
        );
      }

      if (date && !timeWindowStart) {
        timeWindowStart = date.clone().startOf("day"); // 00:00
        if (!timeWindowEnd) {
          timeWindowEnd = date.clone().endOf("day"); // 23:59
        }
      }

      // Clamp timeWindowEnd to now if it's slightly in the past
      if (timeWindowEnd && timeWindowEnd.isBefore(now)) {
        timeWindowEnd = now.clone().add(1, "day");
      }

      if (!timeWindowEnd) {
        timeWindowEnd = (timeWindowStart || date)!.clone().add(2, "days");
      }
      if (
        timeWindowStart &&
        timeWindowEnd &&
        !timeWindowEnd.isAfter(timeWindowStart)
      )
        return next(
          AppError(
            isEN
              ? "Time window end must be after time window start"
              : "La fin de la fenêtre temporelle doit être après le début de la fenêtre temporelle"
          )
        );

      if (
        rideType === RideType.D2D &&
        (!origin.locationName || !destination.locationName)
      ) {
        return next(
          AppError(
            isEN
              ? "locationName is required for door to door rides"
              : "locationName est requis pour les trajets porte-à-porte",
            400
          )
        );
      }

      if (rideType === RideType.D2D) {
        // origin & destination MUST be provided with lat/lng
        if (!origin || !origin.latitude || !origin.longitude) {
          return next(
            AppError(
              isEN
                ? "Origin location is required for D2D ride requests"
                : "L'origine est obligatoire pour les demandes D2D",
              400
            )
          );
        }

        if (!destination || !destination.latitude || !destination.longitude) {
          return next(
            AppError(
              isEN
                ? "Destination location is required for D2D ride requests"
                : "La destination est obligatoire pour les demandes D2D",
              400
            )
          );
        }
      }

      let originLocation: Location | null = null;
      if (origin.latitude && origin.longitude) {
        originLocation = await prisma.location.create({
          data: {
            city: origin.city,
            regionCode: null,
            latitude: origin.latitude,
            longitude: origin.longitude,
            region: origin.province,
            locationName: origin.locationName || origin.province,
            address: origin.address,
          },
        });
        await prisma.$executeRaw`
                UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${originLocation.longitude}, ${originLocation.latitude}), 4326)
                WHERE id=${originLocation.id}
              `;
      }

      let destinationLocation: Location | null = null;

      if (destination.latitude && destination.longitude) {
        destinationLocation = await prisma.location.create({
          data: {
            city: destination.city,
            regionCode: null,
            latitude: destination.latitude,
            longitude: destination.longitude,
            region: destination.province,
            locationName: destination.locationName || destination.province,
            address: destination.address,
          },
        });
        await prisma.$executeRaw`
                UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${destinationLocation.longitude}, ${destinationLocation.latitude}), 4326)
                WHERE id=${destinationLocation.id}
              `;
      }

      const rr = await prisma.rideRequest.create({
        data: {
          userId,
          originId: originLocation?.id,
          destinationId: destinationLocation?.id,
          date: (date || timeWindowStart)!.toDate(),
          timeWindowStart: timeWindowStart?.toDate(),
          timeWindowEnd: timeWindowEnd.toDate(),
          seats: seats ?? 1,
          rideType,
          originCity: origin.city,
          originProvince: origin.province,
          destCity: destination.city,
          destProvince: destination.province,
          description,
          proposedFare: proposedFare ?? null,
          vehicleCategory: (vehicleCategory as any) || "CAR",
          // Auto-open on-demand requests so drivers can see them immediately.
          status: "OPEN",
          openedAt: new Date(),
        },
        include: {
          origin: true,
          destination: true,
          matches: true,
        },
      });

      // Notify drivers with matching vehicle category
      RideRequestService.notifyMatchingDrivers(rr).catch(() => {});

      return res.json({ success: true, data: rr });
    }
  );

  static getRideRequestById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId } = matchedData<{ requestId: number }>(req, {
        locations: ["params"],
      });
      const userId = req.user!.id;
      const isEn = req.isEnglishPreferred;

      const rr = await prisma.rideRequest.findUnique({
        where: { id: requestId },
        include: {
          origin: true,
          destination: true,
          _count: {
            select: { matches: true },
          },
          matches: {
            include: {
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
                      defaultImage: {
                        select: { ...fileSelects, userId: false },
                      },
                    },
                  },
                  preferences: true,
                  departureLocation: true,
                  destinationLocation: true,
                  stopovers: true,
                },
              },
            },
            take: 10,
            orderBy: {
              ride: { departureTime: "asc" },
            },
          },
        },
      });

      const isOwner = rr?.userId === userId;
      const isAdmin = req.user?.role === UserRole.ADMIN;

      if (
        !rr ||
        (!isOwner && !isAdmin && rr.status !== RideRequestStatus.OPEN)
      ) {
        return next(
          AppError(
            isEn ? "Ride request not found" : "Demande de trajet non trouvée",
            404
          )
        );
      }

      if (rr.userId !== userId && req.user!.role !== UserRole.ADMIN) {
        const { matches, _count, ...rest } = rr;
        return res.json({ success: true, data: rest });
      }

      if (rr.matches.length === 0) {
        return res.json({ success: true, data: rr });
      }

      const newMatches = rr.matches.map(m=>{
        const { departureLocation, destinationLocation, ...restRide } = m.ride;
        return m.ride.type == RideType.D2D ? {
          ...m,
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          }
        }: m;
      })
      return res.json({
        status: true,
        data: {...rr, matches: newMatches },
      });
    }
  );

  static getRideRequestMatches = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        requestId,
        page = 1,
        pageSize = 10,
      } = matchedData<{ requestId: number; page?: number; pageSize?: number }>(
        req,
        { locations: ["params", "query"] }
      );
      const userId = req.user!.id;
      const isEn = req.isEnglishPreferred;

      const skip = (page - 1) * pageSize;

      // 1. Fetch the ride request (minimal include)
      const rr = await prisma.rideRequest.findUnique({
        where: { id: requestId },
        include: {
          origin: true,
          destination: true,
          _count: { select: { matches: true } },
          matches: {
            skip,
            take: pageSize,
            include: {
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
                      defaultImage: {
                        select: { ...fileSelects, userId: false },
                      },
                    },
                  },
                  preferences: true,
                  departureLocation: true,
                  destinationLocation: true,
                  stopovers: true,
                },
              },
            },
            orderBy: {
              ride: { departureTime: "asc" },
            },
          },
        },
      });

      if (!rr)
        return next(
          AppError(
            isEn ? "Ride request not found" : "Demande de trajet non trouvée",
            404
          )
        );

      // Ensure ownership unless admin
      if (rr.userId !== userId && req.user!.role !== UserRole.ADMIN) {
        return next(AppError(isEn ? "Forbidden" : "Interdit", 403));
      }

      if (rr.matches.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page,
            pageSize,
            total: rr._count.matches,
            totalPages: Math.ceil(rr._count.matches / pageSize),
          },
        });
      }

      const newMatches = rr.matches.map(m=>{
        const { departureLocation, destinationLocation, ...restRide } = m.ride;
        return m.ride.type == RideType.D2D ? {
          ...m,
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          }
        }: m;
      })

      return res.json({
        success: true,
        data: newMatches,
        pagination: {
          page,
          pageSize,
          total: rr._count.matches,
          totalPages: Math.ceil(rr._count.matches / pageSize),
        },
      });
    }
  );

  static getAllRideRequests = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        status = undefined,
        date = undefined,
        originCity = undefined,
        originProvince = undefined,
        destinationCity = undefined,
        destinationProvince = undefined,
        search = undefined,
        mineOnly = false,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        status?: RideRequestStatus;
        date?: number;
        originCity?: string;
        originProvince?: string;
        destinationCity?: string;
        destinationProvince?: string;
        search?: string;
        mineOnly?: boolean;
      }>(req, { locations: ["query"] });

      const skip = (page - 1) * pageSize;
      const user = req.user!;

      const where: Prisma.RideRequestWhereInput = {};
      if (status) where.status = status;
      if (date) {
        where.date = {
          gte: moment(date).startOf("day").toDate(),
          lte: moment(date).endOf("day").toDate(),
        };
      }
      if (originCity)
        where.origin = { city: { contains: originCity, mode: "insensitive" } };
      if (destinationCity)
        where.destination = {
          city: { contains: destinationCity, mode: "insensitive" },
        };
      // Handle mineOnly and role-based filtering
      if (mineOnly) {
        where.userId = user.id;
      } else if (user.role !== UserRole.ADMIN) {
        where.userId = { not: user.id };
        where.status = RideRequestStatus.OPEN;
      }

      if (search) {
        where.OR = [
          { origin: { city: { contains: search, mode: "insensitive" } } },
          { destination: { city: { contains: search, mode: "insensitive" } } },
          { origin: { region: { contains: search, mode: "insensitive" } } },
          {
            destination: { region: { contains: search, mode: "insensitive" } },
          },
        ];
      }

      // 1. Fetch the ride request (minimal include)
      const [rrs, count] = await prisma.$transaction([
        prisma.rideRequest.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [{ status: "desc" }, { createdAt: "desc" }, { date: "asc" }],
          include: {
            origin: true,
            destination: true,
            _count: { select: { matches: true } },
            matches: {
              take: 10,
              include: {
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
                        defaultImage: {
                          select: { ...fileSelects, userId: false },
                        },
                      },
                    },
                    preferences: true,
                    departureLocation: true,
                    destinationLocation: true,
                    stopovers: true,
                  },
                },
              },
              orderBy: {
                ride: { departureTime: "asc" },
              },
            },
          },
        }),
        prisma.rideRequest.count({ where }),
      ]);

      const finalRRs = rrs.map((r) => {
        const { matches, _count, ...rest } = r;
        const newMatches = matches.map(m=>{
        const { departureLocation, destinationLocation, ...restRide } = m.ride;
        return m.ride.type == RideType.D2D ? {
          ...m,
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          }
        }: m;
      })
        return r.userId === user.id || user.role === UserRole.ADMIN
          ? { ...r, matches: newMatches, isOwner: r.userId === user.id }
          : { ...rest, isOwner: false };
      });

      return res.json({
        success: true,
        data: finalRRs,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.ceil(count / pageSize),
        },
      });
    }
  );

  static closeRideRequest = catchAsync(async (req, res, next) => {
    const { requestId } = matchedData<{ requestId: number }>(req, {
      locations: ["params"],
    });
    const userId = req.user!.id;
    const isEn = req.isEnglishPreferred;

    const rr = await prisma.rideRequest.findUnique({
      where: { id: requestId },
    });
    if (!rr)
      return next(
        AppError(
          isEn ? "Ride request not found" : "Demande de trajet introuvable",
          404
        )
      );
    if (rr.userId !== userId)
      return next(AppError(isEn ? "Unauthorized" : "Non autorisé", 403));
    if (rr.status !== RideRequestStatus.OPEN)
      return next(
        AppError(
          isEn
            ? "Only OPEN ride requests can be closed"
            : "Seules les demandes de trajet OUVERTES peuvent être fermées",
          400
        )
      );

    await prisma.$transaction(async (tx) => {
      await tx.rideRequest.update({
        where: { id: rr.id },
        data: { status: "CLOSED", closeAt: new Date() },
      });
      await sweepPendingBids({
        tx,
        rideRequestId: rr.id,
        reason: "REQUEST_CANCELLED",
      });
    });

    const updated = await prisma.rideRequest.findUniqueOrThrow({
      where: { id: rr.id },
      include: {
        origin: true,
        destination: true,
        _count: {
          select: { matches: true },
        },
        matches: {
          include: {
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
                    defaultImage: {
                      select: { ...fileSelects, userId: false },
                    },
                  },
                },
                preferences: true,
                departureLocation: true,
                destinationLocation: true,
                stopovers: true,
              },
            },
          },
          take: 10,
          orderBy: {
            ride: { departureTime: "asc" },
          },
        },
      },
    });

    if (updated.matches.length === 0) {
      return res.json({
        success: true,
        data: updated,
        message: isEn
          ? "Ride request closed successfully"
          : "Demande de trajet fermée avec succès",
      });
    }
    const newMatches = updated.matches.map(m=>{
        const { departureLocation, destinationLocation, ...restRide } = m.ride;
        return m.ride.type == RideType.D2D ? {
          ...m,
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          }
        }: m;
      })
    return res.json({
      status: true,
      message: isEn
        ? "Ride request closed successfully"
        : "Demande de trajet fermée avec succès",
      data: {...updated, matches: newMatches },
    });
  });

  static openRideRequest = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId } = matchedData<{ requestId: number }>(req, {
        locations: ["params"],
      });
      const userId = req.user!.id;
      const isEn = req.isEnglishPreferred;

      // 1. Load request
      const rr = await prisma.rideRequest.findUnique({
        where: { id: requestId },
        include: {
          origin: true,
          destination: true,
        },
      });

      if (!rr) {
        return next(
          AppError(isEn ? "Ride request not found" : "Demande introuvable", 404)
        );
      }

      if (rr.userId !== userId) {
        return next(
          AppError(
            isEn ? "Unauthorized to open this request" : "Non autorisé",
            403
          )
        );
      }

      if (rr.status !== "DRAFT") {
        return next(
          AppError(
            isEn
              ? "Only DRAFT requests can be opened"
              : "Impossible d'ouvrir cette demande",
            400
          )
        );
      }

      if (rr.date <= new Date()) {
        return next(
          AppError(
            isEn
              ? "Cannot open this request, the date must not be in past."
              : "Impossible d'ouvrir cette demande, la date ne doit pas être dans le passé.",
            400
          )
        );
      }

      // Transition → OPEN
      const updated = await prisma.rideRequest.update({
        where: { id: requestId },
        data: {
          status: RideRequestStatus.OPEN,
          openedAt: new Date(),
        },
      });

      //
      // 3. Find matching rides
      const matches = await prisma.ride.findMany({
        where: {
          status: "PUBLISHED",
          availableSeats: { gte: rr.seats },
          type: rr.rideType,
          driverId: { not: { equals: rr.userId } },
          OR: [
            {
              departureLocation: {
                city: { contains: rr.originCity, mode: "insensitive" },
              },
              destinationLocation: {
                city: { contains: rr.destCity, mode: "insensitive" },
              },
            },
            {
              departureTime: {
                gt: new Date(),
                ...(rr.timeWindowStart && { gte: rr.timeWindowStart }),
                ...(rr.timeWindowEnd && { lte: rr.timeWindowEnd }),
              },
            },
          ],
        },
        select: { id: true },
      });

      const rideIds = matches.map((m) => m.id);

      //
      // 4. Insert into RideRequestMatch (avoid duplicates using ON CONFLICT)
      //
      if (rideIds.length > 0) {
        await prisma.$queryRaw`
      INSERT INTO "RideRequestMatch" ("requestId", "rideId", "matchedAt")
      SELECT ${requestId}, r.id, NOW()
      FROM "Ride" r
      WHERE r.id = ANY(${rideIds}::int[])
      ON CONFLICT DO NOTHING;
    `;
      }

      //
      // 5. Reload with limited matches (first 10)
      //
      const finalRR = await prisma.rideRequest.findUnique({
        where: { id: updated.id },
        include: {
          origin: true,
          destination: true,
          _count: {
            select: { matches: true },
          },
          matches: {
            include: {
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
                      defaultImage: {
                        select: { ...fileSelects, userId: false },
                      },
                    },
                  },
                  preferences: true,
                  departureLocation: true,
                  destinationLocation: true,
                  stopovers: true,
                },
              },
            },
            take: 10,
            orderBy: {
              ride: { departureTime: "asc" },
            },
          },
        },
      });

      const newMatches = finalRR!.matches.map(m=>{
        const { departureLocation, destinationLocation, ...restRide } = m.ride;
        return m.ride.type == RideType.D2D ? {
          ...m,
          ride: {
            ...restRide,
            driverStartLocation: departureLocation,
            driverStopLocation: destinationLocation,
          }
        }: m;
      })

      return res.json({
        success: true,
        data: {...finalRR, matches: newMatches },
        message: isEn
          ? "Ride request opened successfully"
          : "Demande de trajet ouverte avec succès",
      });
    }
  );

  // Driver accepts a ride request. Creates a Ride + APPROVED Booking atomically
  // and closes the RideRequest so no other driver can grab it.
  static acceptRideRequest = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId } = matchedData<{ requestId: number }>(req, {
        locations: ["params"],
      });
      const { vehicleId } = matchedData<{ vehicleId: number }>(req, {
        locations: ["body"],
      });

      const driver = req.user!;
      const isEn = req.isEnglishPreferred;

      if (driver.role === UserRole.ADMIN) {
        return next(AppError(isEn ? "Admins cannot accept ride requests" : "Interdit", 403));
      }

      if (!driver.isDriverOnboarded) {
        return next(
          AppError(
            isEn
              ? "Complete driver onboarding first"
              : "Terminez l'intégration du conducteur d'abord",
            403
          )
        );
      }

      if (!driver.isAvailableForRideRequest) {
        return next(
          AppError(
            isEn
              ? "Turn on ride request availability before accepting"
              : "Activez la disponibilité avant d'accepter",
            403
          )
        );
      }

      const rr = await prisma.rideRequest.findUnique({
        where: { id: requestId },
        include: { origin: true, destination: true, user: true },
      });
      if (!rr) {
        return next(
          AppError(
            isEn ? "Ride request not found" : "Demande non trouvée",
            404
          )
        );
      }

      if (rr.userId === driver.id) {
        return next(
          AppError(
            isEn
              ? "You cannot accept your own ride request"
              : "Vous ne pouvez pas accepter votre propre demande",
            400
          )
        );
      }

      if (rr.status !== RideRequestStatus.OPEN) {
        return next(
          AppError(
            isEn
              ? "This request is no longer open"
              : "Cette demande n'est plus ouverte",
            400
          )
        );
      }

      // Vehicle must belong to driver
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, userId: driver.id },
      });
      if (!vehicle) {
        return next(
          AppError(
            isEn
              ? "Vehicle not found or does not belong to you"
              : "Véhicule introuvable ou ne vous appartient pas",
            404
          )
        );
      }

      if (vehicle.capacity < rr.seats) {
        return next(
          AppError(
            isEn
              ? `Vehicle capacity (${vehicle.capacity}) is less than requested seats (${rr.seats})`
              : `Capacité du véhicule insuffisante`,
            400
          )
        );
      }

      // Must have a proposed fare — this is the contribution we charge
      const contribution = rr.proposedFare ? Number(rr.proposedFare) : 0;

      // Figure out departure time: use timeWindowStart if set, else the date field
      const departureTime = rr.timeWindowStart ?? rr.date;

      // Calculate estimated arrival using Google Directions API
      let estimatedArrival: Date;
      try {
        const origin = await prisma.location.findUnique({ where: { id: rr.originId! } });
        const dest = await prisma.location.findUnique({ where: { id: rr.destinationId! } });
        if (origin && dest) {
          const apiKey = process.env.GOOGLE_SERVER_MAPS_API_KEY;
          const { data: directionsData } = await axios.get(
            "https://maps.googleapis.com/maps/api/directions/json",
            {
              params: {
                origin: `${origin.latitude},${origin.longitude}`,
                destination: `${dest.latitude},${dest.longitude}`,
                key: apiKey,
              },
            }
          );
          const durationSeconds = directionsData?.routes?.[0]?.legs?.[0]?.duration?.value;
          if (durationSeconds) {
            estimatedArrival = new Date(departureTime.getTime() + durationSeconds * 1000);
          } else {
            estimatedArrival = new Date(departureTime.getTime() + 60 * 60 * 1000); // 1h fallback
          }
        } else {
          estimatedArrival = new Date(departureTime.getTime() + 60 * 60 * 1000);
        }
      } catch {
        estimatedArrival = new Date(departureTime.getTime() + 60 * 60 * 1000); // 1h fallback
      }

      if (!rr.originId || !rr.destinationId) {
        return next(
          AppError(
            isEn
              ? "Ride request is missing location data; cannot accept"
              : "La demande n'a pas de localisation",
            400
          )
        );
      }

      // Atomic: create ride, create booking, close request
      const result = await prisma.$transaction(async (tx) => {
        const created = await createRideFromAcceptedRequest(tx, {
          rideRequest: rr,
          driver,
          vehicle,
          agreedFare: contribution,
          departureTime,
          estimatedArrivalTime: estimatedArrival,
        });
        await sweepPendingBids({
          tx,
          rideRequestId: rr.id,
          reason: "ACCEPTED_ELSEWHERE",
        });
        return created;
      });

      return res.status(201).json({
        success: true,
        message: isEn
          ? "Ride request accepted. A ride has been created."
          : "Demande acceptée. Un trajet a été créé.",
        data: result,
      });
    }
  );

  // Drivers who toggled isAvailableForRideRequest see the list of OPEN requests.
  static getOpenRideRequestsForDrivers = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const driver = req.user!;
      const isEn = req.isEnglishPreferred;

      if (!driver.isDriverOnboarded) {
        return next(
          AppError(
            isEn
              ? "Complete driver onboarding first"
              : "Terminez l'intégration du conducteur d'abord",
            403
          )
        );
      }

      if (!driver.isAvailableForRideRequest) {
        return next(
          AppError(
            isEn
              ? "Turn on ride request availability to see open requests"
              : "Activez votre disponibilité pour voir les demandes",
            403
          )
        );
      }

      const page = Number(req.query.page ?? 1);
      const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);

      // Find vehicle categories the driver owns
      const driverVehicles = await prisma.vehicle.findMany({
        where: { userId: driver.id },
        select: { category: true },
        distinct: ["category"],
      });
      const driverCategories = driverVehicles.map((v) => v.category);

      const where: Prisma.RideRequestWhereInput = {
        status: RideRequestStatus.OPEN,
        userId: { not: driver.id },
        // Only show requests matching the driver's vehicle categories
        ...(driverCategories.length > 0
          ? { vehicleCategory: { in: driverCategories } }
          : {}),
        OR: [
          { timeWindowEnd: { gte: new Date() } },
          { timeWindowEnd: null, date: { gte: new Date() } },
        ],
      };

      const [items, total] = await Promise.all([
        prisma.rideRequest.findMany({
          where,
          include: {
            origin: true,
            destination: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                averageRating: true,
                totalRatings: true,
                profileImage: { select: { url: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.rideRequest.count({ where }),
      ]);

      return res.json({
        success: true,
        data: items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 0,
        },
      });
    }
  );

  static deleteRideRequest = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId } = matchedData<{ requestId: number }>(req, {
        locations: ["params"],
      });
      const userId = req.user!.id;
      const isEn = req.isEnglishPreferred;

      const rr = await prisma.rideRequest.findUnique({
        where: { id: requestId },
      });

      if (!rr) {
        return next(
          AppError(isEn ? "Ride request not found" : "Demande non trouvée", 404)
        );
      }

      if (rr.userId !== userId && req.user!.role !== UserRole.ADMIN) {
        return next(
          AppError(
            isEn ? "Unauthorized to delete this request" : "Non autorisé",
            403
          )
        );
      }

      // // Business rule: only deletable if DRAFT, CLOSED, EXPIRED
      // if (rr.status === RideRequestStatus.OPEN) {
      //   return next(
      //     AppError(
      //       isEn
      //         ? "Cannot delete an OPEN ride request. Close it first."
      //         : "Impossible de supprimer une demande de trajet OUVERTE. Fermez-la d'abord.",
      //       400
      //     )
      //   );
      // }

      await prisma.$transaction(async (tx) => {
        await sweepPendingBids({
          tx,
          rideRequestId: rr.id,
          reason: "REQUEST_CANCELLED",
        });
        await tx.rideRequest.delete({ where: { id: rr.id } });
      });

      return res.json({
        success: true,
        message: isEn
          ? "Ride request deleted successfully"
          : "Demande supprimée avec succès",
      });
    }
  );

  static updateRideRequest = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        requestId,
        origin,
        destination,
        date: dt,
        timeWindowStart: tsdt,
        timeWindowEnd: tedt,
        seats,
        rideType,
        description,
      } = matchedData<{
        requestId: number;
        origin: {
          city: string;
          province: string;
          latitude: number;
          longitude: number;
          locationName?: string;
          address?: string;
          description?: string;
        };
        destination: {
          city: string;
          province: string;
          latitude: number;
          longitude: number;
          locationName?: string;
          address?: string;
          description?: string;
        };
        date?: number;
        timeWindowStart?: number;
        timeWindowEnd?: number;
        seats?: number;
        rideType: RideType;
        description?: string;
      }>(req);
      const userId = req.user!.id;
      const isEn = req.isEnglishPreferred;
      const date = dt ? moment(dt) : undefined;
      let timeWindowStart = tsdt ? moment(tsdt) : undefined;
      let timeWindowEnd = tedt ? moment(tedt) : undefined;

      // Validate request existence
      const rr = await prisma.rideRequest.findUnique({
        where: { id: requestId },
        include: { origin: true, destination: true },
      });

      if (!rr) {
        return next(
          AppError(isEn ? "Ride request not found" : "Demande non trouvée", 404)
        );
      }

      // Only owner
      if (rr.userId !== userId) {
        return next(AppError(isEn ? "Unauthorized" : "Non autorisé", 403));
      }

      // Only DRAFT can be edited
      if (rr.status !== "DRAFT") {
        return next(
          AppError(
            isEn
              ? "Only draft ride requests can be edited"
              : "Seules les demandes de trajet en brouillon peuvent être modifiées",
            400
          )
        );
      }

      if (date && date.isBefore(moment().startOf("day"))) {
        return next(
          AppError(
            isEn
              ? "The date before today is not accepted"
              : "La date avant aujourd'hui n'est pas acceptée"
          )
        );
      }

      if (!date && !timeWindowStart) {
        return next(
          AppError(
            isEn
              ? "Time window start is required when date is not provided"
              : "Le début de la plage horaire est requis lorsque la date n'est pas fournie",
            400
          )
        );
      }

      if (timeWindowStart && timeWindowStart.isBefore(moment()))
        return next(
          AppError(
            isEn
              ? "Time window start must be in future"
              : "Le début de la fenêtre de temps doit être dans le futur"
          )
        );

      if (date && timeWindowStart && !timeWindowStart.isSame(date, "day")) {
        return next(
          AppError(
            isEn
              ? "Time window start must match the selected date"
              : "Le début de la fenêtre temporelle doit correspondre à la date sélectionnée",
            400
          )
        );
      }

      if (date && !timeWindowStart) {
        timeWindowStart = date.clone().startOf("day"); // 00:00
        if (!timeWindowEnd) {
          timeWindowEnd = date.clone().endOf("day"); // 23:59
        }
      }

      if (timeWindowEnd && timeWindowEnd.isBefore(moment()))
        return next(
          AppError(
            isEn
              ? "Time window end must be in future"
              : "La fin de la fenêtre temporelle doit être dans le futur"
          )
        );

      if (!timeWindowEnd) {
        timeWindowEnd = (timeWindowStart || date)!.clone().add(2, "days");
      }
      if (
        timeWindowStart &&
        timeWindowEnd &&
        !timeWindowEnd.isAfter(timeWindowStart)
      )
        return next(
          AppError(
            isEn
              ? "Time window end must be after time window start"
              : "La fin de la fenêtre temporelle doit être après le début de la fenêtre temporelle"
          )
        );

      let originId = rr.originId;
      if (origin && origin.latitude && origin.longitude) {
        if (!rr.originId) {
          const originLocation = await prisma.location.create({
            data: {
              city: origin.city,
              regionCode: null,
              latitude: origin.latitude,
              longitude: origin.longitude,
              region: origin.province,
              locationName: origin.locationName || origin.province,
              address: origin.address,
            },
          });
          originId = originLocation.id;
          await prisma.$executeRaw`
                UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${originLocation.longitude}, ${originLocation.latitude}), 4326)
                WHERE id=${originLocation.id}
              `;
        } else {
          await prisma.location.update({
            where: { id: rr.originId },
            data: {
              city: origin.city,
              region: origin.province,
              regionCode: null,
              latitude: origin.latitude,
              longitude: origin.longitude,
              address: origin.address ?? null,
              description: origin.description ?? null,
              ...(origin.locationName && {
                locationName: origin.locationName,
              }),
            },
          });

          // set the PostGIS locationPoint after creation (locationPoint is not part of Prisma's create input)
          await prisma.$executeRaw`
          UPDATE "Location"
          SET "locationPoint" = ST_SetSRID(ST_MakePoint(${origin.longitude}, ${origin.latitude}), 4326)
          WHERE id = ${rr.originId}`;
        }
      }

      let destId = rr.destinationId;
      if (destination && destination.latitude && destination.longitude) {
        if (!rr.destinationId) {
          const destinationLocation = await prisma.location.create({
            data: {
              city: destination.city,
              regionCode: null,
              latitude: destination.latitude,
              longitude: destination.longitude,
              region: destination.province,
              locationName: destination.locationName || destination.province,
              address: destination.address,
            },
          });
          destId = destinationLocation.id;
          await prisma.$executeRaw`
                UPDATE "Location" SET "locationPoint" = ST_SetSRID(ST_MakePoint(${destinationLocation.longitude}, ${destinationLocation.latitude}), 4326)
                WHERE id=${destinationLocation.id}
              `;
        } else {
          await prisma.location.update({
            where: { id: rr.destinationId },
            data: {
              city: destination.city,
              region: destination.province,
              regionCode: null,
              latitude: destination.latitude,
              longitude: destination.longitude,
              address: destination.address ?? null,
              description: destination.description ?? null,
              ...(destination.locationName && {
                locationName: destination?.locationName,
              }),
            },
          });

          //set the PostGIS locationPoint after creation (locationPoint is not part of Prisma's create input)
          await prisma.$executeRaw`
          UPDATE "Location"
          SET "locationPoint" = ST_SetSRID(ST_MakePoint(${destination.longitude}, ${destination.latitude}), 4326)
          WHERE id = ${rr.destinationId}
        `;
        }
      }

      //
      // Update Ride Request
      //
      const updated = await prisma.rideRequest.update({
        where: { id: requestId },
        data: {
          date: date?.toDate() ?? rr.date,
          timeWindowStart: timeWindowStart?.toDate() ?? rr.timeWindowStart,
          timeWindowEnd: timeWindowEnd?.toDate() ?? rr.timeWindowEnd,
          seats: seats ?? rr.seats,
          // proximityMeters: proximityMeters ?? rr.proximityMeters,
          rideType: rideType ?? rr.rideType,
          originId,
          destinationId: destId,

          originCity: origin.city,
          originProvince: origin.province,
          destCity: destination.city,
          destProvince: destination.province,
          description,
        },
        include: {
          origin: true,
          destination: true,
          matches: true,
        },
      });

      return res.json({
        success: true,
        data: updated,
        message: isEn
          ? "Ride request updated successfully"
          : "Demande mise à jour avec succès",
      });
    }
  );
}
