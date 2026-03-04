import { NextRequest, NextResponse } from 'next/server'
import { getPaymentRouter } from '@mismo/payment'
import { prisma } from '@mismo/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const { paymentId } = await params
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { commission: { select: { id: true, userId: true } } },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.commission && payment.commission.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Sync with gateway for pending payments
    if (
      payment.status === 'PENDING' &&
      payment.transactionId &&
      !payment.transactionId.startsWith('pending_')
    ) {
      try {
        const router = getPaymentRouter()
        const gatewayStatus = await router.getPaymentStatus(
          payment.transactionId,
          payment.gateway.toLowerCase() as 'stripe' | 'paymentasia',
        )

        if (gatewayStatus !== payment.status.toLowerCase()) {
          const updateData: Record<string, unknown> = { status: gatewayStatus.toUpperCase() }

          if (gatewayStatus === 'completed') {
            updateData.completedAt = new Date()
          } else if (gatewayStatus === 'failed') {
            updateData.failedAt = new Date()
          }

          await prisma.payment.update({
            where: { id: payment.id },
            data: updateData,
          })

          payment.status = gatewayStatus.toUpperCase() as any
        }
      } catch (err) {
        console.warn(`Failed to sync payment status: ${err instanceof Error ? err.message : err}`)
      }
    }

    const metadata = payment.metadata as Record<string, string> | null
    return NextResponse.json({
      id: payment.id,
      transactionId: payment.transactionId,
      gateway: payment.gateway,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      description: payment.description,
      commissionId: payment.commissionId,
      metadata: metadata ?? {},
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      failedAt: payment.failedAt,
      refundedAt: payment.refundedAt,
    })
  } catch (error) {
    console.error('Get payment status error:', error)
    return NextResponse.json({ error: 'Failed to get payment status' }, { status: 500 })
  }
}
