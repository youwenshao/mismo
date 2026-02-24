import { mockActivityFeed, mockProjects } from "@/lib/mock-data";

const activityDotColor: Record<string, string> = {
  info: "bg-[var(--dash-info)]",
  success: "bg-[var(--dash-complete)]",
  warning: "bg-[var(--dash-warning)]",
  error: "bg-[var(--dash-critical)]",
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-12">
        <h1 className="font-[var(--font-serif)] text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
          Monitoring
        </h1>
        <p className="mt-8 text-sm text-[var(--text-secondary)]">
          System health and metrics
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {m.label}
            </p>
            <p className="mt-4 font-[var(--font-serif)] text-3xl font-bold text-[var(--text-primary)]">
              {m.value}
            </p>
          </div>
        ))}

        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Pipeline Health
          </p>
          <div className="mt-4 flex items-center gap-6">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--dash-complete)]" />
            <span className="font-[var(--font-serif)] text-3xl font-bold text-[var(--text-primary)]">
              Healthy
            </span>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="mb-8 font-[var(--font-sans)] text-lg font-semibold text-[var(--text-primary)]">
          Token Usage by Project
        </h2>
        <div className="space-y-8">
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
                  ? "bg-[var(--dash-critical)]"
                  : pct > 60
                    ? "bg-[var(--dash-warning)]"
                    : "bg-[var(--accent)]";

              return (
                <div key={project.id}>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--text-primary)]">
                      {project.name}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {project.tokensUsed.toLocaleString()} /{" "}
                      {project.tokenBudget.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
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

      <div className="mt-16">
        <h2 className="mb-8 font-[var(--font-sans)] text-lg font-semibold text-[var(--text-primary)]">
          Recent Activity
        </h2>
        <div>
          {mockActivityFeed.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-5 py-8"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activityDotColor[item.type]}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--text-primary)]">
                  {item.message}
                </p>
                <p className="mt-3 text-xs text-[var(--text-secondary)]">
                  {formatTimestamp(item.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
