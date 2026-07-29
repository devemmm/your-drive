import { PublishCommand, MessageAttributeValue } from "@aws-sdk/client-sns";
import { twilioClient, snsClient } from "../config/sms";
import { logger } from "../utils/logger";

export interface Recipient {
  phonenumber: string;
  name: string;
}

export class SmsService {
  static sendSMS = async (phoneNumber: string, message: string) => {
    const explicitProvider = process.env.SMS_PROVIDER;

    // Legacy behavior: skip real sends in development unless a provider is
    // explicitly opted into via SMS_PROVIDER.
    if (process.env.NODE_ENV == "development" && !explicitProvider) return true;

    const provider = (explicitProvider || "sns").toLowerCase();

    switch (provider) {
      case "sns":
        return SmsService.sendViaSns(phoneNumber, message);
      case "twilio":
        return SmsService.sendViaTwilio(phoneNumber, message);
      default:
        logger.warn(`SMS not sent: unknown SMS_PROVIDER "${provider}".`);
        return false;
    }
  };

  private static sendViaSns = async (phoneNumber: string, message: string) => {
    if (!snsClient) {
      logger.warn("SMS not sent: SNS client is not configured.");
      return false;
    }
    try {
      const attributes: Record<string, MessageAttributeValue> = {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
      };
      if (process.env.SMS_SENDER_ID) {
        attributes["AWS.SNS.SMS.SenderID"] = {
          DataType: "String",
          StringValue: process.env.SMS_SENDER_ID,
        };
      }
      await snsClient.send(
        new PublishCommand({
          PhoneNumber: phoneNumber,
          Message: message,
          MessageAttributes: attributes,
        })
      );

      logger.info(`SMS sent to ${phoneNumber} via SNS`);
      return true;
    } catch (error) {
      logger.error("Error sending SMS via SNS:", error);
      throw error;
    }
  };

  private static sendViaTwilio = async (phoneNumber: string, message: string) => {
    if (!twilioClient) {
      logger.warn("SMS not sent: Twilio client is not configured.");
      return false;
    }
    try {
      await twilioClient.messages.create({
        body: message,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
      });

      logger.info(`SMS sent to ${phoneNumber} via Twilio`);
      return true;
    } catch (error) {
      logger.error("Error sending SMS via Twilio:", error);
      throw error;
    }
  };
}
