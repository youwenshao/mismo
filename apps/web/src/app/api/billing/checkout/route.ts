import { NextRequest, NextResponse } from 'next/server'
import { getPaymentRouter, PaymentMethod, getGatewayForMethod, GATEWAY_FEES } from '@mismo/payment'
import { prisma } from '@mismo/db'
import { getSessionUser } from '@/lib/auth'
import { SOURCE_TIER_PRICING, DEPLOY_BASE_MULTIPLIER, ONSITE_PRICING } from '@mismo/shared'

type TierKey = string

interface TierConfig {
  amount: number
  label: string
  currency: string
}

function resolveTierPrice(tier: string): TierConfig | null {
  const key = tier.toUpperCase()

  // Source tiers
  if (key in SOURCE_TIER_PRICING) {
    const t = SOURCE_TIER_PRICING[key as keyof typeof SOURCE_TIER_PRICING]
    return { amount: t.amount, label: t.label, currency: 'hkd' }
  }

  // Deploy tiers (Source price * 1.25 base — retainer billed separately)
  const deployMatch = key.match(/^DEPLOY_(.+)$/)
  if (deployMatch) {
    const sourceKey = deployMatch[1] as keyof typeof SOURCE_TIER_PRICING
    const source = SOURCE_TIER_PRICING[sourceKey]
    if (source) {
      return {
        amount: Math.round(source.amount * DEPLOY_BASE_MULTIPLIER),
        label: `Deploy — ${source.label.split('—')[1]?.trim() || sourceKey}`,
        currency: 'hkd',
      }
    }
  }

  // Onsite tiers (hardware + setup — one-time, retainer billed separately)
  if (key in ONSITE_PRICING) {
    const t = ONSITE_PRICING[key as keyof typeof ONSITE_PRICING]
    return { amount: t.amount, label: t.label, currency: 'hkd' }
  }

  return null
}

const VALID_METHODS: PaymentMethod[] = ['card', 'fps', 'alipayhk', 'wechatpay', 'payme', 'octopus']

interface CheckoutRequest {
  tier: TierKey
  commissionId: string
  method: PaymentMethod
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { tier, commissionId, method } = body as CheckoutRequest

    if (!tier || !commissionId || !method) {
      return NextResponse.json(
        { error: 'Missing required fields: tier, commissionId, method' },
        { status: 400 },
      )
    }

