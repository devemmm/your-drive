import { Twilio } from "twilio";
import { SNSClient } from "@aws-sdk/client-sns";
import { PindoSMS } from 'pindo-sms';
import { logger } from "../utils/logger";


const pindoToken = String(process.env.PINDO_ACCESS_TOKEN);

export const pindoSMS = new PindoSMS(pindoToken);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export let twilioClient: Twilio | null = null;

if (accountSid && authToken && accountSid.startsWith("AC")) {
  twilioClient = new Twilio(accountSid, authToken);
} else {
  logger.warn("Twilio is not configured: missing or invalid TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN.");
}

const awsRegion = process.env.AWS_REGION;
const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

export let snsClient: SNSClient | null = null;

if (awsRegion && awsAccessKey && awsSecretKey) {
  snsClient = new SNSClient({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKey,
      secretAccessKey: awsSecretKey,
    },
  });
} else {
  logger.warn("SNS is not configured: missing AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.");
}

export default twilioClient as Twilio;
