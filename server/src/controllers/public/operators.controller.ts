import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../../config/database";

export const PublicOperatorController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await prisma.user.findMany({
        where: { role: UserRole.BUS_OPERATOR, operatorRoutes: { some: { isActive: true } } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          averageRating: true,
          totalRatings: true,
          profileImage: { select: { url: true } },
          operatorRoutes: { where: { isActive: true }, select: { id: true } },
        },
        orderBy: { firstName: "asc" },
      });
      const operators = rows.map((u) => ({
        id: u.id,
        name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "Operator",
        photoUrl: u.profileImage?.url ?? null,
        rating: u.averageRating,
        totalRatings: u.totalRatings,
        routeCount: u.operatorRoutes.length,
      }));
      res.json({ operators });
    } catch (err) {
      next(err);
    }
  },

  async routes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const operatorId = Number(req.params.operatorId);
      const routes = await prisma.busRoute.findMany({
        where: { operatorId, isActive: true },
        include: { stops: { orderBy: { order: "asc" } } },
        orderBy: { originCity: "asc" },
      });
      res.json({ routes });
    } catch (err) {
      next(err);
    }
  },
};
