import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { logger } from "../utils/logger";

const REGION = process.env.AWS_REGION;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const FROM = process.env.SES_FROM_ADDRESS;

const isConfigured = Boolean(REGION && ACCESS_KEY && SECRET_KEY && FROM);

if (!isConfigured) {
  logger.warn(
    "[email] SES not configured (missing AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / SES_FROM_ADDRESS) — email sending will be silently skipped."
  );
}

const sesClient = isConfigured
  ? new SESv2Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY as string,
        secretAccessKey: SECRET_KEY as string,
      },
    })
  : null;

async function sendViaSES(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  if (!sesClient) return false;
  try {
    await sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: FROM as string,
        Destination: { ToAddresses: [args.to] },
        Content: {
          Simple: {
            Subject: { Data: args.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: args.text, Charset: "UTF-8" },
              Html: { Data: args.html, Charset: "UTF-8" },
            },
          },
        },
      })
    );
    return true;
  } catch (err) {
    logger.warn("[email] SES send failed", {
      err: err instanceof Error ? err.message : String(err),
      to: args.to,
    });
    return false;
  }
}

export const sendPasswordResetEmail = async (
  email: string,
  resetCode: string
): Promise<boolean> => {
  return sendViaSES({
    to: email,
    subject: "Your YourDrive password reset code",
    text: `Your password reset code is ${resetCode}. It expires in 60 minutes. If you didn't request this, ignore this email.`,
    html:
      `<p>Your password reset code is <strong>${resetCode}</strong>.</p>` +
      `<p>It expires in 60 minutes. If you didn't request this, ignore this email.</p>`,
  });
};

const logDisabled = (fn: string) =>
  logger.warn(`[email-disabled] ${fn} called; ignoring.`);

export const sendEmail = async (): Promise<boolean> => {
  logDisabled("sendEmail");
  return false;
};
export const sendVerificationEmail = async (): Promise<boolean> => {
  logDisabled("sendVerificationEmail");
  return false;
};
export const sendWelcomeEmail = async (): Promise<boolean> => {
  logDisabled("sendWelcomeEmail");
  return false;
};
export const sendNotificationEmail = async (): Promise<boolean> => {
  logDisabled("sendNotificationEmail");
  return false;
};
export const sendWebPasswordResetEmail = async (): Promise<boolean> => {
  logDisabled("sendWebPasswordResetEmail");
  return false;
};
export const sendPasswordResetConfirmationEmail = async (): Promise<boolean> => {
  logDisabled("sendPasswordResetConfirmationEmail");
  return false;
};
export const sendInviteEmail = async (): Promise<boolean> => {
  logDisabled("sendInviteEmail");
  return false;
};
export const sendBookingConfirmationEmail = async (): Promise<boolean> => {
  logDisabled("sendBookingConfirmationEmail");
  return false;
};
export const sendPaymentReceiptEmail = async (): Promise<boolean> => {
  logDisabled("sendPaymentReceiptEmail");
  return false;
};
export const sendSuspensionEmail = async (): Promise<boolean> => {
  logDisabled("sendSuspensionEmail");
  return false;
};
export const sendAccountRecoveryEmail = async (): Promise<boolean> => {
  logDisabled("sendAccountRecoveryEmail");
  return false;
};
export const sendD2DRequestEmail = async (): Promise<boolean> => {
  logDisabled("sendD2DRequestEmail");
  return false;
};
export const sendD2DRideStartedEmail = async (): Promise<boolean> => {
  logDisabled("sendD2DRideStartedEmail");
  return false;
};
export const sendD2DCompletionEmailPassenger = async (): Promise<boolean> => {
  logDisabled("sendD2DCompletionEmailPassenger");
  return false;
};
export const sendD2DCompletionEmailDriver = async (): Promise<boolean> => {
  logDisabled("sendD2DCompletionEmailDriver");
  return false;
};
