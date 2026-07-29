import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/CatchAsync";
import { matchedData } from "express-validator";
import { DbUser } from "../types";
import { prisma } from "../config/database";

class NotificationsController {
  static getUserNotifications = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { page = 1, pageSize = 10 } = matchedData<{
        page: number;
        pageSize: number;
      }>(req);
      const skip = (page - 1) * pageSize;
      const user = req.user! as DbUser;

      let take = pageSize;

      //! commented for now for frontend to pull all data at once for statistics since are not yet done on backend
      // if (take > 50) {
      //   take = 50;
      // }
      const [notifications, total] = await prisma.$transaction([
        prisma.notification.findMany({
          where: {
            userId: user.id,
          },
          take,
          skip,
          orderBy: [
            { isRead: "asc" }, // Unread first
            { createdAt: "desc" }, // Latest first
          ],
        }),
        prisma.notification.count({
          where: {
            userId: user.id,
          },
        }),
      ]);

      const totalPages = Math.ceil(total / take);

      res.status(200).json({
        success: true,
        data: notifications,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      });
    }
  );

  static markSingleAsRead = catchAsync(async (req: Request, res: Response) => {
      const { notificationId } = matchedData<{ notificationId: number }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      await prisma.notification.update({
        where: {
          id: notificationId,
          userId: user.id
        },
        data: {
          isRead: true,
        }
      })
      res.status(200).json({
        success: true,
        message: isEN?"Notification is marked as read": "La notification est marquée comme lue",
      });
  })

  static markAllAsRead = catchAsync(async (req: Request, res: Response)=> {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
        },
        data: {
          isRead: true
        }
      });
      res.status(200).json({
        success: true,
        message: isEN?"All notifications are marked as read": "Toutes les notifications sont marquées comme lues",
      });
  });

  static registerFCMToken = catchAsync(async (req: Request, res: Response)=>{
    const { token } = matchedData<{token: string}>(req);
    const isEn = req.isEnglishPreferred;
    const user = req.user! as DbUser;
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        fcm_token: token,
      }
    });
    res.status(200).json({
      success: true,
      message: isEn? "FCM token successfully registered": "Le jeton FCM a été enregistré avec succès"
    })
  })
}

export {NotificationsController};
