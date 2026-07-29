import { logger, initializeLogCleanupJob } from "../utils/logger";
import { initializeSubscriptionCronJobs } from "../services/subscription.service";
import { initializeRideCronJobs } from '../services/ride.service';
import { initializeUserCronJobs } from '../controllers/admin.controller';
import { initializeRideRequestCronJobs } from "../services/rideRequest.service";
import { initializeRentalCronJobs } from "../services/rental.service";
import { initializeChauffeurCronJobs } from "../services/chauffeur.service";
import { initializeDriverPresenceCronJobs } from "../services/driverPresence.service";

export const initializeCronJobs = () => {
  try {
    logger.debug("Starting cron jobs initialization...");

    const subscriptionCron = initializeSubscriptionCronJobs();
    initializeRideCronJobs();
    initializeUserCronJobs();
    const logCleanupCron = initializeLogCleanupJob();
    initializeRideRequestCronJobs();
    initializeRentalCronJobs();
    initializeChauffeurCronJobs();
    initializeDriverPresenceCronJobs();

    logger.debug("All cron jobs initialized successfully");

    return {
      subscriptionCron,
      logCleanupCron,
    };
  } catch (error) {
    logger.error("Error initializing cron jobs:", error);
    throw error;
  }
};
