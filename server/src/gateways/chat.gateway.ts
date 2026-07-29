import { Server, Socket } from "socket.io";
import { logger } from "../utils/logger";
import { prisma } from "../config/database";
import jwt from "jsonwebtoken";
import { threadId } from "worker_threads";
import { ModerationController } from "../controllers/moderation.controller";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  user?: { id: number; email: string; firstName: string|null; lastName: string|null; role: string };
}

interface JoinThreadData {
  threadId: number;
}

interface SendMessageData {
  threadId: number;
  content: string;
}

interface UpdateMessageData {
  threadId: number;
  messageId: number;
  content: string;
}
interface DeleteMessageData {
  threadId: number;
  messageId: number;
}

export class ChatGateway {
  private io: Server;
  constructor(io: Server) {
    this.io = io;
    this.initializeNamespace();
  }
  private initializeNamespace() {
    const chatNamespace = this.io.of("/chat");

    chatNamespace.use(this.authenticateSocket.bind(this));

    chatNamespace.on("connection", (socket: AuthenticatedSocket) => {
      logger.debug(`User ${socket.user?.firstName} connected to chat`);

      // join user to their personal room for notifications
      socket.join(`user_${socket.userId}`);

      // handle joining a specific chat thread
      socket.on("join_thread", (data: JoinThreadData) => {
        this.handleJoinThread(socket, data);
      });

      // handle leaving a specific chat thread
      socket.on("leave_thread", (data: JoinThreadData) => {
        this.handleLeaveThread(socket, data);
      });

      // handle sending a message
      socket.on("send_message", (data: SendMessageData) => {
        this.handleSendMessage(socket, data);
      });

      // handle updating a message
      socket.on("update_message", (data: UpdateMessageData) => {
        this.handleUpdateMessage(socket, data);
      });

      // handle delete a message
      socket.on("delete_message", (data: DeleteMessageData) => {
        this.handleDeleteMessage(socket, data);
      });

      // handle typing indicators
      socket.on("typing_start", (data: { threadId: number }) => {
        this.handleTypingStart(socket, data);
      });

      // handle stop typing
      socket.on("typing_stop", (data: { threadId: number }) => {
        this.handleTypingStop(socket, data);
      });

      // handle marking message as read
      socket.on("mark_message_read", (data: { messageId: number }) => {
        this.handleMarkMessageRead(socket, data);
      });

      // handle marking thread as read
      socket.on("mark_thread_read", (data: { threadId: number }) => {
        this.handleMarkThreadRead(socket, data);
      });

      // handle disconnection
      socket.on("disconnect", () => {
        logger.debug(`User ${socket.user?.firstName} disconnected fro the chat`);
      });
    });
  }

