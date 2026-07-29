import {
  Coupon,
  Language,
  RedeemedCoupon,
} from "@prisma/client";
import { prisma } from "../config/database";
import { NotificationServices } from "./notification.service";

export class CouponService {
  static async getUserCouponBalance(
    userId: number
  ): Promise<{ totalCoupons: number; coupons: Coupon[] }> {
    const coupons = await prisma.coupon.findMany({
      where: {
        userId,
        redeemed: false,
        expiresAt: { gt: new Date() },
        quantity: { gt: 0 },
      },
      orderBy: { expiresAt: "asc" },
    });

    const totalCoupons = coupons.reduce(
      (sum, coupon) => sum + coupon.quantity,
      0
    );

    return { totalCoupons, coupons };
  }

  static async redeemCoupons(
    requiredCoupons: number,
    availableCoupons: Coupon[],
    reason: string
  ) {
    // Redeem coupons using 2 DB calls max
    let needed = requiredCoupons;
    const fullyUsedIds: number[] = [];
    let partiallyUsed: { id: number; deduct: number } | null = null;

    const redeemedCouponsData: { redeemedQty: number; couponId: number }[] = [];

    for (const coupon of availableCoupons) {
      if (needed <= 0) break;

      if (coupon.quantity <= needed) {
        fullyUsedIds.push(coupon.id);
        needed -= coupon.quantity;
        redeemedCouponsData.push({
          redeemedQty: coupon.quantity,
          couponId: coupon.id,
        });
      } else {
        partiallyUsed = {
          id: coupon.id,
          deduct: needed,
        };
        redeemedCouponsData.push({
          redeemedQty: needed,
          couponId: coupon.id,
        });
        needed = 0;
      }
    }

    // One query to zero out fully used coupons
    if (fullyUsedIds.length > 0) {
      await prisma.coupon.updateMany({
        where: { id: { in: fullyUsedIds } },
        data: {
          quantity: 0,
          redeemed: true,
          redeemedAt: new Date(),
          redeemReason: reason,
        },
      });
    }

    // One query to partially update the last used coupon (if any)
    if (partiallyUsed) {
      await prisma.coupon.update({
        where: { id: partiallyUsed.id },
        data: {
          quantity: {
            decrement: partiallyUsed.deduct,
          },
        },
      });
    }

    return redeemedCouponsData;
  }

  static async refundCoupons(redeemedCoupons: RedeemedCoupon[]) {
    const results = await Promise.allSettled(
      redeemedCoupons.map(async (cpn) => {
        const updated = await prisma.coupon.update({
          where: { id: cpn.couponId },
          data: {
            quantity: { increment: cpn.redeemedQty },
            redeemed: false,
            redeemedAt: null,
          },
          include: {
            user: {
              select: {
                id: true,
                language: true,
                fcm_token: true,
              },
            },
          },
        });
        return { ...cpn, user: updated.user };
      })
    );

    const refundedIds: number[] = [];

    // Group by userId and sum refundedQty, also include language
    const refundMap = new Map<
      number,
      { refundedQty: number; language: Language }
    >();
    for (const res of results) {
      if (res.status === "fulfilled") {
        const { userId, redeemedQty, id: redeemedCouponId, user } = res.value;
        refundedIds.push(redeemedCouponId);
        if (refundMap.has(userId)) {
          const entry = refundMap.get(userId)!;
          entry.refundedQty += redeemedQty;
        } else {
          refundMap.set(userId, {
            refundedQty: redeemedQty,
            language: user.language,
          });
        }
      }
    }

    // Cleanup the successfully refunded redeemed coupons
    if (refundedIds.length) {
      await prisma.redeemedCoupon.deleteMany({
        where: { id: { in: refundedIds } },
      });
    }
    const data = Array.from(refundMap.entries()).map(([userId, dt]) => ({
      userId,
      refundedCoupons: dt.refundedQty,
      lang: dt.language,
    }));

    // notify the users about the refunded coupons
    await Promise.allSettled(
      data.map(async (d) => {
        await NotificationServices.notifyUsers({
          userIds: [d.userId],
          titleEn: "Coupons Refunded",
          titleFr: "Coupons remboursés",
          messageEn: `Your ${d.refundedCoupons} coupons have been refunded due to the booking you made using coupons being cancelled/declined.`,
          messageFr: `Vos ${d.refundedCoupons} coupons ont été remboursés en raison de l'annulation/refus de la réservation que vous avez faite en utilisant des coupons.`,
        });
      })
    );
    return data;
  }
}
