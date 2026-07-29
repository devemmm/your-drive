import { SubscriptionDuration } from "@prisma/client";
import moment from "moment";

export const generateVerificationCode = (exp: number) => {
  const verificationCode = Math.floor(Math.random() * 9000) + 1000 + "";
  const verificationCodeExpiresAt = new Date(Date.now() + exp);

  return {
    verificationCode,
    verificationCodeExpiresAt,
  };
};

// Helper function to calculate end date based on subscription duration
export function calculateEndDate(duration: SubscriptionDuration): Date {
  const endDate = moment();
  switch (duration) {
    case SubscriptionDuration.MONTHLY:
      return endDate.add(1, 'month').endOf("day").toDate();
    case SubscriptionDuration.QUARTERLY:
      return endDate.add(3, 'month').endOf("day").toDate();
    case SubscriptionDuration.YEARLY:
      return endDate.add(1, 'year').endOf("day").toDate();
  }
}

export const formatDateToDateHourTime = (d: string | Date) =>
  new Date(d).toLocaleString("en-CA", {
    timeZone: "UTC",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
