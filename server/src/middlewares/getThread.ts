import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";

export const findThreadOrThrowError = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const threadId = parseInt(req.params.threadId, 10);

    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        users: true,
      },
    });

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found",
      });
    }

    (req as any).thread = thread;
    next();
  }
);
