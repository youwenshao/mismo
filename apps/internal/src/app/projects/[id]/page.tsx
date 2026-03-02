import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@mismo/db'

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

function sentenceCase(str: string): string {
  return str.charAt(0) + str.slice(1).toLowerCase()
}

function safetyColor(safety: string): string {
  switch (safety) {
    case 'YELLOW':
      return 'text-amber-600'
    case 'RED':
      return 'text-red-600'
    default:
      return 'text-gray-500'
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      user: true,
      buildLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      tokenUsages: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!project) notFound()

  return (
    <div>
      <Link
        href="/projects"
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block"
      >
        &larr; Projects
      </Link>
      <h1 className="text-xl font-semibold">{project.name}</h1>

      <div className="mt-6 grid grid-cols-2 gap-y-4 max-w-lg">
        <div>
          <p className="text-xs text-gray-400">Client</p>
          <p className="text-sm font-mono">{project.user.id.slice(0, 8)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Status</p>
          <p className="text-sm">{sentenceCase(project.status)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Tier</p>
          <p className="text-sm">{project.tier}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Safety</p>
          <p className={`text-sm ${safetyColor(project.safetyScore)}`}>{project.safetyScore}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Created</p>
          <p className="text-sm">{formatDate(project.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Contract</p>
          <p className="text-sm">{project.contractSigned ? 'Signed' : 'Pending'}</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Build Logs</h2>
        {project.buildLogs.length === 0 ? (
          <p className="text-sm text-gray-400">No build logs yet</p>
        ) : (
          <div className="space-y-2">
            {project.buildLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-baseline gap-4 text-sm border-b border-gray-100 py-2"
              >
                <span className="font-medium">{log.stage}</span>
                <span className="text-gray-500">{log.status}</span>
                <span className="text-gray-400 text-xs ml-auto">
                  {formatTimestamp(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Token Usage</h2>
        {project.tokenUsages.length === 0 ? (
          <p className="text-sm text-gray-400">No token usage recorded</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="pb-2 font-medium">Feature</th>
                <th className="pb-2 font-medium">Tokens</th>
                <th className="pb-2 font-medium">Cost</th>
                <th className="pb-2 font-medium">Agent</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {project.tokenUsages.map((usage) => (
                <tr key={usage.id} className="border-b border-gray-100">
                  <td className="py-2 text-sm">{usage.feature}</td>
                  <td className="py-2 text-sm font-mono">{usage.tokens.toLocaleString()}</td>
                  <td className="py-2 text-sm font-mono">${usage.cost.toFixed(4)}</td>
                  <td className="py-2 text-sm text-gray-500">{usage.agent}</td>
                  <td className="py-2 text-sm text-gray-400">{formatTimestamp(usage.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