  private async authenticateSocket(
    socket: AuthenticatedSocket,
    next: Function
  ) {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization;
      if (!token) return next(new Error("Authentication token required"));

      const decoded = await this.verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      logger.error("Socket authentication error", error);
      next(new Error("Authentication failed"));
    }
  }
  private async verifyToken(token: string) {
    const SECRET_KEY = process.env.SECRET_KEY;

    if (!SECRET_KEY) throw new Error("No SECRET_KEY provided");

    const decoded = jwt.verify(token, SECRET_KEY) as {
      userId: number;
      email: string;
    };
    return decoded;
  }

  private async handleJoinThread(
    socket: AuthenticatedSocket,
    data: JoinThreadData
  ) {
    try {
      const { threadId } = data;

      // first check if user has access tl this thread
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, users: { some: { id: socket.userId } } },
      });
      if (!thread) {
        socket.emit("error", {
          message: "Thread not found or not authorized to access the Thread",
        });
        return;
      }
      // joinn thread room
      socket.join(`thread_${threadId}`);
      socket.emit("joined_thread", { threadId });

      logger.debug(`User ${socket.user?.firstName} joined thread ${threadId}`);
    } catch (error) {
      logger.error(`Error joining thread: ${error}`);
      socket.emit("error", { message: "Failed to join thread" });
    }
  }
  private handleLeaveThread(socket: AuthenticatedSocket, data: JoinThreadData) {
    try {
      const { threadId } = data;
      socket.leave(`thread_${threadId}`);
      socket.emit("left_thread", { threadId });

      logger.debug(`User ${socket.user?.firstName} left thread ${threadId}`);
    } catch (error) {
      logger.error(`Error leaving thread: ${error}`);
      socket.emit("error", { message: "Failed to leave server" });
    }
  }

  private async handleSendMessage(
    socket: AuthenticatedSocket,
    data: SendMessageData
  ) {
    try {
      const { threadId, content } = data;
      if (!content.trim()) {
        socket.emit("error", { message: "Message content can't be emptyy" });
        return;
      }

      // see if user has access tot this thread
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, users: { some: { id: socket.userId } } },
        include: {
          ride: {
            select: { id: true },
          },
        },
      });
      if (!thread) {
        socket.emit("error", {
          message: "Thread not found or not authorized to access the Thread",
        });
        return;
      }

      // Content moderation for chat messages
      const moderationResult = await ModerationController.validateContentInline(
        content.trim(),
        {
          contentType: "chat_message",
          userRole: socket.user?.role === "ADMIN" ? "ADMIN" : "USER",
          questionContext: `Chat thread for ride ID: ${thread.ride?.id}`,
        }
      );

      if (!moderationResult.isValid) {
        // Log moderation failure for monitoring
        console.log(
          `🚫 Chat moderation failed (socket send) - User: ${
            socket.userId
          }, Thread: ${threadId}, Content: "${content.substring(
            0,
            50
          )}...", Reason: ${moderationResult.message}`
        );

        socket.emit("error", {
          message: `Message blocked: ${moderationResult.message}`,
        });
        return;
      }

      // now crreate the message
      const message = await prisma.chatMessage.create({
        data: { threadId, content: content.trim(), senderId: socket.userId! },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isVerified: true,
            },
          },
        },
      });

      // emit the message to all users in the thread
      this.io
        .of("/chat")
        .to(`thread_${threadId}`)
        .emit(`new_message`, { success: true, data: message });

      // also send notification to thread participants who are not in the thread currently
      await this.notifyThreadParticipants(threadId, message, socket.userId!);
      logger.debug(
        `Message sent in thread ${threadId} by user ${socket.user?.firstName}`
      );
    } catch (error) {
      logger.error(`Error sending message: ${error}`);
      socket.emit("error", { message: "Failed to send message" });
    }
  }
  private async handleUpdateMessage(
    socket: AuthenticatedSocket,
    data: UpdateMessageData
  ) {
    try {
      const { threadId, messageId, content } = data;
      if (!content.trim()) {
        socket.emit("error", { message: "Content can't be empty" });
        return;
      }

      // verify if message exists and user is the owner
      const existingMessage = await prisma.chatMessage.findFirst({
        where: { id: messageId, threadId, senderId: socket.userId },
        include: {
          thread: {
            include: {
              ride: {
                select: { id: true },
              },
            },
          },
        },
      });
      if (!existingMessage) {
        socket.emit(
          "error",
          "Message not found or not authorized to update the message"
        );
        return;
      }

      // Content moderation for message updates
      const moderationResult = await ModerationController.validateContentInline(
        content.trim(),
        {
          contentType: "chat_message",
          userRole: socket.user?.role === "ADMIN" ? "ADMIN" : "USER",
          questionContext: `Chat thread for ride ID: ${existingMessage.thread.ride?.id}`,
        }
      );

      if (!moderationResult.isValid) {
        // Log moderation failure for monitoring
        console.log(
          `🚫 Chat moderation failed (socket update) - User: ${
            socket.userId
          }, Thread: ${threadId}, Content: "${content.substring(
            0,
            50
          )}...", Reason: ${moderationResult.message}`
        );

        socket.emit("error", {
          message: `Message blocked: ${moderationResult.message}`,
        });
        return;
      }

      // update the message
      const updatedMessage = await prisma.chatMessage.update({
        where: { id: messageId },
        data: { content: content.trim() },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isVerified: true,
            },
          },
        },
      });

      // emit to all users currently in the thread
      this.io
        .of(`/chat`)
        .to(`thread_${threadId}`)
        .emit("message_updated", { success: true, data: updatedMessage });
      logger.debug(
        `Message ${messageId} updated in thread ${threadId} by user ${socket.user?.firstName}`
      );
    } catch (error) {
      logger.error("Error updating message:", error);
      socket.emit("error", { message: "Failed to update message" });
    }
  }

  private async handleDeleteMessage(
    socket: AuthenticatedSocket,
    data: DeleteMessageData
  ) {
    try {
      const { threadId, messageId } = data;

      // check if message exists is user is the owner
      const messageExists = await prisma.chatMessage.findFirst({
        where: { id: messageId, threadId, senderId: socket.userId },
      });

      if (!messageExists) {
        socket.emit("error", {
          message: "Message doesnot exists or access denied",
        });
        return;
      }

      // delete the message
      const deletedMessage = await prisma.chatMessage.delete({
        where: { id: messageId },
      });

      // notify all users in the thread of a deleted message
      this.io.of(`/chat`).to(`thread_${threadId}`).emit("message_deleted", {
        success: true,
        data: { messageId, threadId },
      });

      logger.debug(`Message ${messageId} was deleted from thread ${threadId}`);
    } catch (error) {
      logger.error("Error deleting message:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  }

  private async handleTypingStart(
    socket: AuthenticatedSocket,
    data: { threadId: number }
  ) {
    socket.to(`thread_${threadId}`).emit("user_typing", {
      userId: socket.userId,
      userName: socket.user?.firstName,
      threadId: data.threadId,
    });
  }

  private async handleTypingStop(
    socket: AuthenticatedSocket,
    data: { threadId: number }
  ) {
    socket.to(`thread_${data.threadId}`).emit("user_stopped_typing", {
      userId: socket.userId,
      userName: socket.user?.firstName,
      threadId: data.threadId,
    });
  }

  private async handleMarkMessageRead(
    socket: AuthenticatedSocket,
    data: { messageId: number }
  ) {
    try {
      const { messageId } = data;

      // Check if message exists and user has access to it
      const message = await prisma.chatMessage.findFirst({
        where: { id: messageId },
        include: {
          thread: {
            include: {
              users: {
                where: { id: socket.userId },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      if (message.thread.users.length === 0) {
        socket.emit("error", {
          message: "You do not have access to this message",
        });
        return;
      }

      // Mark message as read (upsert to avoid duplicates)
      const messageRead = await prisma.messageRead.upsert({
        where: {
          messageId_userId: {
            messageId: messageId,
            userId: socket.userId!,
          },
        },
        update: {
          readAt: new Date(),
        },
        create: {
          messageId: messageId,
          userId: socket.userId!,
          readAt: new Date(),
        },
      });

      // Emit confirmation to the user
      socket.emit("message_read", {
        success: true,
        data: { messageId, readAt: messageRead.readAt },
      });

      logger.debug(
        `User ${socket.user?.firstName} marked message ${messageId} as read`
      );
    } catch (error) {
      logger.error("Error marking message as read:", error);
      socket.emit("error", { message: "Failed to mark message as read" });
    }
  }

  private async handleMarkThreadRead(
    socket: AuthenticatedSocket,
    data: { threadId: number }
  ) {
    try {
      const { threadId } = data;

      // Check if user has access to this thread
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, users: { some: { id: socket.userId } } },
      });

      if (!thread) {
        socket.emit("error", { message: "Thread not found or access denied" });
        return;
      }

      // Get all unread messages in this thread for this user
      const unreadMessages = await prisma.chatMessage.findMany({
        where: {
          threadId: threadId,
          senderId: { not: socket.userId }, // Messages not sent by current user
          readBy: {
            none: {
              userId: socket.userId!,
            },
          },
        },
        select: { id: true },
      });

      if (unreadMessages.length === 0) {
        socket.emit("thread_read", {
          success: true,
          data: { threadId, markedCount: 0 },
        });
        return;
      }

      // Mark all unread messages as read
      const messageReads = await Promise.all(
        unreadMessages.map((message) =>
          prisma.messageRead.upsert({
            where: {
              messageId_userId: {
                messageId: message.id,
                userId: socket.userId!,
              },
            },
            update: {
              readAt: new Date(),
            },
            create: {
              messageId: message.id,
              userId: socket.userId!,
              readAt: new Date(),
            },
          })
        )
      );

      // Emit confirmation to the user
      socket.emit("thread_read", {
        success: true,
        data: { threadId, markedCount: messageReads.length },
      });

      logger.debug(
        `User ${socket.user?.firstName} marked thread ${threadId} as read (${messageReads.length} messages)`
      );
    } catch (error) {
      logger.error("Error marking thread as read:", error);
      socket.emit("error", { message: "Failed to mark thread as read" });
    }
  }

  private async notifyThreadParticipants(
    threadId: number,
    message: any,
    senderId: number
  ) {
    try {
      // get all the thread participants but not the sender
      const thread = await prisma.chatThread.findUnique({
        where: { id: threadId },
        include: {
          users: { where: { id: { not: senderId } }, select: { id: true } },
        },
      });
      if (!thread) return;

      // send notification to each and every participant of the thread
      thread.users.forEach((user) => {
        this.io
          .of(`/chat`)
          .to(`user_${user.id}`)
          .emit("new_message_notification", {
            threadId,
            message: {
              id: message?.id,
              content: message?.content,
              sender: message?.sender,
              createdAt: message?.createdAt,
            },
          });
      });
    } catch (error) {
      logger.error("Error notifying thread participants:", error);
    }
  }

  // Public method to emit messages from HTTP controllers
  public emitToThread(threadId: number, event: string, data: any) {
    this.io.of("/chat").to(`thread_${threadId}`).emit(event, data);
  }

  // Public method to emit to specific user
  public emitToUser(userId: number, event: string, data: any) {
    this.io.of("/chat").to(`user_${userId}`).emit(event, data);
  }
}
