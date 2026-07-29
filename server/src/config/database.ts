import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
  ],
});

// log the queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$on(
    "query",
    (e: { query: string; params: string; duration: number }) => {
      logger.debug("Query: " + e.query);
      logger.debug("Params: " + e.params);
      logger.debug("Duration: " + e.duration + "ms");
    }
  );
}

prisma.$on("error", (e: { message: string; target: string }) => {
  logger.error("Database error:", e);
});

export { prisma };
