import type { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { UserRole } from "@prisma/client";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import {
  BidConflictError,
  acceptBid,
  cancelBidByDriver,
  getBid,
  listBidsForRequest,
  submitBid,
} from "../services/bid.service";

function bidErrorToHttp(err: unknown): never {
  if (err instanceof BidConflictError) {
    const status =
      err.code === "NOT_OWNER" ||
      err.code === "VEHICLE_NOT_OWNED" ||
      err.code === "KYC_REQUIRED"
        ? 403
        : 409;
    const httpErr = AppError(err.message, status) as Error & { code?: string };
    httpErr.code = err.code;
    throw httpErr;
  }
  throw err;
}

export class BidController {
  static submit = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id, amount, vehicleId } = matchedData<{
      id: number;
      amount: number;
      vehicleId: number;
    }>(req, { locations: ["params", "body"] });
    try {
      const bid = await submitBid({
        rideRequestId: id,
        driverId: req.user!.id,
        vehicleId,
        amount,
      });
      res.status(201).json({ success: true, data: bid });
    } catch (err) {
      try {
        bidErrorToHttp(err);
      } catch (mapped) {
        return next(mapped);
      }
    }
  });

  static listForRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });
    try {
      const bids = await listBidsForRequest({
        rideRequestId: id,
        callerId: req.user!.id,
        isAdmin: req.user!.role === UserRole.ADMIN,
      });
      res.json({ success: true, data: bids });
    } catch (err) {
      try {
        bidErrorToHttp(err);
      } catch (mapped) {
        return next(mapped);
      }
    }
  });

  static accept = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });
    try {
      const result = await acceptBid({ bidId: id, passengerId: req.user!.id });
      res.json({ success: true, data: result });
    } catch (err) {
      try {
        bidErrorToHttp(err);
      } catch (mapped) {
        return next(mapped);
      }
    }
  });

  static cancel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });
    try {
      const bid = await cancelBidByDriver({ bidId: id, driverId: req.user!.id });
      res.json({ success: true, data: bid });
    } catch (err) {
      try {
        bidErrorToHttp(err);
      } catch (mapped) {
        return next(mapped);
      }
    }
  });

  static getOne = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });
    const bid = await getBid({ bidId: id });
    if (!bid) return next(AppError("Bid not found", 404));
    res.json({ success: true, data: bid });
  });
}
