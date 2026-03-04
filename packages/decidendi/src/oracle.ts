/**
 * HKD -> USDC exchange rate oracle.
 * USDC is pegged 1:1 to USD. We convert HKD cents to USDC (6 decimals).
 *
 * Default rate: 1 USD = 7.80 HKD (Hong Kong dollar peg band: 7.75-7.85)
 * This can be overridden by env var or fetched from a live API.
 */

const DEFAULT_HKD_PER_USD = 7.8

export function getHkdToUsdRate(): number {
  const envRate = process.env.HKD_USD_RATE
  if (envRate) {
    const parsed = parseFloat(envRate)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_HKD_PER_USD
}

/**
 * Convert HKD cents to USDC amount (6 decimals).
 * @param hkdCents - Amount in HKD cents (e.g., 15_600_00 = HKD 15,600)
 * @returns USDC amount as bigint with 6 decimals
 */
export function hkdCentsToUsdc(hkdCents: number): bigint {
  const rate = getHkdToUsdRate()
  const hkd = hkdCents / 100
  const usd = hkd / rate
  const usdc6 = Math.round(usd * 1_000_000)
  return BigInt(usdc6)
}

/**
 * Format USDC amount (6 decimals) to human-readable string.
 */
export function formatUsdc(amount: bigint): string {
  const num = Number(amount) / 1_000_000
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
}
