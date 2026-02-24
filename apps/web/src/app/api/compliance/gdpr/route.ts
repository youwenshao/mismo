import { NextRequest, NextResponse } from 'next/server'
import {
  checkGDPRCompliance,
  type DataExportRequest,
  type DeletionRequest,
} from '@mismo/ai'

const MOCK_APP_CONFIG: Record<string, unknown> = {
  dataExportEndpoint: true,
  dataDeletionEndpoint: true,
  privacyPolicy: true,
  cookieConsent: true,
  dataProcessingAgreement: false,
}

const exportRequests: DataExportRequest[] = []
const deletionRequests: DeletionRequest[] = []

export async function GET() {
  const status = checkGDPRCompliance(MOCK_APP_CONFIG)

  const compliantCount = Object.values(status).filter(Boolean).length
  const totalChecks = Object.keys(status).length

  return NextResponse.json({
    status,
    summary: {
      compliant: compliantCount,
      total: totalChecks,
      percentage: Math.round((compliantCount / totalChecks) * 100),
    },
    exportRequests,
    deletionRequests,
  })
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    type: 'export' | 'deletion'
    userId: string
  }

  if (!body.type || !body.userId) {
    return NextResponse.json(
      { error: 'Missing type or userId in request body' },
      { status: 400 },
    )
  }

  if (body.type === 'export') {
    const request: DataExportRequest = {
      userId: body.userId,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    }
    exportRequests.push(request)
    return NextResponse.json({ message: 'Data export request created', request })
  }

  if (body.type === 'deletion') {
    const request: DeletionRequest = {
      userId: body.userId,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    }
    deletionRequests.push(request)
    return NextResponse.json({ message: 'Data deletion request created', request })
  }

  return NextResponse.json({ error: 'Invalid type — must be "export" or "deletion"' }, { status: 400 })
}
