import { NextRequest } from 'next/server'
import { POST as stripeWebhookHandler } from '../webhooks/stripe/route'

/**
 * Legacy Stripe webhook endpoint.
 * Forwards to the new unified path at /api/billing/webhooks/stripe.
 * Keep this alive until all Stripe webhook URLs are migrated in the dashboard.
 */
export async function POST(request: NextRequest) {
  return stripeWebhookHandler(request)
}
