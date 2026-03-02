import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')

  if (key) {
    const config = await prisma.systemConfig.findUnique({ where: { key } })
    if (!config) {
      return NextResponse.json({ key, value: null })
    }
    return NextResponse.json({ key: config.key, value: config.value })
  }

  const configs = await prisma.systemConfig.findMany({
    where: { key: { startsWith: 'mo.' } },
  })
  const result: Record<string, unknown> = {}
  for (const c of configs) {
    result[c.key] = c.value
  }
  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const { key, value } = (await req.json()) as {
    key: string
    value: unknown
  }

  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  }

  const jsonValue = JSON.parse(JSON.stringify(value))
  const config = await prisma.systemConfig.upsert({
    where: { key },
    update: { value: jsonValue, updatedBy: 'admin' },
    create: { key, value: jsonValue, updatedBy: 'admin' },
  })

  return NextResponse.json({ key: config.key, value: config.value })
}
