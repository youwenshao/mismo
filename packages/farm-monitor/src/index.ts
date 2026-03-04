import './env'
import http from 'http'
import { config } from './config'
import { MonitorState } from './state'
import { AlertRouter } from './alerts/router'
import { ResourceCollector } from './collectors/resource'
import { ApiHealthCollector } from './collectors/api-health'
import { BuildTracker } from './collectors/build-tracker'
import { SecurityScanner } from './collectors/security'
import { ResourceResponder } from './responders/resource-actions'
import { ApiFailoverResponder } from './responders/api-failover'
import { BuildRecoveryResponder } from './responders/build-recovery'
import { SecurityResponder } from './responders/security-actions'
import { MetricsWriter } from './writers/metrics-writer'
import { DbRetention } from './maintenance/db-retention'

const state = new MonitorState()
const alertRouter = new AlertRouter(config.alerts, config.supabase)
const metricsWriter = new MetricsWriter(config.supabase)
const dbRetention = new DbRetention(config.supabase)

const resourceCollector = new ResourceCollector(config)
const apiHealthCollector = new ApiHealthCollector(config)
const buildTracker = new BuildTracker(config)
const securityScanner = new SecurityScanner(config)

const resourceResponder = new ResourceResponder(config, alertRouter)
const apiFailoverResponder = new ApiFailoverResponder(config, alertRouter)
const buildRecoveryResponder = new BuildRecoveryResponder(config, alertRouter)
const securityResponder = new SecurityResponder(config, alertRouter)

let lastQueueDepth = 0

const lastCheckTimestamps: Record<string, number> = {
  resource: 0,
  api: 0,
  build: 0,
  security: 0,
}

const MAINTENANCE_INTERVAL_MS = 10 * 60_000
const COMMISSION_FAILURE_MAX_AGE_MS = 24 * 60 * 60_000
const STALENESS_MULTIPLIER = 3
const DB_RETENTION_INTERVAL_MS = 24 * 60 * 60_000

async function runResourceCheck() {
  try {
    for (const studio of config.studios) {
      const metrics = await resourceCollector.collect(studio)
      if (metrics) {
        await resourceResponder.evaluate(studio.id, metrics, state)
        await metricsWriter.writeStudioMetrics(studio.id, metrics, lastQueueDepth)
      }
    }
    lastCheckTimestamps.resource = Date.now()
  } catch (err) {
    console.error('[farm-monitor] Resource check failed:', err)
  }
}

async function runApiHealthCheck() {
  try {
    const health = await apiHealthCollector.collectAll()
    await apiFailoverResponder.evaluate(health, state)
    await metricsWriter.writeApiHealthSnapshots(health)
    lastCheckTimestamps.api = Date.now()
  } catch (err) {
    console.error('[farm-monitor] API health check failed:', err)
  }
}

async function runBuildTrackerCheck() {
  try {
    const builds = await buildTracker.collect()
    if (builds) lastQueueDepth = builds.queueDepth
    await buildRecoveryResponder.evaluate(builds, state)
    lastCheckTimestamps.build = Date.now()
  } catch (err) {
    console.error('[farm-monitor] Build tracker check failed:', err)
  }
}

async function runSecurityCheck() {
  try {
    for (const studio of config.studios) {
      const events = await securityScanner.scan(studio)
      await securityResponder.evaluate(studio.id, events, state)
    }
    lastCheckTimestamps.security = Date.now()
  } catch (err) {
    console.error('[farm-monitor] Security check failed:', err)
  }
}

function runMaintenance() {
  const alertsPruned = state.pruneSentAlerts()
  const failuresPruned = state.pruneCommissionFailures(COMMISSION_FAILURE_MAX_AGE_MS)
  if (alertsPruned || failuresPruned) {
    console.log(
      `[farm-monitor] Maintenance: pruned ${alertsPruned} alerts, ${failuresPruned} commission failures`,
    )
  }

  checkStaleness()
}

