import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not configured. Payment features will be unavailable.');
}

export const stripe = (stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null) as Stripe;