import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const RETENTION = {
  BUILD_LOGS_DAYS: 90,
  AUDIT_LOGS_DAYS: 365,
  CREDENTIAL_POST_DELIVERY_DAYS: 30,
  STUDIO_METRICS_DAYS: 30,
  MONITORING_ALERTS_DAYS: 90,
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}

async function cleanBuildLogs() {
  const cutoff = daysAgo(RETENTION.BUILD_LOGS_DAYS)
  const { count } = await prisma.buildLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  console.log(`[retention] Deleted ${count} build logs older than ${RETENTION.BUILD_LOGS_DAYS} days`)
  return count
}

async function cleanAuditLogs() {
  const cutoff = daysAgo(RETENTION.AUDIT_LOGS_DAYS)
  const { count } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  console.log(`[retention] Deleted ${count} audit logs older than ${RETENTION.AUDIT_LOGS_DAYS} days`)
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
  const { count } = await prisma.studioMetrics.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  console.log(`[retention] Deleted ${count} studio metrics older than ${RETENTION.STUDIO_METRICS_DAYS} days`)
  return count
}

async function cleanMonitoringAlerts() {
  const cutoff = daysAgo(RETENTION.MONITORING_ALERTS_DAYS)
  const { count } = await prisma.monitoringAlert.deleteMany({
    where: {
      resolvedAt: { not: null },
      createdAt: { lt: cutoff },
    },
  })
  console.log(`[retention] Deleted ${count} resolved monitoring alerts older than ${RETENTION.MONITORING_ALERTS_DAYS} days`)
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

  console.log(`[retention] Found ${deletionRequests.length} inactive users (placeholder -- manual review required)`)
  return 0
}

async function main() {
  console.log(`[retention] Starting data retention cleanup at ${new Date().toISOString()}`)
  console.log(`[retention] Retention policy:`)
  console.log(`  Build logs:        ${RETENTION.BUILD_LOGS_DAYS} days`)
  console.log(`  Audit logs:        ${RETENTION.AUDIT_LOGS_DAYS} days`)
  console.log(`  Credentials:       ${RETENTION.CREDENTIAL_POST_DELIVERY_DAYS} days post-delivery`)
  console.log(`  Studio metrics:    ${RETENTION.STUDIO_METRICS_DAYS} days`)
  console.log(`  Monitoring alerts: ${RETENTION.MONITORING_ALERTS_DAYS} days (resolved only)`)
  console.log('')

  let totalDeleted = 0
  totalDeleted += await cleanBuildLogs()
  totalDeleted += await cleanAuditLogs()
  totalDeleted += await cleanExpiredCredentials()
  totalDeleted += await cleanStudioMetrics()
  totalDeleted += await cleanMonitoringAlerts()
  await anonymizeDeletedUsers()

  console.log(`\n[retention] Complete. Total records removed: ${totalDeleted}`)
}

main()
  .catch((err) => {
    console.error('[retention] Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
