import { Request, Response } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { DbUser } from "../types";
import { listBusRoutes } from "../services/search/busRouteSearch.service";

export class BusRouteController {
  static list = catchAsync(async (req: Request, res: Response) => {
    const { operatorId, originCity, destCity, isActive } = req.query;
    const where: any = {};
    if (operatorId) where.operatorId = Number(operatorId);
    if (originCity) where.originCity = String(originCity);
    if (destCity) where.destCity = String(destCity);
    if (isActive !== undefined) where.isActive = isActive === "true";
    const routes = await prisma.busRoute.findMany({
      where,
      include: {
        stops: { orderBy: { order: "asc" } },
        operator: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ originCity: "asc" }, { destCity: "asc" }],
    });
    res.json({ routes });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const {
      operatorId,
      originCity,
      destCity,
      distanceKm,
      basePrice,
      isActive = true,
      stops = [],
    } = req.body;
    const route = await prisma.busRoute.create({
      data: {
        operatorId,
        originCity,
        destCity,
        distanceKm,
        basePrice,
        isActive,
        stops: {
          create: stops.map((s: any, i: number) => ({
            name: s.name,
            city: s.city,
            order: s.order ?? i,
            latitude: s.latitude,
            longitude: s.longitude,
          })),
        },
      },
      include: { stops: true },
    });
    res.status(201).json({ route });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { originCity, destCity, distanceKm, basePrice, isActive } = req.body;
    const route = await prisma.busRoute.update({
      where: { id },
      data: { originCity, destCity, distanceKm, basePrice, isActive },
    });
    res.json({ route });
  });

  // WARNING: This will fail (FK constraint violation) if any existing Booking
  // references a stop being removed via boardingStopId with onDelete: Restrict.
  // Safe for pre-launch admin editing only. Future fix: diff stops or soft-delete.
  static replaceStops = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { stops } = req.body as {
      stops: {
        name: string;
        city: string;
        order: number;
        latitude?: number;
        longitude?: number;
      }[];
    };
    await prisma.$transaction([
      prisma.busRouteStop.deleteMany({ where: { routeId: id } }),
      prisma.busRouteStop.createMany({
        data: stops.map((s) => ({ ...s, routeId: id })),
      }),
    ]);
    const fresh = await prisma.busRoute.findUniqueOrThrow({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    res.json({ route: fresh });
  });

  static delete_ = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await prisma.busRoute.delete({ where: { id } });
    res.status(204).end();
  });

  // GET /bus-routes/search — passenger search (legacy authed mount).
  //
  // This route is mounted under `/bus-routes` in `routes/index.ts` behind
  // `isAuthenticated`, so `req.user` is always populated. The body
  // delegates to the shared `busRouteSearch` service so the public
  // mirror at `/public/bus-routes/search` and this legacy authed path
  // stay in lockstep. Bus routes have no auth-only fields on the public
  // shape — the viewer parameter is forwarded purely so the service can
  // continue to gate operator phone / email via its response mapper if
  // they are ever added to the embedded shape.
  //
  // Wire contract preserved verbatim:
  //   - Both `originCity` and `destCity` are required; missing either
  //     returns `400 { error: "ORIGIN_DEST_REQUIRED" }`.
  //   - Response shape is `{ routes }`; no pagination envelope.
  static publicSearch = catchAsync(async (req: Request, res: Response) => {
    const { originCity, destCity } = req.query;
    if (!originCity || !destCity) {
      return res.status(400).json({ error: "ORIGIN_DEST_REQUIRED" });
    }
    const user = req.user as DbUser;
    const result = await listBusRoutes({
      viewer: { isGuest: false, userId: user.id },
      filters: {
        originCity: String(originCity),
        destCity: String(destCity),
      },
    });
    res.json({ routes: result.items });
  });
}
