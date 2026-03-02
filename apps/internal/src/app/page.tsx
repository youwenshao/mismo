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

export default async function OverviewPage() {
  const [activeProjects, pendingReviews, totalClients, reviews] = await Promise.all([
    prisma.project.count({
      where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } },
    }),
    prisma.reviewTask.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.reviewTask.findMany({
      where: { status: 'PENDING' },
      include: { project: true },
      orderBy: { slaDeadline: 'asc' },
      take: 10,
    }),
  ])

  const stats = [
    { label: 'Active Projects', value: activeProjects },
    { label: 'Pending Reviews', value: pendingReviews },
    { label: 'Total Clients', value: totalClients },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Overview</h1>

      <div className="flex gap-8">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Pending Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">No pending reviews</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Due</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-b border-gray-100">
                  <td className="py-3 text-sm">{review.project.name}</td>
                  <td className="py-3 text-sm">{review.type}</td>
                  <td className="py-3 text-sm text-gray-500">{timeAgo(review.slaDeadline)}</td>
                  <td className="py-3">
                    <button className="text-sm font-medium text-black hover:underline">
                      Claim
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
