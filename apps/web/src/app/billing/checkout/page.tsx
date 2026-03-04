'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, Suspense } from 'react'

const TIER_PRICES: Record<string, { label: string; amount: number }> = {
  VIBE: { label: 'Source — Vibe', amount: 15600 },
  VERIFIED: { label: 'Source — Verified', amount: 62400 },
  FOUNDRY: { label: 'Source — Foundry', amount: 195000 },
  DEPLOY_VIBE: { label: 'Deploy — Vibe', amount: 19500 },
  DEPLOY_VERIFIED: { label: 'Deploy — Verified', amount: 78000 },
  DEPLOY_FOUNDRY: { label: 'Deploy — Foundry', amount: 243750 },
  SMALL: { label: 'Onsite — Small', amount: 24900 },
  MEDIUM: { label: 'Onsite — Medium', amount: 26900 },
  LARGE: { label: 'Onsite — Large', amount: 36900 },
}

const METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  fps: 'FPS (轉數快)',
  alipayhk: 'AliPayHK',
  wechatpay: 'WeChat Pay',
  payme: 'PayMe',
  octopus: 'Octopus',
}

interface PaymentMethodInfo {
  id: string
  gateway: string
  fees: { percentage: number; fixed?: number }
}

function formatFee(fees: { percentage: number; fixed?: number }): string {
  if (fees.fixed != null) {
    return `${fees.percentage}% + HK$${fees.fixed.toFixed(2)}`
  }
  return `${fees.percentage}%`
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0,
  }).format(amount)
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const commissionId = searchParams.get('commissionId') ?? ''
  const tierParam = searchParams.get('tier') ?? ''
  const tier = tierParam.toUpperCase()

  const [methods, setMethods] = useState<PaymentMethodInfo[]>([])
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [payLoading, setPayLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  const tierConfig = TIER_PRICES[tier]

  useEffect(() => {
    fetch('/api/billing/checkout')
      .then((res) => res.json())
      .then((data) => {
        setMethods(data.methods ?? [])
        if (data.methods?.length) {
          setSelectedMethod(data.methods[0].id)
        }
      })
      .catch(() => setMethods([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!expiresAt || !qrCodeUrl) return

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setCountdown(remaining)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, qrCodeUrl])

  const handlePay = useCallback(async () => {
    if (!commissionId || !tier || !selectedMethod) {
      setError('Missing commission or tier. Please use the link from your commission.')
      return
    }

    setPayLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          commissionId,
          method: selectedMethod,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Payment failed')
        setPayLoading(false)
        return
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      if (data.qrCodeUrl) {
        setQrCodeUrl(data.qrCodeUrl)
        setExpiresAt(data.expiresAt ?? null)
      }
    } catch {
      setError('Failed to create payment')
    } finally {
      setPayLoading(false)
    }
  }, [commissionId, tier, selectedMethod])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!commissionId || !tier) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <h1 className="text-lg font-semibold mb-2">Invalid checkout link</h1>
        <p className="text-sm text-gray-500">
          Commission ID and tier are required. Please use the link from your commission.
        </p>
      </div>
    )
  }

  if (!tierConfig) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <h1 className="text-lg font-semibold mb-2">Invalid tier</h1>
        <p className="text-sm text-gray-500">The selected tier is not valid.</p>
      </div>
    )
  }

  if (qrCodeUrl) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold mb-6">Scan to pay</h1>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 flex flex-col items-center">
          <img src={qrCodeUrl} alt="Payment QR code" className="w-48 h-48 rounded-lg mb-4" />
          <p className="text-sm text-gray-500 mb-2">Scan with your banking or wallet app</p>
          {countdown != null && (
            <p className="text-xs text-gray-400">
              Expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold mb-6">Checkout</h1>

      <div className="rounded-2xl border border-gray-200 p-6 mb-6">
        <p className="text-xs text-gray-500 mb-1">Order summary</p>
        <p className="text-sm font-medium">{tierConfig.label}</p>
        <p className="text-lg font-semibold mt-2">{formatPrice(tierConfig.amount)}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 p-6 mb-6">
        <p className="text-xs text-gray-500 mb-4">Payment method</p>
        {methods.length === 0 ? (
          <p className="text-sm text-gray-500">No payment methods available</p>
        ) : (
          <div className="space-y-2">
            {methods.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedMethod === m.id
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={m.id}
                  checked={selectedMethod === m.id}
                  onChange={() => setSelectedMethod(m.id)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{METHOD_LABELS[m.id] ?? m.id}</span>
                <span className="text-xs text-gray-500 ml-auto">{formatFee(m.fees)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={payLoading || methods.length === 0}
        className="w-full rounded-full bg-black text-white text-sm font-medium py-3 px-6 transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {payLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing…
          </span>
        ) : (
          'Pay'
        )}
      </button>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        }
      >
        <CheckoutContent />
      </Suspense>
    </div>
  )
}
