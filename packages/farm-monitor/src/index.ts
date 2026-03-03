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

const state = new MonitorState()
const alertRouter = new AlertRouter(config.alerts, config.supabase)
const metricsWriter = new MetricsWriter(config.supabase)

const resourceCollector = new ResourceCollector(config)
const apiHealthCollector = new ApiHealthCollector(config)
const buildTracker = new BuildTracker(config)
const securityScanner = new SecurityScanner(config)

const resourceResponder = new ResourceResponder(config, alertRouter)
const apiFailoverResponder = new ApiFailoverResponder(config, alertRouter)
const buildRecoveryResponder = new BuildRecoveryResponder(config, alertRouter)
const securityResponder = new SecurityResponder(config, alertRouter)

let lastQueueDepth = 0

async function runResourceCheck() {
  try {
    for (const studio of config.studios) {
      const metrics = await resourceCollector.collect(studio)
      if (metrics) {
        await resourceResponder.evaluate(studio.id, metrics, state)
        await metricsWriter.writeStudioMetrics(studio.id, metrics, lastQueueDepth)
      }
    }
  } catch (err) {
    console.error('[farm-monitor] Resource check failed:', err)
  }
}

async function runApiHealthCheck() {
  try {
    const health = await apiHealthCollector.collectAll()
    await apiFailoverResponder.evaluate(health, state)
    await metricsWriter.writeApiHealthSnapshots(health)
  } catch (err) {
    console.error('[farm-monitor] API health check failed:', err)
  }
}

async function runBuildTrackerCheck() {
  try {
    const builds = await buildTracker.collect()
    if (builds) lastQueueDepth = builds.queueDepth
    await buildRecoveryResponder.evaluate(builds, state)
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
  } catch (err) {
    console.error('[farm-monitor] Security check failed:', err)
  }
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

  console.log('[farm-monitor] All collectors started')
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
