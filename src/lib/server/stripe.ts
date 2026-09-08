// Stripe singleton — server-only
import Stripe from 'stripe';

let instance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!instance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    instance = new Stripe(key, { apiVersion: '2025-06-30' as Stripe.LatestApiVersion });
  }
  return instance;
}

// Credit package definitions (amount in credits, price in KRW)
export const CREDIT_PACKAGES = [
  { credits: 1000, priceKrw: 1000, label: '1,000 크레딧' },
  { credits: 5000, priceKrw: 4500, label: '5,000 크레딧 (10% 할인)' },
  { credits: 10000, priceKrw: 8000, label: '10,000 크레딧 (20% 할인)' },
  { credits: 50000, priceKrw: 35000, label: '50,000 크레딧 (30% 할인)' },
] as const;

export function findPackage(credits: number) {
  return CREDIT_PACKAGES.find((p) => p.credits === credits);
}
