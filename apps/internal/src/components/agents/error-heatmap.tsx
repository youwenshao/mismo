interface HeatmapCell {
  stage: string
  agent: string
  count: number
}

interface ErrorHeatmapProps {
  data: HeatmapCell[]
  stages: string[]
  agents: string[]
}

function getCellColor(count: number, max: number): string {
  if (count === 0) return 'bg-gray-50'
  const intensity = count / Math.max(max, 1)
  if (intensity > 0.7) return 'bg-red-500 text-white'
  if (intensity > 0.4) return 'bg-red-300 text-red-900'
  if (intensity > 0.1) return 'bg-red-100 text-red-700'
  return 'bg-red-50 text-red-600'
}

export function ErrorHeatmap({ data, stages, agents }: ErrorHeatmapProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 0)

  function getCount(stage: string, agent: string): number {
    return data.find((d) => d.stage === stage && d.agent === agent)?.count ?? 0
  }

  if (stages.length === 0 || agents.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <h3 className="text-sm font-semibold mb-4">Error Heatmap</h3>
        <p className="text-xs text-gray-400">No error data available</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      <h3 className="text-sm font-semibold mb-4">Error Heatmap (Stage x Agent)</h3>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left text-gray-400 font-medium">Stage</th>
              {agents.map((agent) => (
                <th
                  key={agent}
                  className="p-2 text-center text-gray-400 font-medium min-w-[70px]"
                >
                  {agent}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr key={stage}>
                <td className="p-2 text-gray-600 whitespace-nowrap">
                  {stage}
                </td>
                {agents.map((agent) => {
                  const count = getCount(stage, agent)
                  return (
                    <td key={agent} className="p-1">
                      <div
                        className={`text-center py-1.5 px-2 rounded ${getCellColor(count, maxCount)}`}
                      >
                        {count}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
