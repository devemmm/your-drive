import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/CatchAsync";
import { stripe } from "../config/stripe";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { matchedData } from "express-validator";
import { Platforms } from '../types/index';

export class StripeController {
  static connectStripe = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user!;
      const isEn = req.isEnglishPreferred;
      const { platform = Platforms.web, redirect_pathname } = matchedData<{ platform?: Platforms, redirect_pathname?: string }>(req, { locations: ["query"] });
      const pathname = (platform == Platforms.web && !redirect_pathname) ? "/post-a-ride" : redirect_pathname || "";

      let accountId = user.stripeAccountId;

      // Step 1: Create an Express account if not existing
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "CA", // or your operating country
          email: user.email,
          capabilities: {
            transfers: { requested: true },
          },
          business_type: "individual",
          tos_acceptance: {
            service_agreement: "recipient",
          },
          metadata: {
            userId: user.id,
          },
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeAccountId: account.id },
        });

        accountId = account.id;
      }

      // Step 2: Check if the user already completed onboarding
      if (user.isStripeOnboarded) {
        return next(
          AppError(
            isEn
              ? "You are already connected to Stripe"
              : "Vous êtes déjà connecté à Stripe",
            400
          )
        );
      }

      // Step 3: Generate onboarding link
      const protocol = req.protocol;
      const host = req.get("host");
      const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/api/v1/stripe/refresh?account=${accountId}&platform=${platform}&redirect_pathname=${pathname}`,
        return_url: `${baseUrl}/api/v1/stripe/return?account=${accountId}&platform=${platform}&redirect_pathname=${pathname}`,
        type: "account_onboarding",
      });

      res.json({
        success: true,
        data: {
          url: accountLink.url,
        },
      });
    }
  );

  // Step 4: Handle onboarding return
  static handleStripeReturn = async (req: Request, res: Response) => {
    const { platform = Platforms.web, account: accountId, redirect_pathname } = req.query as { account?: string, platform?: Platforms, redirect_pathname?: string };
    const pathname = (platform == Platforms.web && !redirect_pathname) ? "/post-a-ride" : redirect_pathname || "";
    const finalPN = pathname.length && !pathname.startsWith("/") ? "/"+pathname: pathname;
    const redirectLink = platform == Platforms.mobile ? `${process.env.MOBILE_REDIRECT_URL}${finalPN}`: `${process.env.FRONTEND_URL}${finalPN}`;

    if (!accountId) {
      res.redirect(redirectLink + "?error=Missing Stripe account ID.");
      return;
    };

    try {
      const account = await stripe.accounts.retrieve(accountId);

      // If details are submitted, mark user as onboarded
      if (account.details_submitted) {
        await prisma.user.update({
          where: { stripeAccountId: account.id },
          data: { isStripeOnboarded: true },
        });
      }

      res.redirect(redirectLink);
    } catch (err) {
      console.error("Stripe return failed:", err);
      res.redirect(redirectLink+"?error=An error occurred during onboarding return.");
    }
  };

  // Step 5: Handle onboarding refresh (if user exits midway)
  static handleStripeRefresh = async (req: Request, res: Response) => {
     const { platform = Platforms.web, account: accountId, redirect_pathname } = req.query as { account?: string, platform?: Platforms, redirect_pathname?: string };
    const pathname = (platform == Platforms.web && !redirect_pathname) ? "/post-a-ride" : redirect_pathname || "";
    const finalPN = pathname.length && !pathname.startsWith("/") ? "/"+pathname: pathname;
    const redirectLink = platform == Platforms.mobile ? `${process.env.MOBILE_REDIRECT_URL}${finalPN}`: `${process.env.FRONTEND_URL}${finalPN}`;

    if (!accountId) {
      res.redirect(redirectLink+"?error=Missing Stripe account ID.");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { stripeAccountId: accountId },
    });

    if (!user) {
      res.redirect(redirectLink+"?error=No user found for this Stripe account.");
      return;
    }

    try {
      const protocol = req.protocol;
      const host = req.get("host");
      const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/api/v1/stripe/refresh?account=${accountId}&platform=${platform}&redirect_pathname=${pathname}`,
        return_url: `${baseUrl}/api/v1/stripe/return?account=${accountId}&platform=${platform}&redirect_pathname=${pathname}`,
        type: "account_onboarding",
      });

      res.redirect(accountLink.url);
    } catch (err) {
      console.error("Stripe refresh failed:", err);
      res.redirect(redirectLink+"?error=Failed to refresh onboarding link.");
    }
  };
}
