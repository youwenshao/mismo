"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const DEMO_PROJECTS: Record<string, { name: string; status: string }> = {
  "demo-taskflow": {
    name: "TaskFlow",
    status: "In Review",
  },
};

const tabs = [
  { label: "Overview", segment: "" },
  { label: "PRD", segment: "prd" },
  { label: "Status", segment: "status" },
  { label: "Settings", segment: "settings" },
] as const;

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const projectId = params.id;
  const project = DEMO_PROJECTS[projectId] ?? {
    name: "Unknown Project",
    status: "Unknown",
  };

  const basePath = `/project/${projectId}`;
  const subPath = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length).replace(/^\//, "")
    : "";
  const activeSegment = subPath.split("/")[0];

  return (
    <div className="min-h-screen bg-white font-sans dark:bg-gray-950">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
          >
            Mismo
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
            {project.name}
          </h1>
          <StatusBadge status={project.status} />
        </div>

        {/* Tab navigation */}
        <div className="mx-auto max-w-5xl px-6">
          <nav className="-mb-px flex gap-6" aria-label="Project tabs">
            {tabs.map((tab) => {
              const href = tab.segment
                ? `/project/${projectId}/${tab.segment}`
                : `/project/${projectId}`;
              const isActive = activeSegment === tab.segment;
              return (
                <Link
                  key={tab.label}
                  href={href}
                  className={`border-b-2 pb-3 pt-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "In Review"
      ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-400/20"
      : status === "Approved"
        ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-400/20"
        : "bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-400/20";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}
    >
      {status}
    </span>
  );
}
