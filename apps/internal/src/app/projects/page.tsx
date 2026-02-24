"use client";

import { useState } from "react";
import Link from "next/link";
import {
  mockProjects,
  type Project,
  type ProjectStatus,
  type ProjectTier,
} from "@/lib/mock-data";

type Filter = "All" | "Active" | "Completed";

const tierBadge: Record<ProjectTier, string> = {
  Starter: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Pro: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Enterprise:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const statusBadge: Record<ProjectStatus, string> = {
  Discovery:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "Spec Review":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Development:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Code Review":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Testing:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function safetyColor(score: number): string {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 80) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Projects
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          All client projects
        </p>
      </div>

      {/* Search/filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Project grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-16 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No projects match your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
                    {project.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {project.client}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierBadge[project.tier]}`}
                >
                  {project.tier}
                </span>
              </div>

              <p className="mb-4 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                {project.description}
              </p>

              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[project.status]}`}
                >
                  {project.status}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold ${safetyColor(project.safetyScore)}`}
                  >
                    {project.safetyScore}%
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(project.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
