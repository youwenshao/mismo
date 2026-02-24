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

const ICON_PATHS: Record<string, { bg: string; text: string; d: string }> = {
  document: {
    bg: "bg-indigo-100 dark:bg-indigo-900/40",
    text: "text-indigo-600 dark:text-indigo-400",
    d: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  },
  payment: {
    bg: "bg-green-100 dark:bg-green-900/40",
    text: "text-green-600 dark:text-green-400",
    d: "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z",
  },
  code: {
    bg: "bg-violet-100 dark:bg-violet-900/40",
    text: "text-violet-600 dark:text-violet-400",
    d: "M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5",
  },
  deploy: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-600 dark:text-blue-400",
    d: "M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
  },
};

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Project Overview
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {MOCK_PROJECT.name} — your project at a glance.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Tier" value={MOCK_PROJECT.tier} accent="indigo" />
        <StatCard
          label="Safety Score"
          value={`${MOCK_PROJECT.safetyScore}/100`}
          accent="green"
        />
        <StatCard
          label="Est. Completion"
          value={MOCK_PROJECT.estimatedCompletion}
          accent="violet"
        />
      </div>

      {/* ── Quick Links ── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Quick Links
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      {/* ── Recent Activity ── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h2>
        <div className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-white/5 dark:border-white/10 dark:bg-gray-900">
          {RECENT_ACTIVITY.map((item) => {
            const icon = ICON_PATHS[item.icon] ?? ICON_PATHS.document!;
            return (
              <div key={item.id} className="flex items-start gap-4 p-4">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${icon.bg}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className={`h-4 w-4 ${icon.text}`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={icon.d}
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.action}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {item.detail}
                  </p>
                </div>
                <span className="shrink-0 pt-0.5 text-xs text-gray-400 dark:text-gray-500">
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

/* ── Helpers ── */

const ACCENT_COLORS = {
  indigo:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/30 dark:text-indigo-400 dark:ring-indigo-400/20",
  green:
    "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/30 dark:text-green-400 dark:ring-green-400/20",
  violet:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/30 dark:text-violet-400 dark:ring-violet-400/20",
} as const;

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: keyof typeof ACCENT_COLORS;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${ACCENT_COLORS[accent]}`}
        >
          {value}
        </span>
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
      className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-white/10 dark:bg-gray-900 dark:hover:border-indigo-500/40"
    >
      <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </Link>
  );
}
