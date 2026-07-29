import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/CatchAsync";
import { stripe } from "../config/stripe";
import { DbUser } from "../types";
import { TransactionService } from "../services/transaction.service";
import { AppError } from "../utils/AppError";
import { matchedData } from "express-validator";
import Stripe from "stripe";
import { logger,LogLevel } from "../utils/logger";


export class CardController {
  // Get all cards for the user
  static getCards = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user! as DbUser;
    const isEn = req.isEnglishPreferred;
    const stripeCustomerId = await TransactionService.getOrCreateStripeCustomer(
      user
    );
    if (!stripeCustomerId) {
      return next(AppError(isEn ? "Payment system not configured" : "Système de paiement non configuré", 503));
    }

    // Fetch the customer's default payment method
     const customer = await stripe.customers.retrieve(stripeCustomerId) as Stripe.Customer;
  const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method as string;
    const cards = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    });

    const now = new Date();
    const cardList = cards.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isExpired:
        pm.card?.exp_year! < now.getFullYear() ||
        (pm.card?.exp_year === now.getFullYear() &&
          pm.card?.exp_month! < now.getMonth() + 1),
      isDefault: pm.id === defaultPaymentMethodId,
    }));

    return res.json({
      success: true,
      data: cardList,
    });
  });

  // Add a new card for the user
  static createCard = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user! as DbUser;
    const isEn = req.isEnglishPreferred;

    const stripeCustomerId = await TransactionService.getOrCreateStripeCustomer(
      user
    );
    if (!stripeCustomerId) {
      return next(AppError(isEn ? "Payment system not configured" : "Système de paiement non configuré", 503));
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: "off_session",
    });

    const cardCreateLogData = {
      level: LogLevel.ERROR,
      message: isEn
        ? "Card creation initiated."
        : "Création de la carte initiée.",
      action: "create_card",
      userId: user.id,
      meta: {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        setupIntentId: setupIntent.id,
        date: new Date().toISOString(),
      },
    };
    

    logger.info(cardCreateLogData.message, {
      action: cardCreateLogData.action,
      userId: cardCreateLogData.userId,
      meta: cardCreateLogData.meta,
    });

    return res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      message: isEn
        ? "Adding card initiated. Please follow instrucrions to complete the addition."
        : "Ajout de la carte initié. Veuillez suivre les instructions pour compléter l'ajout.",
    });
  });

  static deleteCard = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { paymentMethodId } = matchedData<{ paymentMethodId: string }>(
        req,
        { locations: ["params"] }
      );
      const user = req.user! as DbUser;
      const isEn = req.isEnglishPreferred;

      // Verify ownership before detach
      const stripeCustomerId =
        await TransactionService.getOrCreateStripeCustomer(user);

      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentMethodId
      );
      if (paymentMethod.customer !== stripeCustomerId) {
        const nolongerLogData = {
            level: LogLevel.ERROR,
            message: isEn
              ? "Card does not belong to you"
              : "La carte ne vous appartient pas",
            action: "delete_card",
            userId: user.id,
            meta: {
              userId: user.id,
              email: user.email,
              role: user.role,
              firstName: user.firstName,
              lastName: user.lastName,
              date: new Date().toISOString(),
            },
          };
          
          logger.error(nolongerLogData.message, {
            action: nolongerLogData.action,
            userId: nolongerLogData.userId,
            meta: nolongerLogData.meta,
          });
        return next(
          AppError(
            isEn
              ? "Card does not belong to you"
                : "La carte ne vous appartient pas",
              403
          )
        );
      }

      await stripe.paymentMethods.detach(paymentMethodId);
      const cardDeleteLogData = {
        level: LogLevel.ERROR,
        message: isEn
          ? "Card deleted successfully."
          : "Carte supprimée avec succès.",
        action: "delete_card",
        userId: user.id,
        meta: {
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          paymentMethodId,
          date: new Date().toISOString(),
        },
      };
      
      logger.info(cardDeleteLogData.message, {
        action: cardDeleteLogData.action,
        userId: cardDeleteLogData.userId,
        meta: cardDeleteLogData.meta,
      });

      return res.json({
        success: true,
        message: isEn
          ? "Card deleted successfully"
          : "Carte supprimée avec succès",
      });
    }
  );

  static setDefaultCard = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { paymentMethodId } = matchedData<{ paymentMethodId: string }>(
        req,
        { locations: ["params"] }
      );
      const user = req.user! as DbUser;
      const isEn = req.isEnglishPreferred;

      const stripeCustomerId =
        await TransactionService.getOrCreateStripeCustomer(user);
      if (!stripeCustomerId) {
        return next(AppError(isEn ? "Payment system not configured" : "Système de paiement non configuré", 503));
      }

      // Verify the card belongs to the customer
      const card = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (card.customer !== stripeCustomerId) {
        const nolongerLogData = {
            level: LogLevel.ERROR,
            message: isEn
              ? "Card does not belong to you"
              : "La carte ne vous appartient pas",
            action: "delete_card",
            userId: user.id,
            meta: {
              userId: user.id,
              email: user.email,
              role: user.role,
              firstName: user.firstName,
              lastName: user.lastName,
              date: new Date().toISOString(),
            },
          };
          
          logger.error(nolongerLogData.message, {
            action: nolongerLogData.action,
            userId: nolongerLogData.userId,
            meta: nolongerLogData.meta,
          });
        return next(
          AppError(
            isEn
              ? "Card does not belong to you"
              : "La carte ne vous appartient pas",
            403
          )
        );
      }

      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return res.json({
        success: true,
        message: isEn
          ? "Default card set successfully"
          : "Carte par défaut définie avec succès",
      });
    }
  );

  static getDefaultCard = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEn = req.isEnglishPreferred;
      const stripeCustomerId =
        await TransactionService.getOrCreateStripeCustomer(user);
      if (!stripeCustomerId) {
        return next(AppError(isEn ? "Payment system not configured" : "Système de paiement non configuré", 503));
      }

      const customer = await stripe.customers.retrieve(stripeCustomerId);
      const defaultPaymentMethodId = (customer as any).invoice_settings
        ?.default_payment_method;

      if (!defaultPaymentMethodId) {
        const noDefaultCardLogData = {
          level: LogLevel.ERROR,
          message: isEn ? "No default card set" : "Aucune carte par défaut définie",
          action: "get_default_card",
          userId: user.id,
          meta: {
            userId: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            date: new Date().toISOString(),
          },
        };
        
        logger.error(noDefaultCardLogData.message, {
          action: noDefaultCardLogData.action,
          userId: noDefaultCardLogData.userId,
          meta: noDefaultCardLogData.meta,
        });

        return next(
          AppError(
            isEn ? "No default card set" : "Aucune carte par défaut définie",
            404
          )
        );
      }

      const paymentMethod = await stripe.paymentMethods.retrieve(
        defaultPaymentMethodId
      );

      const now = new Date();
      
      return res.json({
        success: true,
        data: {
          id: paymentMethod.id,
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          expMonth: paymentMethod.card?.exp_month,
          expYear: paymentMethod.card?.exp_year,
          isExpired:
            paymentMethod.card?.exp_year! < now.getFullYear() ||
            (paymentMethod.card?.exp_year === now.getFullYear() &&
              paymentMethod.card?.exp_month! < now.getMonth() + 1),
          isDefault: true,
        },
      });
    }
  );
}
