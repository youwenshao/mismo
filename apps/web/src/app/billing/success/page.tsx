'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

const METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  fps: 'FPS (轉數快)',
  alipayhk: 'AliPayHK',
  wechatpay: 'WeChat Pay',
  payme: 'PayMe',
  octopus: 'Octopus',
}

function formatAmount(amountCents: number): string {
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0,
  }).format(amountCents / 100)
}

interface PaymentStatus {
  id: string
  status: string
  amount: number
  currency: string
  method: string
  createdAt: string
  completedAt: string | null
}

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('payment_id')

  const [payment, setPayment] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!paymentId) return
    try {
      const res = await fetch(`/api/billing/status/${paymentId}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to load payment')
        setPayment(null)
        return
      }
      setPayment({
        id: data.id,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        createdAt: data.createdAt,
        completedAt: data.completedAt,
      })
      setError(null)
    } catch {
      setError('Failed to load payment')
      setPayment(null)
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  useEffect(() => {
    if (!paymentId) {
      setLoading(false)
      return
    }
    fetchStatus()
  }, [paymentId, fetchStatus])

  useEffect(() => {
    if (!paymentId || !payment || payment.status !== 'PENDING') return
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [paymentId, payment?.status, fetchStatus])

  if (!paymentId) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-sm text-gray-500">Missing payment ID</p>
          <Link
            href="/dashboard"
            className="inline-block mt-6 px-6 py-2.5 text-sm bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (loading && !payment) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !payment) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-sm text-gray-500">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block mt-6 px-6 py-2.5 text-sm bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (payment?.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="rounded-2xl border border-gray-200 p-8">
            <div className="w-12 h-12 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Processing…</h1>
            <p className="text-sm text-gray-500 mb-6">
              Your payment is being processed. This usually takes a few seconds.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-2.5 text-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const displayDate = payment?.completedAt ?? payment?.createdAt ?? ''
  const formattedDate = displayDate
    ? new Date(displayDate).toLocaleDateString('zh-HK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-gray-200 p-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-6">Payment successful</h1>
          <div className="text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-medium">{formatAmount(payment?.amount ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment method</span>
              <span>{METHOD_LABELS[(payment?.method ?? '').toLowerCase()] ?? payment?.method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment ID</span>
              <span className="font-mono text-xs">{payment?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span>{formattedDate}</span>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="inline-block mt-8 px-6 py-2.5 text-sm bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
