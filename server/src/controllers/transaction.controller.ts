import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { prisma } from "../config/database";
import {
  TransactionStatus,
  TransactionType,
  PaymentProvider,
  Prisma,
  UserRole,
  Language,
  PaymentSessionStatus,
} from "@prisma/client";
import { DbUser, profileSelects } from "../types";
import { logger, LogLevel } from "../utils/logger";
import { TransactionService } from "../services/transaction.service";
import { stripe } from "../config/stripe";
import { getDefaultCurrency } from "../utils/currency";
import { CouponService } from "../services/coupon.service";
import { BookingService } from "../services/booking.service";

export class TransactionController {
  // Get all transactions with pagination and filtering
  static getAllTransactions = catchAsync(
    async (req: Request, res: Response) => {
      const {
        page = 1,
        pageSize = 10,
        status,
        type,
        paymentProvider,
        minAmount,
        maxAmount,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        status?: TransactionStatus;
        type?: TransactionType | "all";
        paymentProvider?: PaymentProvider | "all";
        minAmount?: number;
        maxAmount?: number;
        lang?: Language;
      }>(req);

      const user = req.user! as DbUser;
      const isAdmin = user.role === UserRole.ADMIN;

      const skip = (page - 1) * pageSize;

      // Build Prisma where filter
      const amount: Record<string, number> = {};
      if (minAmount !== undefined) amount.gte = minAmount;
      if (maxAmount !== undefined) amount.lte = maxAmount;

      const where: Prisma.TransactionWhereInput = {};
      if (Object.keys(amount).length) where.amount = amount;
      if (!isAdmin) where.OR = [{userId: user.id}, {ride: {driverId: user.id}, driverAmount: { gt: 0}}];
      if (status !== undefined) where.status = status;
      if (type && type !== "all") where.type = type;
      if (paymentProvider && paymentProvider !== "all")
        where.paymentProvider = paymentProvider;

      const [transactions, total] = await prisma.$transaction([
        prisma.transaction.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: profileSelects },
            ride: {
              include: {
                departureLocation: true,
                destinationLocation: true,
              },
            },
            plan: true,
            booking: true,
          },
        }),
        prisma.transaction.count({ where }),
      ]);
      res.json({
        success: true,
        data: transactions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }
  );

  // Get transaction by ID
  static getTransactionById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { transactionId } = matchedData<{ transactionId: number }>(req);
      const user = req.user! as DbUser;
      const isAdmin = user.role === UserRole.ADMIN;

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          user: { select: profileSelects },
          ride: {
            include: {
              departureLocation: true,
              destinationLocation: true,
            },
          },
          plan: true,
          booking: true,
        },
      });

      if (!transaction || (!isAdmin && transaction.userId !== user.id)) {
        return next(
          AppError(
            req.isEnglishPreferred
              ? "Transaction not found"
              : "Transaction non trouvée",
            404
          )
        );
      }

      res.json({
        success: true,
        data: transaction,
      });
    }
  );

  public static confirmPaymentForSession = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      const {
        sessionId,
        paymentMethodId,
        saveCard = false,
      } = matchedData<{
        sessionId: string;
        paymentMethodId: string;
        saveCard?: boolean;
      }>(req);

      // --- 1. Fetch the PaymentSession ---
      const session = await prisma.paymentSession.findUnique({
        where: { id: sessionId },
        include: {
          ride: {
            include: {
              departureLocation: true,
              destinationLocation: true,
              driver: {
                select: {
                  id: true,
                  email: true,
                  phoneNumber: true,
                  language: true,
                  notificationPref: true,
                  fcm_token: true,
                  firstName: true,
                },
              },
            },
          },
          d2dBooking: true,
          user: {
            select: {...profileSelects, fcm_token: true },
          },
        },
      });

      if (!session)
        return next(
          AppError(
            isEN
              ? "Payment session not found."
              : "Session de paiement introuvable.",
            404
          )
        );

      if (session.userId !== user.id)
        return next(AppError(isEN ? "Unauthorized" : "Non autorisé", 403));

      if (session.status !== PaymentSessionStatus.PENDING) {
        return next(
          AppError(
            isEN
              ? "This payment session has already been processed."
              : "Cette session a déjà été traitée.",
            400
          )
        );
      }

      // --- 2. Prepare customer & optional card saving ---
      let stripeCustomerId =
        session.stripeCustomerId ||
        (await TransactionService.getOrCreateStripeCustomer(user));
      if (!stripeCustomerId) {
        return next(AppError(isEN ? "Payment system not configured" : "Système de paiement non configuré", 503));
      }

      if (saveCard) {
        try {
          await stripe.paymentMethods.attach(paymentMethodId, {
            customer: stripeCustomerId,
          });
        } catch (err) {
          logger.debug("Attach card failed (ignored):", err);
        }
      }

      // --- 3. Create PaymentIntent (manual capture) ---
      const amountInCents = Math.round(Number(session.totalAmount) * 100);

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: (session.currency || getDefaultCurrency()).toLowerCase(),
          payment_method: paymentMethodId,
          customer: stripeCustomerId,
          confirm: true,
          capture_method: "manual", // HOLD FUNDS, DO NOT CHARGE
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: "never",
          },
          metadata: {
            userId: String(user.id),
            paymentSessionId: session.id,
            transactionType: session.transactionType,
            rideId: String(session.rideId),
            ...(session.seatsToBook && {
              seatsBooked: String(session.seatsToBook),
            }),
          },
        },
        { idempotencyKey: session.id }
      );

      logger.info(
        `Payment initialization started with external referance ID (stripe payment intent ID) '${paymentIntent.id}' | Initialisation du paiement commencée avec l'ID de référence externe (ID de l'intention de paiement Stripe) '${paymentIntent.id}'.`,
        {
          level: LogLevel.INFO,
          action: "InitPayment",
          userId: user.id,
          externalReference: paymentIntent.id,
          meta: {
            amount: session.totalAmount,
            paymentIntentId: paymentIntent.id,
          },
        }
      );

      // --- 4. Handle SCA / 3DS flow ---
      if (paymentIntent.status === "requires_action") {
        await prisma.paymentSession.update({
          where: { id: session.id },
          data: {
            stripePaymentIntentId: paymentIntent.id,
            // status: PaymentSessionStatus.REQUIRES_3DS,
          },
        });

        return res.status(200).json({
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
        });
      }

      // --- 5. Authorization success path ---
      if (paymentIntent.status === "requires_capture") {
        const checkSessionStatus = await prisma.paymentSession.findUnique({
          where: { id: session.id },
        });
        if (checkSessionStatus?.status != PaymentSessionStatus.PENDING) {
          // session is now authorized
          if (session.status !== PaymentSessionStatus.PENDING) {
            return next(
              AppError(
                isEN
                  ? "This payment session has already been processed."
                  : "Cette session a déjà été traitée.",
                409
              )
            );
          }
        }

        // --- 6. Redeem passenger coupons (if any) ---
        const redeemedCouponsIds: number[] = [];

        if (session.couponsToConsume > 0) {
          const { coupons, totalCoupons } =
            await CouponService.getUserCouponBalance(session.userId);

          if (totalCoupons < session.couponsToConsume) {
            // Refund/void authorization
            await stripe.paymentIntents.cancel(paymentIntent.id);
            logger.info(
              `Payment cancelled for external referance ID (stripe payment intent ID) '${paymentIntent.id}' due to insufficient coupons to apply. | Paiement annulé pour l'ID de référence externe (ID d'intention de paiement Stripe) '${paymentIntent.id}' en raison d'un nombre insuffisant de coupons à appliquer.`,
              {
                level: LogLevel.INFO,
                action: "CancelPayment",
                userId: user.id,
                externalReference: paymentIntent.id,
                meta: {
                  amount: session.totalAmount,
                  paymentIntentId: paymentIntent.id,
                },
              }
            );

            return next(
              AppError(
                isEN
                  ? "Insufficient coupons. Payment authorization canceled."
                  : "Coupons insuffisants. Autorisation annulée.",
                400
              )
            );
          }

          const redeemed = await CouponService.redeemCoupons(
            session.couponsToConsume,
            coupons,
            "Booking a ride | Réserver un trajet"
          );
          redeemed.map((c) => {
            redeemedCouponsIds.push(c.couponId);
          });
        }

        // --- 7. CREATE BOOKING RECORD or confirm a d2d request now that payment is authorized ---
        if (session.d2dBooking) {
          const resp = await BookingService.completeD2dRideReqPayment({
            session: {...session, d2dBooking: session.d2dBooking },
            intentId: paymentIntent.id,
            ride: session.ride!,
            user: session.user,
          })
          return res.status(200).json({
            success: true,
            message: isEN
              ? "Payment authorized and confirmed the door to door booking"
              : "Paiement autorisé et réservation porte à porte confirmée",
              data: resp,
          });
        } else {
          const { booking, transaction } = await BookingService.finalizeBooking(
            {
              ride: session.ride!,
              session,
              intentId: paymentIntent.id,
            }
          );
          return res.status(200).json({
            success: true,
            message: isEN ? "Payment authorized." : "Paiement autorisé.",
            data: {
              booking,
              transaction,
            },
          });
        }
      }

      // --- 8. Unexpected status ---
      return next(
        AppError(
          isEN
            ? `Payment failed with status ${paymentIntent.status}`
            : `Le paiement a échoué avec le statut ${paymentIntent.status}`,
          400
        )
      );
    }
  );

  public static finalizeAfter3DS = catchAsync(async (req, res, next) => {
    const user = req.user!;
    const { paymentIntentId, sessionId } = matchedData(req);
    const isEN = req.isEnglishPreferred;

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== "requires_capture") {
      return next(
        AppError(isEN ? "Payment not completed" : "Paiement non complété", 400)
      );
    }

    const session = await prisma.paymentSession.findUnique({
      where: { id: sessionId },
      include: {
        ride: {
          include: {
            departureLocation: true,
            destinationLocation: true,
            driver: {
              select: {
                id: true,
                email: true,
                phoneNumber: true,
                language: true,
                notificationPref: true,
                fcm_token: true,
                firstName: true,
              },
            },
          },
        },
        d2dBooking: true,
        user: {
          select: {
            ...profileSelects,
            fcm_token: true,
          }
        }
      },
    });
    if (!session || session.userId !== user.id)
      return next(AppError(isEN ? "Invalid session" : "Session invalide", 400));
    if (session.status != PaymentSessionStatus.PENDING) {
      // session is now authorized
      return next(
        AppError(
          isEN
            ? "This payment session has already been processed."
            : "Cette session a déjà été traitée.",
          409
        )
      );
    }

    //  Redeem passenger coupons (if any) ---
    const redeemedCouponsIds: number[] = [];

    if (session.couponsToConsume > 0) {
      const { coupons, totalCoupons } =
        await CouponService.getUserCouponBalance(session.userId);

      if (totalCoupons < session.couponsToConsume) {
        // Refund/void authorization
        await stripe.paymentIntents.cancel(intent.id);
        logger.info(
          `Payment cancelled for external referance ID (stripe payment intent ID) '${intent.id}' due to insufficient coupons to apply. | Paiement annulé pour l'ID de référence externe (ID d'intention de paiement Stripe) '${intent.id}' en raison d'un nombre insuffisant de coupons à appliquer.`,
          {
            level: LogLevel.INFO,
            action: "CancelPayment",
            userId: user.id,
            externalReference: intent.id,
            meta: {
              amount: session.totalAmount,
              paymentIntentId: intent.id,
            },
          }
        );

        return next(
          AppError(
            isEN
              ? "Insufficient coupons. Payment authorization canceled."
              : "Coupons insuffisants. Autorisation annulée.",
            400
          )
        );
      }

      const redeemed = await CouponService.redeemCoupons(
        session.couponsToConsume,
        coupons,
        "Booking a ride | Réserver un trajet"
      );
      redeemed.map((c) => {
        redeemedCouponsIds.push(c.couponId);
      });
    }

       // CREATE BOOKING RECORD or confirm a d2d request now that payment is authorized

        if (session.d2dBooking) {
          const resp = await BookingService.completeD2dRideReqPayment({
            session: {...session, d2dBooking: session.d2dBooking },
            intentId: intent.id,
            ride: session.ride!,
            user: session.user,
          })
          return res.status(200).json({
            success: true,
            message: isEN
              ? "Payment authorized successfully after 3D Secure and confirmed the door to door booking"
              : "Paiement autorisé avec succès après 3D Secure et réservation porte à porte confirmée",
              data: resp,
          });
        } else {
          const { booking, transaction } = await BookingService.finalizeBooking(
            {
              ride: session.ride!,
              session,
              intentId: intent.id,
            }
          );
          return res.status(200).json({
            success: true,
               message: isEN
        ? "Payment authorized successfully after 3D Secure."
        : "Paiement autorisé avec succès après 3D Secure.",
            data: {
              booking,
              transaction,
            },
          });
        }
  });
}