function checkStaleness() {
  const now = Date.now()
  const checks: Array<{ name: string; lastRun: number; intervalMs: number }> = [
    {
      name: 'resource',
      lastRun: lastCheckTimestamps.resource,
      intervalMs: config.intervals.resourceCollector,
    },
    { name: 'api', lastRun: lastCheckTimestamps.api, intervalMs: config.intervals.apiHealth },
    {
      name: 'build',
      lastRun: lastCheckTimestamps.build,
      intervalMs: config.intervals.buildTracker,
    },
    {
      name: 'security',
      lastRun: lastCheckTimestamps.security,
      intervalMs: config.intervals.securityScanner,
    },
  ]

  for (const check of checks) {
    if (check.lastRun === 0) continue
    const staleDuration = now - check.lastRun
    const threshold = check.intervalMs * STALENESS_MULTIPLIER
    if (staleDuration > threshold) {
      console.error(
        `[farm-monitor] STALE: ${check.name} collector has not run for ${Math.round(staleDuration / 60_000)}min (expected every ${Math.round(check.intervalMs / 60_000)}min)`,
      )
      alertRouter
        .send(
          'P0',
          'RESOURCE',
          `Collector stale: ${check.name}`,
          `The ${check.name} collector has not completed a check in ${Math.round(staleDuration / 60_000)} minutes (threshold: ${Math.round(threshold / 60_000)}min).`,
        )
        .catch((err) => console.error('[farm-monitor] Failed to send staleness alert:', err))
    }
  }
}

let lastRetentionRun = 0

async function runDbRetention() {
  const now = Date.now()
  if (now - lastRetentionRun < DB_RETENTION_INTERVAL_MS) return
  lastRetentionRun = now

  try {
    console.log('[farm-monitor] Running inline DB retention...')
    await dbRetention.run()
    console.log('[farm-monitor] Inline DB retention complete')
  } catch (err) {
    console.error('[farm-monitor] Inline DB retention failed:', err)
  }
}

function startHealthServer() {
  const port = Number(process.env.FARM_MONITOR_HEALTH_PORT || 3006)
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      const mem = process.memoryUsage()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          status: 'ok',
          uptime: Math.round(process.uptime()),
          memoryMb: {
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
            rss: Math.round(mem.rss / 1024 / 1024),
          },
          sentAlerts: state.sentAlertsCount(),
          lastChecks: {
            resource: lastCheckTimestamps.resource
              ? new Date(lastCheckTimestamps.resource).toISOString()
              : null,
            api: lastCheckTimestamps.api ? new Date(lastCheckTimestamps.api).toISOString() : null,
            build: lastCheckTimestamps.build
              ? new Date(lastCheckTimestamps.build).toISOString()
              : null,
            security: lastCheckTimestamps.security
              ? new Date(lastCheckTimestamps.security).toISOString()
              : null,
          },
          lastRetentionRun: lastRetentionRun ? new Date(lastRetentionRun).toISOString() : null,
        }),
      )
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  server.listen(port, () => {
    console.log(`[farm-monitor] Health endpoint listening on port ${port}`)
  })
  return server
}

function startMonitor() {
  console.log('[farm-monitor] Starting agent farm monitoring service...')
  console.log(`[farm-monitor] Monitoring ${config.studios.length} studios`)

  runResourceCheck()
  runApiHealthCheck()
  runBuildTrackerCheck()
  runSecurityCheck()

  setInterval(runResourceCheck, config.intervals.resourceCollector)
  setInterval(runApiHealthCheck, config.intervals.apiHealth)
  setInterval(runBuildTrackerCheck, config.intervals.buildTracker)
  setInterval(runSecurityCheck, config.intervals.securityScanner)

  setInterval(runMaintenance, MAINTENANCE_INTERVAL_MS)

  setInterval(runDbRetention, 60 * 60_000)
  runDbRetention()

  startHealthServer()

  console.log('[farm-monitor] All collectors and maintenance loops started')
}

startMonitor()

process.on('SIGTERM', () => {
  console.log('[farm-monitor] Shutting down...')
  process.exit(0)
})
process.on('SIGINT', () => {
  console.log('[farm-monitor] Shutting down...')
  process.exit(0)
})
