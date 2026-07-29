import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { Status, UserRole } from "@prisma/client";

class NotificationsGateway {
  private io: Server;

  constructor(server: Server) {
    this.io = server;
    this.io.on("connection", async (socket: Socket) => {
      try {
        // socket.join("public");
        // Extract and verify JWT
        const token = socket.handshake.auth?.token;
        if (!token) {
          console.log("No token provided, disconnecting...");
          return socket.disconnect();
        }
        const SECRET_KEY = process.env.SECRET_KEY;

        if (!SECRET_KEY) throw new Error("No SECRET_KEY provided");

        const decoded = jwt.verify(token, SECRET_KEY) as {
          id: number;
          email: string;
        };

        const existUser = await prisma.user.findUnique({
          where: { id: decoded.id },
          include: {
            profileImage: true,
          },
        });
        if (
          !existUser ||
          existUser.status !== Status.ACTIVE ||
          !existUser.isEmailVerified
        ) {
          return socket.disconnect();
        }

        // User is authenticated, join their notification room
        socket.join(`user-${decoded.id}`);
        // if (existUser.role === UserRole.ADMIN) {
        //   socket.join("admins");
        // }

        socket.on("disconnect", () => {
          console.log(`User ${decoded.id} disconnected.`);
        });
      } catch (error) {
        console.error(`Socket authentication error: ${error}`);
        socket.disconnect();
      }
    });
  }
}

export default NotificationsGateway;
