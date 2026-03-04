import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const RETENTION = {
  BUILD_LOGS_DAYS: 90,
  AUDIT_LOGS_DAYS: 365,
  CREDENTIAL_POST_DELIVERY_DAYS: 30,
  STUDIO_METRICS_DAYS: 30,
  API_HEALTH_SNAPSHOT_DAYS: 30,
  MONITORING_ALERTS_DAYS: 90,
  TOKEN_USAGE_DAYS: 180,
  NOTIFICATION_DAYS: 90,
  INTERVIEW_SESSION_EXPIRED_DAYS: 7,
}

const BATCH_SIZE = 1000

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}

async function batchDelete(
  table: string,
  whereClause: string,
  params: unknown[] = [],
): Promise<number> {
  let totalDeleted = 0
  let deleted: number
  do {
    const ids = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${table}" WHERE ${whereClause} LIMIT ${BATCH_SIZE}`,
      ...params,
    )
    if (ids.length === 0) break

    const idList = ids.map((r) => r.id)
    deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM "${table}" WHERE id = ANY($1::text[])`,
      idList,
    )
    totalDeleted += deleted
  } while (deleted === BATCH_SIZE)
  return totalDeleted
}

async function cleanBuildLogs() {
  const cutoff = daysAgo(RETENTION.BUILD_LOGS_DAYS)
  const count = await batchDelete('BuildLog', '"createdAt" < $1', [cutoff])
  console.log(
    `[retention] Deleted ${count} build logs older than ${RETENTION.BUILD_LOGS_DAYS} days`,
  )
  return count
}

async function cleanAuditLogs() {
  const cutoff = daysAgo(RETENTION.AUDIT_LOGS_DAYS)
  const count = await batchDelete('AuditLog', '"createdAt" < $1', [cutoff])
  console.log(
    `[retention] Deleted ${count} audit logs older than ${RETENTION.AUDIT_LOGS_DAYS} days`,
  )
  return count
}

async function cleanExpiredCredentials() {
  const cutoff = daysAgo(RETENTION.CREDENTIAL_POST_DELIVERY_DAYS)

  const completedCommissionIds = await prisma.delivery.findMany({
    where: {
      status: 'COMPLETED',
      updatedAt: { lt: cutoff },
    },
    select: { commissionId: true },
    distinct: ['commissionId'],
  })

  if (completedCommissionIds.length === 0) {
    console.log('[retention] No expired credentials to clean')
    return 0
  }

  const ids = completedCommissionIds.map((d) => d.commissionId)
  const { count } = await prisma.credential.deleteMany({
    where: { commissionId: { in: ids } },
  })
  console.log(
    `[retention] Deleted ${count} credentials from ${ids.length} delivered commissions (>${RETENTION.CREDENTIAL_POST_DELIVERY_DAYS}d post-delivery)`,
  )
  return count
}

async function cleanStudioMetrics() {
  const cutoff = daysAgo(RETENTION.STUDIO_METRICS_DAYS)
  const count = await batchDelete('StudioMetrics', '"createdAt" < $1', [cutoff])
  console.log(
    `[retention] Deleted ${count} studio metrics older than ${RETENTION.STUDIO_METRICS_DAYS} days`,
  )
  return count
}

async function cleanApiHealthSnapshots() {
  const cutoff = daysAgo(RETENTION.API_HEALTH_SNAPSHOT_DAYS)
  const count = await batchDelete('ApiHealthSnapshot', '"createdAt" < $1', [cutoff])
  console.log(
    `[retention] Deleted ${count} API health snapshots older than ${RETENTION.API_HEALTH_SNAPSHOT_DAYS} days`,
  )
  return count
}

async function cleanMonitoringAlerts() {
  const cutoff = daysAgo(RETENTION.MONITORING_ALERTS_DAYS)
  const count = await batchDelete(
    'MonitoringAlert',
    '"resolvedAt" IS NOT NULL AND "createdAt" < $1',
    [cutoff],
  )
  console.log(
    `[retention] Deleted ${count} resolved monitoring alerts older than ${RETENTION.MONITORING_ALERTS_DAYS} days`,
  )
  return count
}

async function cleanTokenUsage() {
  const cutoff = daysAgo(RETENTION.TOKEN_USAGE_DAYS)
  const count = await batchDelete('TokenUsage', '"createdAt" < $1', [cutoff])
  console.log(
    `[retention] Deleted ${count} token usage records older than ${RETENTION.TOKEN_USAGE_DAYS} days`,
  )
  return count
}

async function cleanNotifications() {
  const cutoff = daysAgo(RETENTION.NOTIFICATION_DAYS)
  const count = await batchDelete('Notification', '"sentAt" < $1', [cutoff])
  console.log(
    `[retention] Deleted ${count} notifications older than ${RETENTION.NOTIFICATION_DAYS} days`,
  )
  return count
}

async function cleanExpiredInterviewSessions() {
  const cutoff = daysAgo(RETENTION.INTERVIEW_SESSION_EXPIRED_DAYS)
  const { count } = await prisma.interviewSession.deleteMany({
    where: {
      expiresAt: { lt: cutoff },
      completedAt: { not: null },
    },
  })
  console.log(
    `[retention] Deleted ${count} expired interview sessions (completed, expired >${RETENTION.INTERVIEW_SESSION_EXPIRED_DAYS}d ago)`,
  )
  return count
}

async function anonymizeDeletedUsers() {
  const deletionRequests = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT "userId" FROM "User"
    WHERE "role" = 'CLIENT'
      AND "updatedAt" < ${daysAgo(30)}
      AND "hasCompletedOnboarding" = false
  `

  if (!deletionRequests || deletionRequests.length === 0) {
    console.log('[retention] No users to anonymize')
    return 0
  }

  console.log(
    `[retention] Found ${deletionRequests.length} inactive users (placeholder -- manual review required)`,
  )
  return 0
}

