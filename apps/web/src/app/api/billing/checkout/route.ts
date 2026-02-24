import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const TIER_PRICES: Record<string, { amount: number; label: string }> = {
  VIBE: { amount: 2_000_00, label: "Mismo Vibe Tier" },
  VERIFIED: { amount: 8_000_00, label: "Mismo Verified Tier" },
  FOUNDRY: { amount: 25_000_00, label: "Mismo Foundry Tier" },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tier, projectId } = body as {
      tier: string;
      projectId: string;
    };

    if (!tier || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields: tier and projectId" },
        { status: 400 },
      );
    }

    const tierConfig = TIER_PRICES[tier.toUpperCase()];
    if (!tierConfig) {
      return NextResponse.json(
        { error: `Invalid tier: ${tier}. Must be VIBE, VERIFIED, or FOUNDRY` },
        { status: 400 },
      );
    }

    if (!stripe) {
      const mockUrl = `${request.nextUrl.origin}/project/${projectId}/checkout?mock=true&session_id=mock_${crypto.randomUUID()}`;
      return NextResponse.json({
        url: mockUrl,
        mock: true,
        message:
          "Stripe is not configured. Returning mock checkout URL for development.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: tierConfig.label },
            unit_amount: tierConfig.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.nextUrl.origin}/project/${projectId}/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/project/${projectId}/checkout?canceled=true`,
      metadata: { projectId, tier: tier.toUpperCase() },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
