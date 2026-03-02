import { NextResponse } from 'next/server'
import { getProviderList, checkProviderHealth } from '@mismo/ai'

export async function GET() {
  const providers = getProviderList()
  const withHealth = await Promise.all(
    providers.map(async (p) => {
      const health = await checkProviderHealth(p.id)
      return { ...p, health }
    }),
  )
  return NextResponse.json(withHealth)
}
