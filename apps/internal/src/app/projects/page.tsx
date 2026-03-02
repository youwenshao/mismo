import Link from 'next/link'
import { prisma } from '@mismo/db'

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
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

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: { user: true },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Projects</h1>

      {projects.length === 0 ? (
        <p className="text-sm text-gray-400">No projects yet</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wider">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Client</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Tier</th>
              <th className="pb-2 font-medium">Safety</th>
              <th className="pb-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-gray-100">
                <td className="py-3 text-sm">
                  <Link href={`/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </td>
                <td className="py-3 text-sm text-gray-500 font-mono">
                  {project.user.id.slice(0, 8)}
                </td>
                <td className="py-3 text-sm">{sentenceCase(project.status)}</td>
                <td className="py-3 text-sm">{project.tier}</td>
                <td className={`py-3 text-sm ${safetyColor(project.safetyScore)}`}>
                  {project.safetyScore}
                </td>
                <td className="py-3 text-sm text-gray-500">{timeAgo(project.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
