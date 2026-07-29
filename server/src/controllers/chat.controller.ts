import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { profileSelects } from "../types";
import { ModerationController } from "./moderation.controller";
import {logger,LogLevel } from '../utils/logger';

let chatGateway: any = null;

export const setChatGateway = (gateway: any) => {
  chatGateway = gateway;
};

export const getAllChatThreads = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const order = (req.query.order as string) === "desc" ? "desc" : "asc";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chatThreads: {
          orderBy: {
            [sortBy]: order,
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1, // Get last message for preview
              include: {
                sender: {
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
            ride: {
              select: {
                id: true,
                departureLocation: {
                  select: {
                    city: true,
                    region: true,
                  },
                },
                destinationLocation: {
                  select: {
                    city: true,
                    region: true,
                  },
                },
                departureTime: true,
              },
            },
          },
        },
      },
    });

    const threads = user?.chatThreads || [];

    // add unread message count for each thread using proper read tracking
    const threadsWithUnreadCount = await Promise.all(
      threads.map(async (thread) => {
        // Count messages that are not sent by current user AND not read by current user
        const unreadCount = await prisma.chatMessage.count({
          where: {
            threadId: thread.id,
            senderId: { not: userId },
            readBy: { none: { userId: userId! } },
          },
        });
        
        return {
          ...thread,
          unreadCount,
          lastMessage: thread.messages[0] || null,
        };
      })
    );

    const total = await prisma.chatThread.count({
      where: {
        users: {
          some: { id: userId },
        },
      },
    });
    res.status(200).json({
      success: true,
      data: threadsWithUnreadCount,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }
);

export const getThreadMessages = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const threadId = parseInt(req.params.threadId, 10);
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const order = (req.query.order as string) === "desc" ? "desc" : "asc";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chatThreads: {
          where: { id: threadId },
          select: { id: true },
        },
      },
    });

    const thread = user?.chatThreads?.[0];

    if (!thread) return next(AppError("Thread not found", 404));

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { threadId },
        orderBy: { [sortBy]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          sender: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isVerified: true,
              profileImage: {
                select: {
                  url: true,
                },
              },
            },
          },
        },
      }),
      prisma.chatMessage.count({
        where: { threadId },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }
);

export const sendMessage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, thread } = req as any;
    const threadId = parseInt(req.params.threadId, 10);
    const content = (req.body.content || "").trim();

    if (!content) return next(AppError("Message content cannot be empty"));

    const isUserInThread = thread.users.some(
      (u: { id: number }) => u.id === user.id
    );
    if (!isUserInThread)
      return next(AppError("You do not have access to this thread", 403));

    // Enhanced content moderation for chat messages
    const moderationResult = await ModerationController.validateContentInline(
      content,
      {
        contentType: "chat_message",
        userRole: user.role === "ADMIN" ? "ADMIN" : "USER",
        questionContext: `Chat thread for ride ID: ${thread.rideId}`,
      }
    );

    if (!moderationResult.isValid) {
      const notmoderationResultData = {
        level: LogLevel.WARN,
        message: "Chat moderation failed",
        action: "ChatModeration",
        userId: user.id,
        meta: {
          threadId,
          content: content.substring(0, 50),
          reason: moderationResult.message,
        },
      };
      
      logger.warn(notmoderationResultData.message, {
        userId: notmoderationResultData.userId,
        threadId: notmoderationResultData.meta.threadId,
        content: notmoderationResultData.meta.content,
        reason: notmoderationResultData.meta.reason,
      });
      // Log moderation failure for monitoring
      console.log(
        `🚫 Chat moderation failed - User: ${
          user.id
        }, Thread: ${threadId}, Content: "${content.substring(
          0,
          50
        )}...", Reason: ${moderationResult.message}`
      );

      return next(
        AppError(`Message blocked: ${moderationResult.message}`, 400)
      );
    }

    const message = await prisma.chatMessage.create({
      data: {
        threadId,
        content,
        senderId: user.id,
      },
      include: {
        sender: {
          select: profileSelects,
        },
      },
    });
    // update thread's updatedAt timestamp
    await prisma.chatThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // emit chat message to gatway if available
    if (chatGateway) {
      chatGateway.emitToThread(threadId, "new_message", {
        success: true,
        data: message,
      });

      // notify thread participants who might not be active in the thread
      await notifyThreadParticipants(threadId, message, user.id);
    }
    res.status(200).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  }
);

export const updateMessage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, thread } = req as any;
    const { threadId, messageId } = req.params;
    const content = (req.body.content || "").trim();

    const isUserInThread = thread.users.some(
      (u: { id: number }) => u.id === user.id
    );
    if (!isUserInThread)
      return next(AppError("You do not have access to this thread", 403));

    // Fetch message directly by ID, then validate threadId and ownership
    const existingMessage = await prisma.chatMessage.findUnique({
      where: { id: parseInt(messageId, 10) },
    });

    if (!existingMessage || existingMessage.threadId !== parseInt(threadId, 10))
      return next(AppError("Message not found in this thread", 404));

    if (existingMessage.senderId !== user.id)
      return next(
        AppError("You are not authorized to update this message", 403)
      );

    // Content moderation for message updates
    const moderationResult = await ModerationController.validateContentInline(
      content,
      {
        contentType: "chat_message",
        userRole: user.role === "ADMIN" ? "ADMIN" : "USER",
        questionContext: `Chat thread for ride ID: ${thread.rideId}`,
      }
    );

    if (!moderationResult.isValid) {
      // Log moderation failure for monitoring
      console.log(
        `🚫 Chat moderation failed (update) - User: ${
          user.id
        }, Thread: ${threadId}, Content: "${content.substring(
          0,
          50
        )}...", Reason: ${moderationResult.message}`
      );

      return next(
        AppError(`Message blocked: ${moderationResult.message}`, 400)
      );
    }

    const message = await prisma.chatMessage.update({
      where: { id: parseInt(messageId) },
      data: { content },
    });

    if (chatGateway) {
      chatGateway.emitToThread(threadId, "message_updated", {
        success: true,
        data: message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Message updated successfully",
      data: message,
    });
  }
);