async function main() {
  const startTime = Date.now()
  console.log(`[retention] Starting data retention cleanup at ${new Date().toISOString()}`)
  console.log(`[retention] Retention policy:`)
  console.log(`  Build logs:           ${RETENTION.BUILD_LOGS_DAYS} days`)
  console.log(`  Audit logs:           ${RETENTION.AUDIT_LOGS_DAYS} days`)
  console.log(
    `  Credentials:          ${RETENTION.CREDENTIAL_POST_DELIVERY_DAYS} days post-delivery`,
  )
  console.log(`  Studio metrics:       ${RETENTION.STUDIO_METRICS_DAYS} days`)
  console.log(`  API health snapshots: ${RETENTION.API_HEALTH_SNAPSHOT_DAYS} days`)
  console.log(`  Monitoring alerts:    ${RETENTION.MONITORING_ALERTS_DAYS} days (resolved only)`)
  console.log(`  Token usage:          ${RETENTION.TOKEN_USAGE_DAYS} days`)
  console.log(`  Notifications:        ${RETENTION.NOTIFICATION_DAYS} days`)
  console.log(
    `  Interview sessions:   ${RETENTION.INTERVIEW_SESSION_EXPIRED_DAYS} days post-expiry (completed)`,
  )
  console.log(`  Batch size:           ${BATCH_SIZE}`)
  console.log('')

  const results: Record<string, number> = {}
  results.buildLogs = await cleanBuildLogs()
  results.auditLogs = await cleanAuditLogs()
  results.credentials = await cleanExpiredCredentials()
  results.studioMetrics = await cleanStudioMetrics()
  results.apiHealthSnapshots = await cleanApiHealthSnapshots()
  results.monitoringAlerts = await cleanMonitoringAlerts()
  results.tokenUsage = await cleanTokenUsage()
  results.notifications = await cleanNotifications()
  results.interviewSessions = await cleanExpiredInterviewSessions()
  await anonymizeDeletedUsers()

  const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0)
  const durationMs = Date.now() - startTime

  console.log(`\n[retention] Summary:`)
  for (const [table, count] of Object.entries(results)) {
    if (count > 0) console.log(`  ${table}: ${count} deleted`)
  }
  console.log(
    `[retention] Complete. Total records removed: ${totalDeleted} in ${(durationMs / 1000).toFixed(1)}s`,
  )
}

main()
  .catch((err) => {
    console.error('[retention] Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
