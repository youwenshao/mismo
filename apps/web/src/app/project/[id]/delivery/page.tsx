import { prisma } from '@mismo/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  VALIDATING: 'Validating your build',
  CREATING_REPO: 'Setting up your repository',
  GENERATING_DOCS: 'Generating documentation',
  TRANSFERRING: 'Transferring to you',
  AWAITING_ACCEPTANCE: 'Waiting for your acceptance',
  VERIFYING: 'Running final verification',
  COMPLETED: 'Delivered',
  FAILED: 'Transfer encountered an issue',
  ROLLBACK: 'Rolling back changes',
}

const TRANSFER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PAYMENT_CONFIRMED: 'Payment confirmed',
  DEPLOYING: 'Deploying your application',
  DEPLOYED: 'Deployed',
  TRANSFERRING: 'Transferring ownership',
  COMPLETED: 'Transfer complete',
  FAILED: 'Transfer failed',
  MONITORING: 'Monitoring deployment',
}

function CheckIcon({ passed }: { passed: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium ${
        passed
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-gray-100 text-gray-400 border border-gray-200'
      }`}
    >
      {passed ? '\u2713' : '\u2013'}
    </span>
  )
}

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect('/auth')

  const project = await prisma.project.findUnique({
    where: { id, userId: user.id },
    select: { id: true, name: true, status: true },
  })

  if (!project) notFound()

  const commission = await prisma.commission.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (!commission) {
    return (
      <DeliveryLayout projectId={id} projectName={project.name}>
        <EmptyState message="No active commission found for this project." />
      </DeliveryLayout>
    )
  }

  const [deliveries, hostingTransfers, deliveryPackage] = await Promise.all([
    prisma.delivery.findMany({
      where: { commissionId: commission.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
    prisma.hostingTransfer.findMany({
      where: { commissionId: commission.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
    prisma.build
      .findFirst({
        where: { commissionId: commission.id, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
        select: { deliveryPackage: true },
      })
      .then((b) => b?.deliveryPackage ?? null),
  ])

  const delivery = deliveries[0] ?? null
  const transfer = hostingTransfers[0] ?? null

  if (!delivery && !transfer) {
    return (
      <DeliveryLayout projectId={id} projectName={project.name}>
        <EmptyState message="Your project hasn't reached the delivery phase yet. Check back once your build is complete." />
      </DeliveryLayout>
    )
  }

  return (
    <DeliveryLayout projectId={id} projectName={project.name}>
      <div className="space-y-8">
        {/* Delivery status */}
        {delivery && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Delivery
            </h2>
            <div className="border border-gray-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {DELIVERY_STATUS_LABELS[delivery.status] || delivery.status}
                </span>
                <StatusBadge status={delivery.status} />
              </div>

              {/* Verification checks */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 mb-3">Verification</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CheckIcon passed={delivery.secretScanPassed} />
                    <span className="text-sm">Secret scan</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckIcon passed={delivery.bmadChecksPassed} />
                    <span className="text-sm">BMAD checks</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckIcon passed={delivery.contractCheckPassed} />
                    <span className="text-sm">API contract</span>
                  </div>
                </div>
              </div>

              {/* Links */}
              {(delivery.repoUrl || delivery.transferredRepoUrl) && (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  {delivery.transferredRepoUrl && (
                    <a
                      href={delivery.transferredRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-black" />
                      View repository
                    </a>
                  )}
                  {delivery.repoUrl && !delivery.transferredRepoUrl && (
                    <a
                      href={delivery.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Staging repository
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Hosting transfer */}
        {transfer && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Hosting
            </h2>
            <div className="border border-gray-200 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {TRANSFER_STATUS_LABELS[transfer.status] || transfer.status}
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {transfer.provider}
                </span>
              </div>

              {transfer.deploymentUrl && (
                <a
                  href={transfer.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  View live deployment
                </a>
              )}

              {transfer.monitoringEnabled && (
                <p className="text-xs text-gray-400">
                  Health monitoring active
                  {transfer.monitoringUntil &&
                    ` until ${new Date(transfer.monitoringUntil).toLocaleDateString()}`}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Delivery package */}
        {deliveryPackage && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Documentation
            </h2>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              <DocLink
                label="Architecture Decision Record"
                available={!!deliveryPackage.adrDocument}
              />
              <DocLink label="How-To Guide" available={!!deliveryPackage.howToGuide} />
              <DocLink label="API Documentation" available={!!deliveryPackage.apiDocs} />
              {deliveryPackage.videoUrl && (
                <a
                  href={deliveryPackage.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
                >
                  <span>Walkthrough Video</span>
                  <span className="text-xs text-gray-400">Watch</span>
                </a>
              )}
            </div>
          </section>
        )}
      </div>
    </DeliveryLayout>
  )
}

function DeliveryLayout({
  projectId,
  projectName,
  children,
}: {
  projectId: string
  projectName: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4 shrink-0 bg-white/80 backdrop-blur-md z-50">
        <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
          Mismo
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={`/project/${projectId}/status`}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Status
          </Link>
          <Link
            href={`/project/${projectId}`}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Spec
          </Link>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <h1 className="text-xl font-semibold mb-1">{projectName}</h1>
          <p className="text-sm text-gray-400 mb-10">Delivery</p>
          {children}
        </div>
      </main>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-8 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isComplete = status === 'COMPLETED'
  const isFailed = status === 'FAILED' || status === 'ROLLBACK'

  if (isComplete) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
        Complete
      </span>
    )
  }
  if (isFailed) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
        Issue
      </span>
    )
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      In progress
    </span>
  )
}

function DocLink({ label, available }: { label: string; available: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className={available ? '' : 'text-gray-400'}>{label}</span>
      <span className={`text-xs ${available ? 'text-green-600' : 'text-gray-300'}`}>
        {available ? 'Included' : 'Pending'}
      </span>
    </div>
  )
}
