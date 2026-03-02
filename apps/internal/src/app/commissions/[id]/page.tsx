import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@mismo/db'
import { TOKEN_BUDGET_PER_FEATURE } from '@mismo/shared'
import { VerificationStatus } from '@/components/commissions/verification-status'
import { EtaCard } from '@/components/commissions/eta-card'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  DISCOVERY: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
  ESCALATED: 'bg-red-50 text-red-700',
}

const buildStatusColors: Record<string, string> = {
  PENDING: 'text-gray-500',
  RUNNING: 'text-blue-600',
  SUCCESS: 'text-green-600',
  FAILED: 'text-red-600',
}

export default async function CommissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const commission = await prisma.commission.findUnique({
    where: { id },
    include: {
      archetype: true,
      builds: {
        orderBy: { createdAt: 'desc' },
        include: {
          deliveries: {
            select: {
              id: true,
              status: true,
              repoUrl: true,
              secretScanPassed: true,
              bmadChecksPassed: true,
              contractCheckPassed: true,
              errorMessage: true,
            },
          },
        },
      },
      user: { select: { id: true, role: true } },
    },
  })

  if (!commission) notFound()

  const prd = commission.prdJson as Record<string, unknown> | null
  const totalTokens = commission.builds.reduce(
    (sum, b) => sum + b.kimiqTokensUsed,
    0
  )

  return (
    <div>
      <Link
        href="/commissions"
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block"
      >
        &larr; Commissions
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-semibold">{commission.clientEmail}</h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${statusColors[commission.status] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {commission.status}
        </span>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 max-w-2xl mb-10">
        <div>
          <p className="text-xs text-gray-400">Archetype</p>
          <p className="text-sm">{commission.archetype?.name ?? 'None'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Payment</p>
          <p className="text-sm">{commission.paymentState}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Created</p>
          <p className="text-sm">{formatDate(commission.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Total Tokens</p>
          <p className="text-sm font-mono">{totalTokens.toLocaleString()}</p>
        </div>
        {commission.feasibilityScore != null && (
          <div>
            <p className="text-xs text-gray-400">Feasibility</p>
            <p
              className={`text-sm font-mono ${commission.feasibilityScore < 80 ? 'text-amber-600' : ''}`}
            >
              {commission.feasibilityScore.toFixed(1)}
              {commission.feasibilityScore < 80 && ' \u26A0'}
            </p>
          </div>
        )}
      </div>

      {/* BMAD Risk Assessment */}
      {commission.feasibilityScore != null && commission.feasibilityScore < 80 && (
        <div className="mb-6 border border-amber-200 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Low feasibility score — this commission carries elevated risk
        </div>
      )}
      <RiskPanel riskAssessment={commission.riskAssessment as Record<string, unknown> | null} />

      {/* Token Usage Warning */}
      <TokenUsageWarning totalTokens={totalTokens} prd={prd} />

      {/* Estimated Delivery */}
      {commission.builds.length > 0 && commission.builds[0].status === 'RUNNING' && (
        <section className="mb-10">
          <EtaCard commissionId={id} />
        </section>
      )}

      {/* PRD Summary */}
      {prd && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">PRD Summary</h2>
            <Link
              href={`/commissions/${id}/graph`}
              className="text-xs text-gray-500 hover:text-black transition-colors"
            >
              View Dependency Graph &rarr;
            </Link>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm">
            {prd.name != null && (
              <p className="font-medium mb-2">{String(prd.name)}</p>
            )}
            {prd.description != null && (
              <p className="text-gray-600">{String(prd.description)}</p>
            )}
            {Array.isArray(prd.features) && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">Features</p>
                <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                  {(prd.features as unknown[]).slice(0, 8).map((f, i) => (
                    <li key={i}>{typeof f === 'string' ? f : JSON.stringify(f)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Build History */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Build History</h2>
        {commission.builds.length === 0 ? (
          <p className="text-sm text-gray-400">No builds yet</p>
        ) : (
          <div className="space-y-3">
            {commission.builds.map((build) => (
              <div
                key={build.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400">
                      {build.id.slice(0, 8)}
                    </span>
                    <span
                      className={`text-xs font-medium ${buildStatusColors[build.status] ?? 'text-gray-500'}`}
                    >
                      {build.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(build.createdAt)}
                  </span>
                </div>

                <div className="flex gap-6 text-xs text-gray-500">
                  {build.studioAssignment && (
                    <span>Studio: {build.studioAssignment}</span>
                  )}
                  <span>Tokens: {build.kimiqTokensUsed.toLocaleString()}</span>
                  <span>Failures: {build.failureCount}</span>
                </div>

                {build.deliveries.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {build.deliveries.map((d, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
                      >
                        {d.status}
                      </span>
                    ))}
                  </div>
                )}

                {build.errorLogs && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-500 cursor-pointer">
                      Error Logs
                    </summary>
                    <pre className="mt-1 text-[10px] text-red-400 bg-red-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(build.errorLogs, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Verification Status */}
      <DeliveryVerification builds={commission.builds} />

      {/* Audit Trail */}
      <AuditTrail commissionId={id} />
    </div>
  )
}

function RiskPanel({
  riskAssessment,
}: {
  riskAssessment: Record<string, unknown> | null
}) {
  if (!riskAssessment) return null
  const items = Array.isArray(riskAssessment.items)
    ? (riskAssessment.items as string[])
    : []
  if (items.length === 0) return null

  return (
    <details className="mb-10">
      <summary className="text-sm font-medium cursor-pointer text-gray-600 hover:text-black">
        Risk Assessment ({items.length} items)
      </summary>
      <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside pl-2">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </details>
  )
}

function TokenUsageWarning({
  totalTokens,
  prd,
}: {
  totalTokens: number
  prd: Record<string, unknown> | null
}) {
  const featureCount = Array.isArray(prd?.features)
    ? (prd!.features as unknown[]).length
    : 1
  const estimate = TOKEN_BUDGET_PER_FEATURE * featureCount
  const usage = totalTokens / estimate

  if (usage < 0.8) return null

  return (
    <div
      className={`mb-6 border rounded-lg px-4 py-2 text-sm ${
        usage >= 1
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      Token usage at {(usage * 100).toFixed(0)}% of estimate ({totalTokens.toLocaleString()} / {estimate.toLocaleString()})
      {usage >= 3 && ' — exceeds 3x budget, investigate'}
    </div>
  )
}

function DeliveryVerification({
  builds,
}: {
  builds: Array<{
    deliveries: Array<{
      id: string
      secretScanPassed: boolean
      bmadChecksPassed: boolean
      contractCheckPassed: boolean
      errorMessage: string | null
    }>
  }>
}) {
  const allDeliveries = builds.flatMap((b) => b.deliveries)
  if (allDeliveries.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-3">Verification Status</h2>
      <div className="space-y-3">
        {allDeliveries.map((delivery) => (
          <VerificationStatus
            key={delivery.id}
            checks={[
              { label: 'Secret Scan', passed: delivery.secretScanPassed },
              { label: 'BMAD Checks', passed: delivery.bmadChecksPassed },
              { label: 'API Contract', passed: delivery.contractCheckPassed },
            ]}
            errorMessage={delivery.errorMessage}
          />
        ))}
      </div>
    </section>
  )
}

async function AuditTrail({ commissionId }: { commissionId: string }) {
  const logs = await prisma.auditLog.findMany({
    where: { resource: 'commission', resourceId: commissionId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  if (logs.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Audit Trail</h2>
      <div className="space-y-1">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-baseline gap-3 text-xs border-b border-gray-100 py-2"
          >
            <span className="text-gray-400 font-mono">
              {formatTimestamp(log.createdAt)}
            </span>
            <span className="text-gray-600">{log.action}</span>
            {log.metadata && (
              <span className="text-gray-400">
                {JSON.stringify(log.metadata)}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
