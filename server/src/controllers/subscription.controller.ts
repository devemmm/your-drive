import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import {
  SubscriptionType,
  SubscriptionDuration,
  PlanCategory,
  UserRole,
  TransactionType,
  PaymentProvider,
  Prisma,
} from "@prisma/client";
import { TransactionService } from "../services/transaction.service";
import { CouponService } from "../services/coupon.service";
import { calculateEndDate } from "../utils/index";
import { logger, LogLevel } from "../utils/logger";
import { getDefaultCurrency } from "../utils/currency";
import { matchedData } from "express-validator";
import moment from "moment";
import { profileSelects } from "../types/index";
import { v4 } from "uuid";

export class SubscriptionController {
  // --------------------------
  // ADMIN: Create a Plan
  // --------------------------
  public static createSubscriptionPlan = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const {
        name,
        description,
        type,
        duration,
        price,
        subscriptionEndDate,
        availableUntil,
        category,
      } = matchedData<{
        name: string;
        description?: string;
        type: SubscriptionType;
        duration?: SubscriptionDuration;
        price: number;
        subscriptionEndDate?: number;
        availableUntil?: number;
        category?: PlanCategory;
      }>(req);

      let finalDuration = duration ?? undefined;
      let finalEndDate = subscriptionEndDate
        ? new Date(subscriptionEndDate)
        : null;

      // If both are set, subscriptionEndDate takes precedence
      if (finalDuration && finalEndDate) {
        finalDuration = undefined;
      }
      if (!finalDuration && !finalEndDate) {
        return next(
          AppError(
            isEN
              ? "Either a duration or a subscription end date must be provided."
              : "Une durée ou une date de fin d'abonnement doit être fournie.",
            400
          )
        );
      }

      if (finalEndDate && new Date() >= finalEndDate) {
        AppError(
          isEN
            ? "Subscription end date must not be in past."
            : "La date de fin de l'abonnement ne doit pas être passée.",
          400
        );
      }

      // Duplicate name check
      const existPlanName = await prisma.subscriptionPlan.findUnique({
        where: { name },
      });
      if (existPlanName)
        return next(
          AppError(
            isEN
              ? "We have a plan with the same name, please provide another name."
              : "Nous avons un plan qui porte le même nom, veuillez en fournir un autre.",
            400
          )
        );

      const plan = await prisma.subscriptionPlan.create({
        data: {
          name,
          description,
          type,
          duration: finalDuration,
          price,
          subscriptionEndDate: finalEndDate,
          availableUntil: availableUntil ? new Date(availableUntil) : undefined,
          category,
        },
      });

      const msg = isEN
        ? "Subscription plan created successfully"
        : "Plan d'abonnement créé avec succès";

      logger.info(msg, {
        level: LogLevel.INFO,
        action: "CreateSubscriptionPlan",
        userId: req.user?.id,
        meta: { planId: plan.id, planDetails: plan },
      });

