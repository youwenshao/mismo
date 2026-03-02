import express, { Request, Response } from 'express'
import { prisma } from '@mismo/db'

const app = express()
app.use(express.json())

const CIRCUIT_BREAKER_THRESHOLD = 3

interface ErrorEntry {
  source?: string
  error: string
  attempt?: number
  timestamp: string
  context?: unknown
}

function extractSource(serviceUrl?: string): string {
  if (!serviceUrl) return 'unknown'
  try {
    const url = new URL(serviceUrl)
    return url.hostname
  } catch {
    return serviceUrl
  }
}

app.post('/log', async (req: Request, res: Response) => {
  try {
    const { buildId, serviceUrl, attempt, error, timestamp, source, context } = req.body

    if (!buildId || !error) {
      res.status(400).json({ success: false, error: 'buildId and error are required' })
      return
    }

    const build = await prisma.build.findUnique({ where: { id: buildId } })
    if (!build) {
      res.status(404).json({ success: false, error: `Build ${buildId} not found` })
      return
    }

    const existingLogs: ErrorEntry[] = Array.isArray(build.errorLogs) ? (build.errorLogs as ErrorEntry[]) : []

    const entry: ErrorEntry = {
      source: source || extractSource(serviceUrl),
      error,
      attempt,
      timestamp: timestamp || new Date().toISOString(),
      context,
    }

    const updatedLogs = [...existingLogs, entry]
    const newFailureCount = build.failureCount + 1
    const circuitBroken = newFailureCount >= CIRCUIT_BREAKER_THRESHOLD

    await prisma.build.update({
      where: { id: buildId },
      data: {
        errorLogs: updatedLogs,
        failureCount: newFailureCount,
        ...(circuitBroken && { status: 'FAILED', humanReview: true }),
      },
    })

    res.json({ success: true, failureCount: newFailureCount, circuitBroken })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /log]', message)
    res.status(500).json({ success: false, error: message })
  }
})

app.post('/log-batch', async (req: Request, res: Response) => {
  try {
    const { buildId, entries } = req.body

    if (!buildId || !Array.isArray(entries) || entries.length === 0) {
      res.status(400).json({ success: false, error: 'buildId and a non-empty entries array are required' })
      return
    }

    const build = await prisma.build.findUnique({ where: { id: buildId } })
    if (!build) {
      res.status(404).json({ success: false, error: `Build ${buildId} not found` })
      return
    }

    const existingLogs: ErrorEntry[] = Array.isArray(build.errorLogs) ? (build.errorLogs as ErrorEntry[]) : []

    const newEntries: ErrorEntry[] = entries.map((e: ErrorEntry) => ({
      source: e.source || 'unknown',
      error: e.error,
      timestamp: e.timestamp || new Date().toISOString(),
      context: e.context,
    }))

    const updatedLogs = [...existingLogs, ...newEntries]
    const newFailureCount = build.failureCount + entries.length
    const circuitBroken = newFailureCount >= CIRCUIT_BREAKER_THRESHOLD

    await prisma.build.update({
      where: { id: buildId },
      data: {
        errorLogs: updatedLogs,
        failureCount: newFailureCount,
        ...(circuitBroken && { status: 'FAILED', humanReview: true }),
      },
    })

    res.json({ success: true, failureCount: newFailureCount, circuitBroken })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /log-batch]', message)
    res.status(500).json({ success: false, error: message })
  }
})

app.get('/status/:buildId', async (req: Request, res: Response) => {
  try {
    const { buildId } = req.params

    const build = await prisma.build.findUnique({ where: { id: buildId } })
    if (!build) {
      res.status(404).json({ success: false, error: `Build ${buildId} not found` })
      return
    }

    res.json({
      buildId: build.id,
      status: build.status,
      failureCount: build.failureCount,
      humanReview: build.humanReview,
      errorLogs: build.errorLogs,
      circuitBroken: build.failureCount >= CIRCUIT_BREAKER_THRESHOLD,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /status]', message)
    res.status(500).json({ success: false, error: message })
  }
})

app.post('/reset/:buildId', async (req: Request, res: Response) => {
  try {
    const { buildId } = req.params

    const build = await prisma.build.findUnique({ where: { id: buildId } })
    if (!build) {
      res.status(404).json({ success: false, error: `Build ${buildId} not found` })
      return
    }

    await prisma.build.update({
      where: { id: buildId },
      data: {
        failureCount: 0,
        humanReview: false,
        status: 'PENDING',
      },
    })

    res.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /reset]', message)
    res.status(500).json({ success: false, error: message })
  }
})

const PORT = process.env.PORT || 3005
app.listen(PORT, () => {
  console.log(`Error Logger listening on port ${PORT}`)
})