    const tierConfig = resolveTierPrice(tier)
    if (!tierConfig) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    if (!VALID_METHODS.includes(method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
    })

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
    }

    if (commission.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admin bypass: auto-complete without charging
    if (user.role === 'ADMIN') {
      const paymentRecord = await prisma.payment.create({
        data: {
          transactionId: `admin_bypass_${Date.now()}`,
          gateway: 'STRIPE',
          method: 'CARD',
          amount: 0,
          currency: 'HKD',
          status: 'COMPLETED',
          description: `${tierConfig.label} (admin bypass)`,
          metadata: { tier: tier.toUpperCase(), commissionId, adminBypass: 'true' },
          commissionId,
          completedAt: new Date(),
        },
      })

      await prisma.commission.update({
        where: { id: commissionId },
        data: { paymentState: 'FINAL' },
      })

      const origin = request.nextUrl.origin
      return NextResponse.json({
        paymentId: paymentRecord.id,
        transactionId: paymentRecord.transactionId,
        checkoutUrl: `${origin}/billing/success?payment_id=${paymentRecord.id}`,
        status: 'completed',
        gateway: 'admin',
        adminBypass: true,
      })
    }

    // Check for valid unused grants
    const grant = await prisma.userGrant.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
    })

    const tierKey = tier.toUpperCase()
    const isSourceTier = tierKey in SOURCE_TIER_PRICING
    const isDeployTier = tierKey.startsWith('DEPLOY_')
    const isOnsiteTier = tierKey in ONSITE_PRICING

    let grantApplied = false
    if (grant) {
      const canUseGrant =
        (grant.grantType === 'UNLIMITED_7DAY' && !isOnsiteTier) ||
        (grant.grantType === 'FREE_SOURCE' && isSourceTier) ||
        (grant.grantType === 'FREE_SOURCE_OR_DEPLOY' && (isSourceTier || isDeployTier))

      if (canUseGrant) {
        grantApplied = true

        const paymentRecord = await prisma.payment.create({
          data: {
            transactionId: `grant_${grant.id}_${Date.now()}`,
            gateway: 'STRIPE',
            method: 'CARD',
            amount: 0,
            currency: 'HKD',
            status: 'COMPLETED',
            description: `${tierConfig.label} (grant: ${grant.grantType})`,
            metadata: {
              tier: tierKey,
              commissionId,
              grantId: grant.id,
              grantType: grant.grantType,
            },
            commissionId,
            completedAt: new Date(),
          },
        })

        const markUsed = grant.grantType !== 'UNLIMITED_7DAY'
        if (markUsed) {
          await prisma.userGrant.update({
            where: { id: grant.id },
            data: { usedAt: new Date() },
          })
        }

        await prisma.commission.update({
          where: { id: commissionId },
          data: { paymentState: 'FINAL' },
        })

        const origin = request.nextUrl.origin
        return NextResponse.json({
          paymentId: paymentRecord.id,
          transactionId: paymentRecord.transactionId,
          checkoutUrl: `${origin}/billing/success?payment_id=${paymentRecord.id}`,
          status: 'completed',
          gateway: 'grant',
          grantApplied: true,
        })
      }
    }

    // Duplicate payment prevention: reuse pending payment if still valid
    const existingPending = await prisma.payment.findFirst({
      where: {
        commissionId,
        status: 'PENDING',
        createdAt: { gt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existingPending && existingPending.transactionId) {
      return NextResponse.json({
        paymentId: existingPending.id,
        transactionId: existingPending.transactionId,
        status: 'pending',
        gateway: existingPending.gateway.toLowerCase(),
        message: 'Existing pending payment found',
      })
    }

    const router = getPaymentRouter()

    if (!router.isMethodAvailable(method)) {
      return NextResponse.json(
        { error: 'Selected payment method is not available' },
        { status: 400 },
      )
    }

    const paymentRecord = await prisma.payment.create({
      data: {
        transactionId: `pending_${Date.now()}`,
        gateway: getGatewayForMethod(method).toUpperCase() as any,
        method: method.toUpperCase() as any,
        amount: tierConfig.amount,
        currency: tierConfig.currency.toUpperCase(),
        status: 'PENDING',
        description: tierConfig.label,
        metadata: { tier: tierKey, commissionId },
        commissionId,
      },
    })

    const origin = request.nextUrl.origin
    const paymentResult = await router.processPayment({
      amount: tierConfig.amount,
      currency: tierConfig.currency as 'hkd' | 'usd',
      method,
      description: tierConfig.label,
      metadata: {
        paymentId: paymentRecord.id,
        commissionId,
        tier: tierKey,
      },
      successUrl: `${origin}/billing/success?payment_id=${paymentRecord.id}`,
      cancelUrl: `${origin}/billing/cancel?payment_id=${paymentRecord.id}`,
    })

    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: { transactionId: paymentResult.transactionId },
    })

    return NextResponse.json({
      paymentId: paymentRecord.id,
      transactionId: paymentResult.transactionId,
      checkoutUrl: paymentResult.checkoutUrl,
      qrCodeUrl: paymentResult.qrCodeUrl,
      status: paymentResult.status,
      gateway: paymentResult.gateway,
      expiresAt: paymentResult.expiresAt?.toISOString(),
    })
  } catch (error) {
    console.error('Checkout failed:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const router = getPaymentRouter()
    const methods = router.getSupportedMethods()

    const methodDetails = methods.map((method) => {
      const gateway = getGatewayForMethod(method)
      const fees = GATEWAY_FEES[gateway]
      return {
        id: method,
        gateway,
        fees: {
          percentage: +(fees.percentage * 100).toFixed(1),
          fixed: fees.fixed,
        },
      }
    })

    return NextResponse.json({ methods: methodDetails })
  } catch {
    return NextResponse.json({ methods: [] })
  }
}
