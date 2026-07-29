import crypto from "crypto";
import { prisma } from "../config/database";

export const generateReferralCode = async () => {
  while (true) {
    const code = crypto.randomBytes(4).toString("hex");

    const existingUser = await prisma.user.findUnique({
      where: { referralCode: code },
    });

    if (!existingUser) {
      return code;
    }
  }
};

function randomAlphanumeric(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // 36 chars
  const randomBytes = crypto.randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i++) {
    // Map each byte to one of the chars
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

export const generateRideBookingAttendenceCode = async () => {
  while (true) {
    const length = Math.floor(Math.random() * (8 - 3 + 1)) + 3; // 3–8 chars
    const code = randomAlphanumeric(length);

    const existingBookingSeat = await prisma.bookingSeat.findUnique({
      where: { attendanceCode: code },
    });

    if (!existingBookingSeat) {
      console.log("AttendanceCode", code);
      return code;
    }
  }
};
