import { handleMessaging } from "../config/firebase";
import { logger } from "../utils/logger";
import { prisma } from "../config/database";
import { io } from "../server";
import { Language, NotificationPreference, Prisma } from "@prisma/client";
import { SmsService } from "./sms.service";

export class NotificationServices {
  static async sendFirebaseMessage(
    fcm_token: string,
    title: string,
    body: string,
    data: any
  ) {
    try {
      await handleMessaging?.send({
        token: fcm_token,
        notification: {
          title,
          body,
        },
        data: {
          payload: JSON.stringify(data),
        },
      });
    } catch (error) {
      logger.error(error);
    }
  }

  static async sendFirebaseMulticastMessage(
    fcm_tokens: string[],
    title: string,
    body: string,
    data: any
  ) {
    try {
      const message = {
        tokens: fcm_tokens, // array of fcm_tokens
        notification: {
          title,
          body,
        },
        data: {
          payload: JSON.stringify(data),
        },
      };
      const response = await handleMessaging?.sendEachForMulticast(message);
      logger.info(
        "Batch sent:",
        response?.successCount,
        "success,",
        response?.failureCount,
        "failed"
      );
    } catch (error) {
      logger.error(error);
    }
  }

  static async notifyUsers(params: {
    userIds: number[];
    titleEn: string;
    titleFr: string;
    messageEn: string;
    messageFr: string;
    rideRequestId?: number;
    rideId?: number;
    rentalId?: number;
    chauffeurServiceId?: number;
  }) {
    const { userIds, titleEn, titleFr, messageEn, messageFr, rideRequestId, rideId, rentalId, chauffeurServiceId } = params;

    try {
      const notifsCreateData: Prisma.NotificationCreateManyInput[] = [];
      const combinedTitle = `${titleEn} | ${titleFr}`;
      const combinedMessage = `${messageEn} | ${messageFr}`;

      for (const userId of userIds) {
        notifsCreateData.push({
          title: combinedTitle,
          message: combinedMessage,
          userId,
          rideRequestId,
          rideId,
          ...(rentalId && { rentalId }),
          ...(chauffeurServiceId && { chauffeurServiceId }),
        });
      }

      if (notifsCreateData.length) {
        const notifs = await prisma.notification.createManyAndReturn({
          data: notifsCreateData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phoneNumber: true,
                language: true,
                notificationPref: true,
                fcm_token: true,
              },
            },
          },
        });
        await Promise.allSettled(
          notifs.map(
            async (ntf) => {
              switch (ntf.user.notificationPref) {
                case NotificationPreference.EMAIL: {
                  
                  break;
                }
                case NotificationPreference.SMS: {
                  if (ntf.user.phoneNumber) {
                    const text =
                      ntf.user.language === Language.FR
                        ? `${titleFr}: ${messageFr}`
                        : `${titleEn}: ${messageEn}`;
                    await SmsService.sendSMS(ntf.user.phoneNumber, text);
                  }
                  break;
                }
                default: {
                  const { user, ...notif } = ntf;
                  io.to(`user-${ntf.user.id}`).emit("notification", notif);
                  if (user.fcm_token) {
                    await NotificationServices.sendFirebaseMessage(
                      user.fcm_token,
                      combinedTitle,
                      combinedMessage,
                      notif
                    );
                  }
                  break;
                }
              }
            }
          )
        );
      }

      return true;
    } catch (error) {
      logger.error(error);
      return false;
    }
  }
}

export const notifyUsers =
  NotificationServices.notifyUsers.bind(NotificationServices);
