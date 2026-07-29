import { Request, Response, NextFunction } from "express";
import appleSignin from "apple-signin-auth";
import { prisma } from "../config/database";
import { generateToken } from "../utils/generateToken";
import { generateReferralCode } from "../utils/generateReferralCode";
import { catchAsync } from "../utils/CatchAsync";

export const appleAuthController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { identityToken, fullName } = req.body;
    if (!identityToken) {
      return res
        .status(400)
        .json({ success: false, message: "Identity token is required" });
    }

    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    const { sub: appleId, email } = payload;

    let user = await prisma.user.findFirst({
      where: { OR: [{ appleId }, ...(email ? [{ email }] : [])] },
    });

    if (!user) {
      const nameParts = fullName?.split(" ") || [];
      user = await prisma.user.create({
        data: {
          appleId,
          email: email || `${appleId}@privaterelay.appleid.com`,
          firstName: nameParts[0] || "User",
          lastName: nameParts.slice(1).join(" ") || "",
          isVerified: true,
          isEmailVerified: !!email,
          password: "",
          referralCode: await generateReferralCode(),
        },
      });
    } else if (!user.appleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { appleId },
      });
    }

    const token = generateToken(user);
    return res.status(200).json({ success: true, token, user });
  }
);
