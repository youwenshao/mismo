import Stripe from 'stripe'

function getStripeInstance(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.warn('STRIPE_SECRET_KEY is not set — Stripe operations will be unavailable.')
    return null
  }
  return new Stripe(key, { apiVersion: '2026-01-28.clover' })
}

export const stripe = getStripeInstance()
