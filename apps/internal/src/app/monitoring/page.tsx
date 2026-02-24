import { mockActivityFeed, mockProjects } from "@/lib/mock-data";

const activityDotColor: Record<string, string> = {
  info: "bg-blue-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MonitoringPage() {
  const activeCount = mockProjects.filter(
    (p) => p.status !== "Completed" && p.status !== "Discovery",
  ).length;

  const metrics = [
    { label: "Active Projects", value: String(activeCount) },
    { label: "Avg Completion Time", value: "6.2 days" },
    { label: "Token Costs (MTD)", value: "$1,247.30" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Monitoring
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          System health and metrics
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {m.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {m.value}
            </p>
          </div>
        ))}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Pipeline Health
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-3xl font-bold text-green-600 dark:text-green-400">
              Healthy
            </span>
          </div>
        </div>
      </div>

      {/* Token usage overview */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Token Usage by Project
        </h2>
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {mockProjects
            .filter((p) => p.tokensUsed > 0)
            .sort((a, b) => b.tokensUsed - a.tokensUsed)
            .slice(0, 5)
            .map((project) => {
              const pct = Math.round(
                (project.tokensUsed / project.tokenBudget) * 100,
              );
              const barColor =
                pct > 85
                  ? "bg-red-500"
                  : pct > 60
                    ? "bg-yellow-500"
                    : "bg-indigo-500";

              return (
                <div key={project.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {project.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {project.tokensUsed.toLocaleString()} /{" "}
                      {project.tokenBudget.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recent Activity
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {mockActivityFeed.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 px-5 py-3.5"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activityDotColor[item.type]}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {item.message}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {formatTimestamp(item.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
