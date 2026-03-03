import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

const WHITELIST_KEY = 'admin.emailHashes'

const HEX_64_REGEX = /^[a-fA-F0-9]{64}$/

function isValidSha256Hash(str: string): boolean {
  return typeof str === 'string' && HEX_64_REGEX.test(str.trim())
}

export async function GET() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: WHITELIST_KEY },
  })
  const hashes = config?.value ? (config.value as string[]) : []
  return NextResponse.json({ hashes })
}

export async function POST(req: NextRequest) {
  let body: { emailHash?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { emailHash } = body
  if (!emailHash) {
    return NextResponse.json({ error: 'Missing emailHash' }, { status: 400 })
  }

  const trimmed = emailHash.trim()
  if (!isValidSha256Hash(trimmed)) {
    return NextResponse.json(
      { error: 'emailHash must be a 64-character hex string (SHA-256)' },
      { status: 400 },
    )
  }

  const normalizedHash = trimmed.toLowerCase()

  const config = await prisma.systemConfig.findUnique({
    where: { key: WHITELIST_KEY },
  })

  const currentHashes: string[] = config?.value
    ? (config.value as string[]).map((h) => h.toLowerCase())
    : []

  if (currentHashes.includes(normalizedHash)) {
    return NextResponse.json({ hashes: currentHashes, added: false })
  }

  const newHashes = [...currentHashes, normalizedHash]

  await prisma.systemConfig.upsert({
    where: { key: WHITELIST_KEY },
    update: { value: newHashes, updatedBy: 'admin' },
    create: { key: WHITELIST_KEY, value: newHashes, updatedBy: 'admin' },
  })

  return NextResponse.json({ hashes: newHashes, added: true })
}

export async function DELETE(req: NextRequest) {
  let body: { emailHash?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { emailHash } = body
  if (!emailHash) {
    return NextResponse.json({ error: 'Missing emailHash' }, { status: 400 })
  }

  const trimmed = emailHash.trim()
  if (!isValidSha256Hash(trimmed)) {
    return NextResponse.json(
      { error: 'emailHash must be a 64-character hex string (SHA-256)' },
      { status: 400 },
    )
  }

  const normalizedHash = trimmed.toLowerCase()

  const config = await prisma.systemConfig.findUnique({
    where: { key: WHITELIST_KEY },
  })

  const currentHashes: string[] = config?.value
    ? (config.value as string[]).map((h) => h.toLowerCase())
    : []

  if (!currentHashes.includes(normalizedHash)) {
    return NextResponse.json({ hashes: currentHashes, removed: false })
  }

  const newHashes = currentHashes.filter((h) => h !== normalizedHash)

  await prisma.systemConfig.upsert({
    where: { key: WHITELIST_KEY },
    update: { value: newHashes, updatedBy: 'admin' },
    create: { key: WHITELIST_KEY, value: newHashes, updatedBy: 'admin' },
  })

  return NextResponse.json({ hashes: newHashes, removed: true })
}
