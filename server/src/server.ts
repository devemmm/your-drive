import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { routes } from "./routes";
import express, { Express, Request, Response } from "express";
import swaggerRoutes from "./routes/swagger.routes";
import { errorResponse } from "./utils/responseHandlers";
import { CustomError } from "./types/customError";
import { logger, LogLevel } from "./utils/logger";
import { languagePreference } from "./middlewares/languagePreference";
import { prisma } from "./config/database";
import { initializeCronJobs } from "./config/cron";
import webhookRoutes from "./routes/webhook.routes";
import { Server } from "socket.io";
import http from "http";
import NotificationsGateway from "./gateways/notifications.gateway";
import { ChatGateway } from "./gateways/chat.gateway";
import { setChatGateway } from "./controllers/chat.controller";
import * as middleware from 'i18next-http-middleware';
import i18n from "./translations";

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = Number(process.env.PORT) || 3003;
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Initialize NotificationsGateway with the Socket.IO server instance
new NotificationsGateway(io);
const chatGateway = new ChatGateway(io);

// set chat gateway to be used in controllers
setChatGateway(chatGateway);

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: "*",
    // This will be set in production
    // origin: [
    //   process.env.FRONTEND_URL,
    //   "http://localhost:3000", // web
    //   "exp://127.0.0.1:19000", // Expo Go (React Native)
    //   "yourapp://callback"
    //   // add more as needed
    // ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Webhooks routes MUST be registered BEFORE express.json() because Stripe
// signature verification requires the raw request body buffer.
app.use("/api/v1/webhooks", webhookRoutes);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Documentation
app.use("/api-docs", swaggerRoutes);

initializeCronJobs();

// Routes
app.use(middleware.handle(i18n));
app.use(languagePreference);
app.use("/api/v1", routes);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK" });
});

io.on("connection", (socket) => {
  logger.debug(`🚀 Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    logger.debug(`🚫 Client disconnected: ${socket.id}`);
  });
});

// 404 handler
app.use((req, res, next) => {
  const err: CustomError = new Error("Route not found");
  err.status = 404;
  const notFoundHandlerLog = {
    level: LogLevel.WARN,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    action: "404 Not Found",
    meta: {
      method: req.method,
      url: req.originalUrl,
    },
  };
  logger.debug(notFoundHandlerLog);
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
  return;
});

// global error handler
app.use(errorResponse);

prisma.$connect().then(() => {
  logger.debug("⚡️ Connected to the database");
  server.listen(PORT, () => {
    logger.debug(`⚡️[server]: Server is running at http://localhost:${PORT}`);
    logger.debug(
      `📚 API Documentation available at http://localhost:${PORT}/api-docs`
    );
  });
});
