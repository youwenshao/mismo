"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getProjectById,
  getBuildLogsForProject,
  type Project,
  type ProjectTier,
  type ProjectStatus,
} from "@/lib/mock-data";

const tierBadge: Record<ProjectTier, string> = {
  Starter: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Pro: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Enterprise:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const statusBadge: Record<ProjectStatus, string> = {
  Discovery: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
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

const logStatusConfig = {
  success: {
    dot: "bg-green-500",
    text: "text-green-700 dark:text-green-400",
    label: "Success",
  },
  error: {
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    label: "Error",
  },
  warning: {
    dot: "bg-yellow-500",
    text: "text-yellow-700 dark:text-yellow-400",
    label: "Warning",
  },
  info: {
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    label: "Info",
  },
};

type Tab = "overview" | "prd" | "logs" | "tokens";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "prd", label: "PRD" },
  { id: "logs", label: "Build Logs" },
  { id: "tokens", label: "Token Usage" },
];

function safetyColor(score: number): string {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 80) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function safetyBg(score: number): string {
  if (score >= 90) return "bg-green-500";
  if (score >= 80) return "bg-yellow-500";
  return "bg-red-500";
}

function OverviewTab({ project }: { project: Project }) {
  const infoRows = [
    { label: "Client", value: project.client },
    {
      label: "Tier",
      badge: (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierBadge[project.tier]}`}
        >
          {project.tier}
        </span>
      ),
    },
    {
      label: "Status",
      badge: (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[project.status]}`}
        >
          {project.status}
        </span>
      ),
    },
    {
      label: "Created",
      value: new Date(project.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
          Project Information
        </h3>
        <dl className="space-y-3">
          {infoRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                {row.label}
              </dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {row.badge ?? row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Safety Score */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
          Safety Score
        </h3>
        <div className="flex items-center gap-4">
          <div
            className={`text-4xl font-bold ${safetyColor(project.safetyScore)}`}
          >
            {project.safetyScore}%
          </div>
          <div className="flex-1">
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full ${safetyBg(project.safetyScore)} transition-all`}
                style={{ width: `${project.safetyScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          Description
        </h3>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {project.description}
        </p>
      </div>
    </div>
  );
}

function PrdTab({ project }: { project: Project }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Product Requirements Document
      </h3>
      <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
        <h4>1. Overview</h4>
        <p>{project.description}</p>

        <h4>2. Goals</h4>
        <ul>
          <li>
            Deliver a production-ready {project.name.toLowerCase()} application
          </li>
          <li>
            Meet {project.tier} tier quality and performance requirements
          </li>
          <li>Maintain safety score above 85% throughout development</li>
          <li>Complete within allocated token budget</li>
        </ul>

        <h4>3. Target Users</h4>
        <p>
          Primary users are {project.client}&apos;s customer base. The
          application must support modern browsers and mobile-responsive layouts.
        </p>

        <h4>4. Technical Requirements</h4>
        <ul>
          <li>Next.js application with App Router</li>
          <li>TypeScript with strict mode</li>
          <li>Supabase for authentication and database</li>
          <li>Responsive design with Tailwind CSS</li>
        </ul>
      </div>
    </div>
  );
}

function BuildLogsTab({ projectId }: { projectId: string }) {
  const logs = getBuildLogsForProject(projectId);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-12 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No build logs available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {logs.map((log) => {
          const cfg = logStatusConfig[log.status];
          return (
            <li key={log.id} className="flex items-start gap-3 px-5 py-3.5">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {log.message}
                  </p>
                  <span
                    className={`shrink-0 text-xs font-medium ${cfg.text}`}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {new Date(log.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TokenUsageTab({ project }: { project: Project }) {
  const pct = Math.round((project.tokensUsed / project.tokenBudget) * 100);
  const barColor =
    pct > 85 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-indigo-500";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        Token Consumption
      </h3>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {project.tokensUsed.toLocaleString()}
          </span>
          <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
            / {project.tokenBudget.toLocaleString()} tokens
          </span>
        </div>
        <span
          className={`text-sm font-bold ${
            pct > 85
              ? "text-red-600 dark:text-red-400"
              : pct > 60
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-indigo-600 dark:text-indigo-400"
          }`}
        >
          {pct}%
        </span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Used</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {project.tokensUsed.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {(project.tokenBudget - project.tokensUsed).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Est. Cost
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            ${((project.tokensUsed / 1000) * 0.03).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const project = getProjectById(params.id as string);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Project not found
        </h2>
        <Link
          href="/projects"
          className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          &larr; Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Projects
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {project.name}
          </h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tierBadge[project.tier]}`}
          >
            {project.tier}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[project.status]}`}
          >
            {project.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {project.client}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab project={project} />}
      {activeTab === "prd" && <PrdTab project={project} />}
      {activeTab === "logs" && <BuildLogsTab projectId={project.id} />}
      {activeTab === "tokens" && <TokenUsageTab project={project} />}
    </div>
  );
}
