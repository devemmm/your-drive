import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { PrismaClient } from "@prisma/client";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";

const prisma = new PrismaClient();

export class ContactMessageController {
  // Create a new message
  static createMessage = catchAsync(async (req: Request, res: Response) => {
    const { name, email, subject, message, phoneNumber } = matchedData<{
        name: string;
        email: string;
        subject: string;
        message: string;
        phoneNumber?: string;
    }>(req);

    const newMessage = await prisma.contactMessage.create({
      data: { name, email, subject, message, phoneNumber },
    });


    return res.status(201).json({
      success: true,
      data: newMessage,
    });
  });

  // Get all messages
static getMessages = catchAsync(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 10 } = matchedData<{ page?: number; pageSize?: number }>(req, { locations: ["query"] });

    const [messages, total] = await prisma.$transaction([
        prisma.contactMessage.findMany({
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: [
            { isRead: "asc" }, // Unread first
            { createdAt: "desc" }, // Latest first
          ],
        }),
        prisma.contactMessage.count(),
    ]);

    return res.json({
        success: true,
        data: messages,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
    });
});

  // Get a single message by ID
  static getMessageById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });

      const message = await prisma.contactMessage.findUnique({
        where: { id },
      });

      if (!message) {
        return next(AppError(req.isEnglishPreferred?"Message not found.":"Message introuvable.", 404));
      }

      return res.json({ success: true, data: message });
    }
  );

  // Mark message as read
  static markAsRead = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });
      const exist = await prisma.contactMessage.findUnique({
        where: { id },
      });

      
      if (!exist) {
          return next(AppError(req.isEnglishPreferred?"Message not found": "Message introuvable", 404));
        }
        const message = await prisma.contactMessage.update({
          where: { id },
          data: { isRead: true },
        });

      return res.json({ success: true, data: message, message: req.isEnglishPreferred?"Message marked as read successfully": "Message marqué comme lu avec succès" });
    }
  );

  // Update message (subject/message text, etc.)
//   static updateMessage = catchAsync(
//     async (req: Request, res: Response, next: NextFunction) => {
//       const { id, ...updateData } = matchedData(req, { locations: ["body", "params"] });

//       const updatedMessage = await prisma.contactMessage.update({
//         where: { id: Number(id) },
//         data: updateData,
//       });

//       if (!updatedMessage) {
//         return next(AppError("Message not found", 404));
//       }

//       return res.json({ success: true, data: updatedMessage });
//     }
//   );

  // Delete message
  static deleteMessage = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = matchedData<{ id:number }>(req, { locations: ["params"] });
      const exist = await prisma.contactMessage.findUnique({
        where: { id },
      });

      
      if (!exist) {
          return next(AppError(req.isEnglishPreferred?"Message not found": "Message introuvable", 404));
        }

      await prisma.contactMessage.delete({
        where: { id: Number(id) },
      });

      return res.json({
        success: true,
        message: req.isEnglishPreferred?"Message deleted successfully": "Message supprimé avec succès",
      });
    }
  );
}
