import Link from "next/link";

const MOCK_PROJECT = {
  name: "TaskFlow",
  tier: "Verified",
  safetyScore: 94,
  estimatedCompletion: "Feb 28, 2026",
};

const RECENT_ACTIVITY = [
  {
    id: 1,
    action: "Preview deployed",
    detail:
      "First preview build is now live at taskflow-preview.vercel.app",
    time: "6 hours ago",
    icon: "deploy",
  },
  {
    id: 2,
    action: "Development started",
    detail: "AI agents have begun building your application.",
    time: "1 day ago",
    icon: "code",
  },
  {
    id: 3,
    action: "Payment confirmed",
    detail: "Verified tier payment of $8,000 received.",
    time: "3 days ago",
    icon: "payment",
  },
  {
    id: 4,
    action: "PRD approved",
    detail: "Your product requirements document has been finalized.",
    time: "5 days ago",
    icon: "document",
  },
];

const ICON_PATHS: Record<string, string> = {
  document:
    "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  payment:
    "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z",
  code: "M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5",
  deploy:
    "M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
};

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <div className="mb-12">
        <h1 className="font-[var(--font-serif)] text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
          Project Overview
        </h1>
        <p className="mt-8 text-sm leading-relaxed text-[var(--text-secondary)]">
          {MOCK_PROJECT.name} — your project at a glance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
        <StatCard label="Tier" value={MOCK_PROJECT.tier} />
        <StatCard
          label="Safety Score"
          value={`${MOCK_PROJECT.safetyScore}/100`}
        />
        <StatCard
          label="Est. Completion"
          value={MOCK_PROJECT.estimatedCompletion}
        />
      </div>

      {/* Quick Links */}
      <section className="mt-16">
        <h2 className="font-[var(--font-serif)] text-lg font-semibold text-[var(--text-primary)]">
          Quick Links
        </h2>
        <div className="mt-10">
          <QuickLink
            href={`/project/${id}/prd`}
            label="Product Requirements"
            description="View and review your PRD"
          />
          <QuickLink
            href={`/project/${id}/status`}
            label="Development Status"
            description="Track build progress"
          />
          <QuickLink
            href={`/project/${id}/checkout?tier=VERIFIED`}
            label="Billing"
            description="View payment details"
          />
        </div>
      </section>

      {/* Recent Activity */}
      <section className="mt-16">
        <h2 className="font-[var(--font-serif)] text-lg font-semibold text-[var(--text-primary)]">
          Recent Activity
        </h2>
        <div className="mt-10">
          {RECENT_ACTIVITY.map((item, i) => {
            const iconPath = ICON_PATHS[item.icon] ?? ICON_PATHS.document!;
            const isFirst = i === 0;
            return (
              <div
                key={item.id}
                className="flex items-start gap-6 py-8"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`mt-0.5 h-5 w-5 shrink-0 ${isFirst ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={iconPath}
                  />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {item.action}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {item.detail}
                  </p>
                </div>
                <span className="shrink-0 pt-0.5 text-xs text-[var(--text-secondary)]">
                  {item.time}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group block py-8"
    >
      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
        {label}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        {description}
      </p>
    </Link>
  );
}
