import { prisma } from "../config/database";
import { CronJob } from "cron";
import { logger } from "../utils/logger";

export class SubscriptionService {
  // Check if a user has an active subscription that removes booking fees

  public static async hasActiveSubscription(userId: number) {
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        userId,
        isActive: true,
        endDate: { gte: new Date() },
      },
      include: {
        plan: true,
      },
    });

    return subscription;
  }
}

// Function to check and deactivate expired subscriptions
export const checkExpiredSubscriptions = async () => {
  logger.debug("Starting subscription expiration check...");
  const now = new Date();

  try {
    const result = await prisma.userSubscription.updateMany({
      where: {
        isActive: true,
        endDate: {
          lt: now,
        },
      },
      data: {
        isActive: false,
      },
    });

    logger.debug(
      `Subscription check completed. Updated ${result.count} subscriptions.`
    );
  } catch (error) {
    logger.error("Error in checkExpiredSubscriptions:", error);
    // throw error;
  }
};

// Initialize cron job to check expired subscriptions daily at midnight
// Function to clean up notifications older than 7 days
export const cleanUpOldNotifications = async () => {
  logger.debug("Cleaning up notifications older than 7 days...");
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    logger.debug(`Notification cleanup completed. Deleted ${result.count} notifications.`);
  } catch (error) {
    logger.error("Error cleaning up notifications:", error);
    // throw error;
  }
};

export const initializeSubscriptionCronJobs = () => {
  logger.debug("Initializing cron jobs...");

  const subscriptionCronJob = new CronJob(
    "0 0 * * *", // Run at midnight every day
    async () => {
      logger.debug("Running subscription expiration check...");
      try {
        await checkExpiredSubscriptions();

        // Clean up notifications older than 7 days
        await cleanUpOldNotifications();
        logger.debug("Cron job check completed successfully");
      } catch (error) {
        logger.error("Error in cron job:", error);
      }
    },
    null, // onComplete
    false, // start
    "UTC" // timezone
  );

  // Start the cron job
  subscriptionCronJob.start();
  logger.debug("Cron jobs initialized and started");

  // For testing purposes, let's also run it immediately
  subscriptionCronJob.fireOnTick();

  return subscriptionCronJob;
};
