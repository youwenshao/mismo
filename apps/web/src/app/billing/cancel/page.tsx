'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface PaymentStatus {
  commissionId: string | null
  metadata: { tier?: string }
}

export default function BillingCancelPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('payment_id')

  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(!!paymentId)

  const fetchStatus = useCallback(async () => {
    if (!paymentId) return
    try {
      const res = await fetch(`/api/billing/status/${paymentId}`)
      const data = await res.json()
      if (res.ok) {
        setStatus({
          commissionId: data.commissionId ?? null,
          metadata: (data.metadata as Record<string, string>) ?? {},
        })
      } else {
        setStatus(null)
      }
    } catch {
      setStatus(null)
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

  const tryAgainHref =
    status?.commissionId && status?.metadata?.tier
      ? `/billing/checkout?commissionId=${status.commissionId}&tier=${status.metadata.tier}`
      : status?.commissionId
        ? `/billing/checkout?commissionId=${status.commissionId}`
        : null

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-gray-200 p-8">
          <div className="w-16 h-16 rounded-full border-2 border-gray-200 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">Payment cancelled</h1>
          <p className="text-sm text-gray-500 mb-8">
            You returned without completing the payment. No charges were made.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {tryAgainHref && !loading ? (
              <Link
                href={tryAgainHref}
                className="inline-block px-6 py-2.5 text-sm bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
              >
                Try Again
              </Link>
            ) : null}
            <Link
              href="/dashboard"
              className="inline-block px-6 py-2.5 text-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