      return res.status(201).json({
        success: true,
        data: plan,
        message: msg,
      });
    }
  );

  // --------------------------
  // ADMIN: Update a Plan
  // --------------------------
  public static updateSubscriptionPlan = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const {
        id,
        name,
        description,
        type,
        duration,
        price,
        subscriptionEndDate,
        availableUntil,
        category,
        isActive,
      } = matchedData<{
        id: string;
        name?: string;
        description?: string;
        type?: SubscriptionType;
        duration?: SubscriptionDuration;
        price?: number;
        subscriptionEndDate?: number;
        availableUntil?: number | null;
        category?: PlanCategory;
        isActive?: boolean;
      }>(req, { includeOptionals: true });

      logger.debug("checking the value of availableUntil", { availableUntil });
      if (
        name === undefined &&
        description === undefined &&
        type === undefined &&
        duration === undefined &&
        price === undefined &&
        subscriptionEndDate === undefined &&
        availableUntil === undefined &&
        category === undefined &&
        isActive === undefined
      ) {
        return next(
          AppError(
            isEN
              ? "At least one field must be provided to update the subscription plan."
              : "Au moins un champ doit être fourni pour mettre à jour le plan d'abonnement.",
            400
          )
        );
      }

      // Ensure mutual exclusivity between duration and subscriptionEndDate
      let finalDuration = duration ?? undefined;
      let finalEndDate =
        subscriptionEndDate !== undefined
          ? subscriptionEndDate
            ? new Date(subscriptionEndDate)
            : null
          : undefined;

      if (finalDuration !== undefined && finalEndDate !== undefined) {
        // If both provided, subscriptionEndDate takes precedence
        finalDuration = undefined;
      }

      if (finalEndDate && new Date() >= finalEndDate) {
        AppError(
          isEN
            ? "Subscription end date must not be in past."
            : "La date de fin de l'abonnement ne doit pas être passée.",
          400
        );
      }

      const plan = await prisma.subscriptionPlan.update({
        where: { id: parseInt(id) },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(type && { type }),
          ...(price !== undefined && { price }),
          ...(finalDuration !== undefined && {
            duration: finalDuration,
            subscriptionEndDate: null,
          }),
          ...(finalEndDate !== undefined && {
            subscriptionEndDate: finalEndDate,
            duration: null,
          }),
          ...(availableUntil !== undefined && {
            availableUntil:
              availableUntil === null
                ? null
                : availableUntil
                ? new Date(availableUntil)
                : null,
          }),
          ...(category && { category }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      const msg = isEN
        ? "Subscription plan updated successfully"
        : "Plan d'abonnement mis à jour avec succès";

      logger.info(msg, {
        level: LogLevel.INFO,
        action: "UpdateSubscriptionPlan",
        userId: req.user?.id,
        meta: { planId: plan.id, updatedFields: req.body },
      });

      return res.status(200).json({ success: true, data: plan, message: msg });
    }
  );

  // --------------------------
  // GET plans
  // --------------------------
  public static getSubscriptionPlans = catchAsync(
    async (req: Request, res: Response) => {
      const { type, includeExpired } = matchedData<{
        type?: SubscriptionType;
        includeExpired?: boolean;
      }>(req);
      const isAdmin = req.user?.role === UserRole.ADMIN;
      const now = new Date();
      let where: Prisma.SubscriptionPlanWhereInput = {};
      if (!isAdmin || (isAdmin && !includeExpired)) {
        where = {
          isActive: true,
          AND: [
            {
              OR: [
                { subscriptionEndDate: null },
                { subscriptionEndDate: { gte: now } },
              ],
            },
            {
              OR: [{ availableUntil: null }, { availableUntil: { gte: now } }],
            },
          ],
        };
      }

      if (type) where.type = type;

      const plans = await prisma.subscriptionPlan.findMany({
        where,
        ...(isAdmin && {
          include: {
            _count: {
              select: {
                subscriptions: { where: { endDate: { gt: new Date() } } },
              },
            },
          },
        }),
      });

      return res.status(200).json({ success: true, data: plans });
    }
  );

  // --------------------------
  // SUBSCRIBE (initialize) - creates PaymentSession only
  // --------------------------
  public static subscribeToAPlan = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user!;
      const isEN = req.isEnglishPreferred;
      const {
        planId,
        billingAddress,
        useCoupons = false,
      } = matchedData<{
        planId: number;
        billingAddress: {
          street: string;
          city: string;
          postalCode: string;
          province: string;
        };
        useCoupons?: boolean;
      }>(req);

      // Admin cannot subscribe
      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admin cannot subscribe"
              : "L'administrateur ne peut pas s'abonner",
            403
          )
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { billingAddress },
      });

      // Fetch plan and check availability
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });
      if (
        !plan ||
        !plan.isActive ||
        (plan.availableUntil && new Date() > plan.availableUntil)
      ) {
        return next(
          AppError(
            isEN
              ? "Subscription plan not found or inactive"
              : "Plan d'abonnement introuvable ou inactif",
            404
          )
        );
      }

      // Prevent coupon usage for free or promo plans
      if (
        useCoupons &&
        (plan.price === 0 || (plan.subscriptionEndDate && !plan.duration))
      ) {
        return next(
          AppError(
            isEN
              ? "Coupons cannot be applied to this plan."
              : "Les coupons ne peuvent pas être appliqués à ce plan.",
            400
          )
        );
      }

      // Prepare plan snapshot
      const planSnapshot = {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        type: plan.type,
        duration: plan.duration,
        subscriptionEndDate: plan.subscriptionEndDate
          ? plan.subscriptionEndDate.toISOString()
          : undefined,
        availableUntil: plan.availableUntil
          ? plan.availableUntil.toISOString()
          : undefined,
        category: plan.category,
        price: plan.price,
      };

      // Coupon flow (unchanged)
      if (useCoupons) {
        const target =
          plan.type === "BOTH"
            ? "BOTH_SUBSCRIPTION"
            : plan.type === "DRIVER"
            ? "DRIVER_SUBSCRIPTION"
            : "PASSENGER_SUBSCRIPTION";

        const rule = await prisma.couponRedemptionRule.findUnique({
          where: { target },
        });

        const requiredCoupons =
          rule?.requiredCoupons ?? (plan.type === "BOTH" ? 40 : 20);
        const { coupons, totalCoupons } =
          await CouponService.getUserCouponBalance(user.id);
        const monthsToSubscribe =
          plan.duration === "MONTHLY"
            ? 1
            : plan.duration === "QUARTERLY"
            ? 3
            : 12;
        const finalRequiredCoupons = requiredCoupons * monthsToSubscribe;

        if (totalCoupons < finalRequiredCoupons) {
          return next(
            AppError(
              isEN
                ? `Insufficient coupons. You need ${finalRequiredCoupons} but only have ${totalCoupons}`
                : `Coupons insuffisants. Vous avez besoin de ${finalRequiredCoupons}, mais vous n'en avez que ${totalCoupons}`,
              400
            )
          );
        }

        await CouponService.redeemCoupons(
          finalRequiredCoupons,
          coupons,
          "Subscribed to a plan"
        );

        // check if user already has active subscription for same plan
        const existingSubscription = await prisma.userSubscription.findFirst({
          where: {
            userId: user.id,
            isActive: true,
            endDate: { gt: new Date() },
            planId: plan.id,
          },
        });

        if (existingSubscription) {
          // Extend existing subscription by duration
          const newEndDate = new Date(existingSubscription.endDate);
          newEndDate.setMonth(newEndDate.getMonth() + monthsToSubscribe);

          const subscription = await prisma.userSubscription.update({
            where: { id: existingSubscription.id },
            data: {
              endDate: newEndDate,
            },
            include: { plan: true },
          });

          const msg = isEN
            ? `Successfully extended your subscription by ${monthsToSubscribe} months using coupons.`
            : `Vous avez prolongé avec succès votre abonnement à ${monthsToSubscribe} mois à l'aide de coupons.`;

          logger.info(msg, {
            level: LogLevel.INFO,
            action: "ActivateSubscriptionWithCoupons",
            userId: user.id,
            meta: { planId: plan.id, subscriptionId: subscription.id },
          });

          return res.status(200).json({
            success: true,
            message: msg,
            subscription,
            remainingCoupons: totalCoupons - finalRequiredCoupons,
          });
        }

        // create new subscription using coupon
        const endDate = plan.subscriptionEndDate
          ? new Date(plan.subscriptionEndDate)
          : plan.duration
          ? calculateEndDate(plan.duration)
          : new Date();

        const subscription = await prisma.userSubscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            startDate: new Date(),
            endDate,
            isActive: true,
            planData: planSnapshot,
          },
          include: { plan: true },
        });

        const msg = isEN
          ? "Subscription activated successfully using coupons"
          : "Abonnement activé avec succès en utilisant des coupons";

        logger.info(msg, {
          level: LogLevel.INFO,
          action: "ActivateSubscriptionWithCoupons",
          userId: user.id,
          meta: { planId: plan.id, subscriptionId: subscription.id },
        });

        return res.status(200).json({
          success: true,
          message: msg,
          subscription,
          remainingCoupons: totalCoupons - finalRequiredCoupons,
        });
      }

      // If plan is price === 0 -> create subscription directly (no transaction)
      if (plan.price === 0 || plan.category === "PROMO") {
        const existSub = await prisma.userSubscription.findFirst({
          where: { userId: user.id, isActive: true, planId: plan.id },
        });
        if (existSub) {
          return next(
            AppError(
              isEN
                ? "You already have an active subscription."
                : "Vous avez déjà un abonnement actif.",
              400
            )
          );
        }
        const endDate = plan.subscriptionEndDate
          ? new Date(plan.subscriptionEndDate)
          : plan.duration
          ? calculateEndDate(plan.duration)
          : new Date();

        const subscription = await prisma.userSubscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            startDate: new Date(),
            endDate,
            isActive: true,
            planData: planSnapshot,
          },
          include: { plan: true },
        });

        const msg = isEN
          ? "Subscription activated successfully"
          : "Abonnement activé avec succès";

        logger.info(
          "Subscription activated successfully | Abonnement activé avec succès",
          {
            level: LogLevel.INFO,
            action: "ActivatePromoSubscription",
            userId: user.id,
            meta: { planId: plan.id, subscriptionId: subscription.id },
          }
        );

        return res
          .status(201)
          .json({ success: true, message: msg, subscription });
      }

      // ----------------
      // Paid plan flow (NEW): create temporary PaymentSession only
      // ----------------

      // Tax calculation removed; plan.price is the final amount.

      // Create or get stripe customer (no intent created here)
      const stripeCustomerId =
        await TransactionService.getOrCreateStripeCustomer(user);

      // Create PaymentSession record (temporary)
      const session = await prisma.paymentSession.create({
        data: {
          id: `cr_ps_${v4()}`,
          userId: user.id,
          amount: plan.price,
          platformAmount: plan.price,
          totalAmount: plan.price, // no tax addition
          currency: getDefaultCurrency(),
          // provinceCode and taxSnapshot dropped
          transactionType: TransactionType.SUBSCRIPTION,
          planSnapshot,
          billingAddress,
          stripeCustomerId,
          paymentProvider: PaymentProvider.STRIPE,
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          sessionId: session.id,
          baseAmount: Number(session.amount),
          currency: session.currency || getDefaultCurrency(),
          subscriptionFee: plan.price,
          amount: Number(session.totalAmount),
        },
      });
    }
  );

  public static getCurrentSubscription = catchAsync(
    async (req: Request, res: Response) => {
      const user = req.user!;
      const where: Prisma.UserSubscriptionWhereInput = {
        userId: user.id,
        isActive: true,
      };

      if (user.role !== UserRole.ADMIN) {
        where.plan = {
          type: {
            in: [
              SubscriptionType.BOTH,
              SubscriptionType.PASSENGER,
              SubscriptionType.DRIVER,
            ],
          },
        };
      }

      const subscriptions = await prisma.userSubscription.findMany({
        where,
        include: { plan: true },
      });

      return res.status(200).json({
        success: true,
        data: subscriptions,
      });
    }
  );

  public static getSubscriptionHistory = catchAsync(
    async (req: Request, res: Response) => {
      const user = req.user!;
      const {
        userId,
        page = 1,
        pageSize = 10,
      } = matchedData<{
        userId?: number;
        page?: number;
        pageSize?: number;
      }>(req, { locations: ["query"] });

      const where: Prisma.UserSubscriptionWhereInput = {};

      if (user.role === UserRole.ADMIN) {
        if (userId) {
          where.userId = userId;
        }
      } else {
        where.userId = user.id;
        where.plan = {
          type: {
            in: [
              SubscriptionType.BOTH,
              SubscriptionType.DRIVER,
              SubscriptionType.PASSENGER,
            ],
          },
        };
      }

      const skip = (page - 1) * pageSize;

      const [subscriptions, total] = await prisma.$transaction([
        prisma.userSubscription.findMany({
          where,
          skip,
          take: pageSize,
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.userSubscription.count({ where }),
      ]);
      return res.status(200).json({
        success: true,
        data: subscriptions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }
  );

  /**
   * ADMIN: View user subscriptions with pagination and filters
   * Query params: userId, planId, isActive, page, pageSize, startDate, endDate
   */
  public static adminListUserSubscriptions = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        userId,
        planId,
        isActive,
        page = 1,
        pageSize = 10,
        startDate,
        endDate,
      } = matchedData<{
        userId?: number;
        planId?: number;
        isActive?: boolean;
        page?: number;
        pageSize?: number;
        startDate?: string;
        endDate?: string;
      }>(req, { locations: ["query"] });

      if (req.user?.role !== UserRole.ADMIN) {
        return next(
          AppError(
            req.isEnglishPreferred ? "Unauthorized" : "Non autorisé",
            403
          )
        );
      }

      const where: Prisma.UserSubscriptionWhereInput = {};

      if (userId) where.userId = userId;
      if (planId) where.planId = planId;
      if (isActive !== undefined) where.isActive = isActive;
      if (startDate) {
        const start = moment(startDate).startOf("day").toDate();
        const end = moment(startDate).endOf("day").toDate();
        where.startDate = { gte: start, lte: end };
      }
      if (endDate) {
        const start = moment(endDate).startOf("day").toDate();
        const end = moment(endDate).endOf("day").toDate();
        where.endDate = { gte: start, lte: end };
      }
      const skip = (page - 1) * pageSize;

      const [subscriptions, total] = await prisma.$transaction([
        prisma.userSubscription.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            plan: true,
            user: {
              select: profileSelects,
            },
          },
          orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
        }),
        prisma.userSubscription.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: subscriptions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }
  );
}
