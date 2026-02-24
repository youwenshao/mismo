import { NextRequest, NextResponse } from 'next/server'
import { scanDependencies } from '@mismo/ai'

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { packageJson?: Record<string, unknown> }

  if (!body.packageJson) {
    return NextResponse.json({ error: 'Missing packageJson in request body' }, { status: 400 })
  }

  const packageJson = body.packageJson as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }

  const result = scanDependencies(packageJson)

  return NextResponse.json({
    totalPackages: result.packages.length,
    copyleftCount: result.copyleftPackages.length,
    unknownCount: result.unknownPackages.length,
    packages: result.packages,
    copyleftPackages: result.copyleftPackages,
    unknownPackages: result.unknownPackages,
    attributionDoc: result.attributionDoc,
  })
}
