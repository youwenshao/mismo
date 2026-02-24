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
    <div className="min-h-screen bg-[var(--bg-primary)] font-[var(--font-sans)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="mx-auto flex h-20 max-w-5xl items-center gap-6 px-6">
          <Link
            href="/"
            className="font-[var(--font-serif)] text-lg font-bold tracking-[-0.03em] text-[var(--text-primary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Mismo
          </Link>
          <span className="text-[var(--border)]">/</span>
          <h1 className="font-[var(--font-sans)] text-sm font-semibold text-[var(--text-primary)]">
            {project.name}
          </h1>
          <StatusBadge status={project.status} />
        </div>

        <div className="mx-auto max-w-5xl px-6">
          <nav className="-mb-px flex gap-10" aria-label="Project tabs">
            {tabs.map((tab) => {
              const href = tab.segment
                ? `/project/${projectId}/${tab.segment}`
                : `/project/${projectId}`;
              const isActive = activeSegment === tab.segment;
              return (
                <Link
                  key={tab.label}
                  href={href}
                  className={`border-b-2 pb-6 pt-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "In Review"
      ? "text-[var(--accent)] font-medium"
      : status === "Approved"
        ? "text-[var(--text-primary)] font-medium"
        : "text-[var(--text-secondary)]";

  return <span className={`text-xs ${style}`}>{status}</span>;
}
