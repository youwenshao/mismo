"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  mockProjects,
  type Project,
  type ProjectStatus,
  type ProjectTier,
} from "@/lib/mock-data";

type Filter = "All" | "Active" | "Completed";

const tierStyle: Record<ProjectTier, string> = {
  Starter: "text-[var(--text-secondary)]",
  Pro: "text-[var(--text-primary)] font-medium",
  Enterprise: "text-[var(--accent)] font-medium",
};

const statusStyle: Record<ProjectStatus, string> = {
  Discovery: "text-[var(--dash-pending)]",
  "Spec Review": "text-[var(--dash-active)]",
  Development: "text-[var(--dash-active)]",
  "Code Review": "text-[var(--dash-warning)]",
  Testing: "text-[var(--dash-warning)]",
  Completed: "text-[var(--dash-complete)]",
};

function safetyColor(score: number): string {
  if (score >= 90) return "text-[var(--text-primary)]";
  if (score >= 80) return "text-[var(--dash-warning)]";
  return "text-[var(--dash-active)]";
}

function isActive(p: Project): boolean {
  return p.status !== "Completed" && p.status !== "Discovery";
}

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = mockProjects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase());

    if (filter === "Active") return matchesSearch && isActive(p);
    if (filter === "Completed")
      return matchesSearch && p.status === "Completed";
    return matchesSearch;
  });

  const filters: Filter[] = ["All", "Active", "Completed"];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-12">
        <h1 className="font-[var(--font-serif)] text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
          Projects
        </h1>
        <p className="mt-8 text-sm text-[var(--text-secondary)]">
          All client projects
        </p>
      </div>

      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[2px] border border-[var(--border)] bg-[var(--bg-primary)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-[4px] px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <p className="text-sm text-[var(--text-secondary)]">
            No projects match your search.
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group flex items-center justify-between border-b border-[var(--border)] py-10 transition-colors hover:bg-[var(--bg-secondary)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                    {project.name}
                  </h3>
                  <span className={`text-xs ${tierStyle[project.tier]}`}>
                    {project.tier}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {project.client}
                </p>
                <p className="mt-2 line-clamp-1 text-xs text-[var(--text-secondary)]">
                  {project.description}
                </p>
              </div>

              <div className="ml-6 flex shrink-0 items-center gap-6">
                <span className={`text-xs ${statusStyle[project.status]}`}>
                  {project.status}
                </span>
                <span
                  className={`text-xs font-bold ${safetyColor(project.safetyScore)}`}
                >
                  {project.safetyScore}%
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {new Date(project.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
