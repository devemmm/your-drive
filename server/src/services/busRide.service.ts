import { RideStatus, BookingType, Prisma } from "@prisma/client";
import { prisma } from "../config/database";

export const rideInclude = {
  route: { select: { id: true, originCity: true, destCity: true } },
  vehicle: { select: { id: true, make: true, model: true, plateNumber: true } },
} as const;

function locationFromStop(city: string, stop?: { latitude?: number | null; longitude?: number | null }) {
  return {
    region: city, city, locationName: city,
    latitude: stop?.latitude ?? 0, longitude: stop?.longitude ?? 0, regionCode: null,
  };
}

export async function createBusRide(params: {
  operatorId: number;
  routeId: number;
  vehicleId: number;
  departureTime: Date;
  seats: number;
  routeDepartureId?: number | null;
}) {
  const route = await prisma.busRoute.findFirst({
    where: { id: params.routeId, operatorId: params.operatorId },
    include: { stops: { orderBy: { order: "asc" } } },
  });
  if (!route) throw new Error("ROUTE_NOT_FOUND");

  const firstStop = route.stops[0];
  const lastStop = route.stops[route.stops.length - 1];

  return prisma.ride.create({
    data: {
      departureTime: params.departureTime,
      availableSeats: params.seats,
      totalSeats: params.seats,
      contribution: Number(route.basePrice),
      status: RideStatus.PUBLISHED,
      publishedAt: new Date(),
      bookingType: BookingType.AUTOMATIC,
      contributionCollectionMethod: "OFF_PLATFORM",
      driver: { connect: { id: params.operatorId } },
      vehicle: { connect: { id: params.vehicleId } },
      route: { connect: { id: route.id } },
      ...(params.routeDepartureId
        ? { routeDeparture: { connect: { id: params.routeDepartureId } } }
        : {}),
      // Bus trips need a chat thread like carpool rides do: the booking flow
      // (bookARide, OFF_PLATFORM path) connects the passenger to ride.chatThread
      // on booking, which fails if the thread doesn't exist.
      chatThread: {
        create: {
          ownerId: params.operatorId,
          users: { connect: { id: params.operatorId } },
        },
      },
      departureLocation: { create: locationFromStop(route.originCity, firstStop) },
      destinationLocation: { create: locationFromStop(route.destCity, lastStop) },
    },
    include: rideInclude,
  });
}

export async function findOrCreateScheduledRide(params: { routeDepartureId: number; date: string }) {
  const departure = await prisma.busRouteDeparture.findFirst({
    where: { id: params.routeDepartureId, isActive: true },
    include: { route: true, vehicle: true },
  });
  if (!departure) throw new Error("DEPARTURE_NOT_FOUND");

  const [h, m] = departure.timeOfDay.split(":").map(Number);
  const departureTime = new Date(`${params.date}T00:00:00`);
  departureTime.setHours(h ?? 0, m ?? 0, 0, 0);
  if (departureTime.getTime() <= Date.now()) throw new Error("PAST_DEPARTURE");

  const key = { routeDepartureId_departureTime: { routeDepartureId: departure.id, departureTime } };

  const existing = await prisma.ride.findUnique({ where: key, include: rideInclude });
  if (existing) return existing;

  try {
    return await createBusRide({
      operatorId: departure.route.operatorId,
      routeId: departure.routeId,
      vehicleId: departure.vehicleId,
      departureTime,
      seats: departure.vehicle.capacity,
      routeDepartureId: departure.id,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const raced = await prisma.ride.findUnique({ where: key, include: rideInclude });
      if (raced) return raced;
    }
    throw e;
  }
}