export const deleteMessage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, thread } = req as any;
    const threadId = parseInt(req.params.threadId, 10);
    const messageId = parseInt(req.params.messageId, 10);

    if (!thread) return next(AppError("Thread not found", 404));

    const isUserInThread = thread.users.some(
      (u: { id: number }) => u.id === user?.id
    );
    if (!isUserInThread)
      return next(AppError("You do not have access to this thread", 403));

    const existingMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!existingMessage || existingMessage.threadId !== threadId)
      return next(AppError("Message not found in this thread", 404));

    if (!user || existingMessage.senderId !== user.id)
      return next(
        AppError("You are not authorized to delete this message", 403)
      );

    const message = await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    // emit via socket if gateway is available
    if (chatGateway) {
      chatGateway.emitToThread(threadId, "message_deleted", {
        success: true,
        data: { messageId, threadId },
      });
    }

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
      data: message,
    });
  }
);

export const markMessageAsRead = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user } = req as any;
    const messageId = parseInt(req.params.messageId, 10);

    if (!user) return next(AppError("User not authenticated", 401));

    // Check if message exists and user has access to it
    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId },
      include: {
        thread: {
          include: {
            users: {
              where: { id: user.id },
              select: { id: true },
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

    if (!message) return next(AppError("Message not found", 404));

    if (message.thread.users.length === 0) {
      return next(AppError("You do not have access to this message", 403));
    }

    // Mark message as read (upsert to avoid duplicates)
    const messageRead = await prisma.messageRead.upsert({
      where: {
        messageId_userId: {
          messageId: messageId,
          userId: user.id,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        messageId: messageId,
        userId: user.id,
        readAt: new Date(),
      },
    });

    // Emit via socket if gateway is available
    if (chatGateway) {
      chatGateway.emitToUser(user.id, "message_read", {
        success: true,
        data: { messageId, readAt: messageRead.readAt },
      });
    }

    res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: { messageId, readAt: messageRead.readAt },
    });
  }
);

export const markThreadAsRead = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, thread } = req as any;
    const threadId = parseInt(req.params.threadId, 10);

    if (!user) return next(AppError("User not authenticated", 401));
    if (!thread) return next(AppError("Thread not found", 404));

    // Check if user has access to this thread
    const isUserInThread = thread.users.some(
      (u: { id: number }) => u.id === user.id
    );
    if (!isUserInThread) {
      return next(AppError("You do not have access to this thread", 403));
    }

    // Get all unread messages in this thread for this user
    const unreadMessages = await prisma.chatMessage.findMany({
      where: {
        threadId: threadId,
        senderId: { not: user.id }, // Messages not sent by current user
        readBy: {
          none: {
            userId: user.id,
          },
        },
      },
      select: { id: true },
    });

    if (unreadMessages.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No unread messages in this thread",
        data: { threadId, markedCount: 0 },
      });
    }

    // Mark all unread messages as read
    const messageReads = await Promise.all(
      unreadMessages.map((message) =>
        prisma.messageRead.upsert({
          where: {
            messageId_userId: {
              messageId: message.id,
              userId: user.id,
            },
          },
          update: {
            readAt: new Date(),
          },
          create: {
            messageId: message.id,
            userId: user.id,
            readAt: new Date(),
          },
        })
      )
    );

    // Emit via socket if gateway is available
    if (chatGateway) {
      chatGateway.emitToUser(user.id, "thread_read", {
        success: true,
        data: { threadId, markedCount: messageReads.length },
      });
    }

    res.status(200).json({
      success: true,
      message: "Thread marked as read",
      data: { threadId, markedCount: messageReads.length },
    });
  }
);

export const getUnreadCount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user } = req as any;
    const threadId = req.query.threadId
      ? parseInt(req.query.threadId as string, 10)
      : undefined;

    if (!user) return next(AppError("User not authenticated", 401));

    let whereClause: any = {
      senderId: { not: user.id }, // Messages not sent by current user
      readBy: {
        none: {
          userId: user.id,
        },
      },
    };

    // If threadId is provided, filter by specific thread
    if (threadId) {
      whereClause.threadId = threadId;
    } else {
      // Get all threads where user is a participant
      const userThreads = await prisma.chatThread.findMany({
        where: {
          users: {
            some: { id: user.id },
          },
        },
        select: { id: true },
      });
      whereClause.threadId = {
        in: userThreads.map((thread) => thread.id),
      };
    }

    const unreadCount = await prisma.chatMessage.count({
      where: whereClause,
    });

    res.status(200).json({
      success: true,
      message: "Unread count retrieved",
      data: { unreadCount, threadId },
    });
  }
);

// Helper function to notify thread participants
async function notifyThreadParticipants(
  threadId: number,
  message: any,
  senderId: number
) {
  try {
    if (!chatGateway) return;

    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        users: {
          where: {
            id: { not: senderId },
          },
          select: { id: true },
        },
      },
    });

    if (!thread) return;

    // Send notification to each participant
    thread.users.forEach((user) => {
      chatGateway.emitToUser(user.id, "new_message_notification", {
        threadId,
        message: {
          id: message.id,
          content: message.content,
          sender: message.sender,
          createdAt: message.createdAt,
        },
      });
    });
  } catch (error) {
    console.error("Error notifying thread participants:", error);
  }
}
