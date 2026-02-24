"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  getProjectById,
  getBuildLogsForProject,
  type Project,
  type ProjectTier,
  type ProjectStatus,
} from "@/lib/mock-data";

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

const logStatusConfig = {
  success: {
    dot: "bg-[var(--dash-complete)]",
    text: "text-[var(--dash-complete)]",
    label: "Success",
  },
  error: {
    dot: "bg-[var(--dash-critical)]",
    text: "text-[var(--dash-critical)]",
    label: "Error",
  },
  warning: {
    dot: "bg-[var(--dash-warning)]",
    text: "text-[var(--dash-warning)]",
    label: "Warning",
  },
  info: {
    dot: "bg-[var(--dash-info)]",
    text: "text-[var(--dash-info)]",
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
  if (score >= 90) return "text-[var(--text-primary)]";
  if (score >= 80) return "text-[var(--dash-warning)]";
  return "text-[var(--dash-active)]";
}

function OverviewTab({ project }: { project: Project }) {
  const infoRows = [
    { label: "Client", value: project.client },
    {
      label: "Tier",
      value: (
        <span className={`text-sm ${tierStyle[project.tier]}`}>
          {project.tier}
        </span>
      ),
    },
    {
      label: "Status",
      value: (
        <span className={`text-sm ${statusStyle[project.status]}`}>
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
    <div className="space-y-12">
      <div>
        <h3 className="mb-8 font-[var(--font-sans)] text-base font-semibold text-[var(--text-primary)]">
          Project Information
        </h3>
        <dl>
          {infoRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-[var(--border)] py-6"
            >
              <dt className="text-sm text-[var(--text-secondary)]">
                {row.label}
              </dt>
              <dd className="text-sm font-medium text-[var(--text-primary)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h3 className="mb-8 font-[var(--font-sans)] text-base font-semibold text-[var(--text-primary)]">
          Safety Score
        </h3>
        <div className="flex items-center gap-4">
          <div
            className={`font-[var(--font-serif)] text-4xl font-bold ${safetyColor(project.safetyScore)}`}
          >
            {project.safetyScore}%
          </div>
          <div className="flex-1">
            <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${project.safetyScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-8 font-[var(--font-sans)] text-base font-semibold text-[var(--text-primary)]">
          Description
        </h3>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {project.description}
        </p>
      </div>
    </div>
  );
}

function PrdTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <h3 className="font-[var(--font-sans)] text-lg font-semibold text-[var(--text-primary)]">
        Product Requirements Document
      </h3>
      <div className="space-y-6 text-sm leading-relaxed text-[var(--text-secondary)]">
        <div>
          <h4 className="mb-6 font-[var(--font-sans)] font-semibold text-[var(--text-primary)]">
            1. Overview
          </h4>
          <p>{project.description}</p>
        </div>

        <div>
          <h4 className="mb-6 font-[var(--font-sans)] font-semibold text-[var(--text-primary)]">
            2. Goals
          </h4>
            <ul className="list-disc space-y-6 pl-5">
            <li>
              Deliver a production-ready {project.name.toLowerCase()} application
            </li>
            <li>
              Meet {project.tier} tier quality and performance requirements
            </li>
            <li>Maintain safety score above 85% throughout development</li>
            <li>Complete within allocated token budget</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-6 font-[var(--font-sans)] font-semibold text-[var(--text-primary)]">
            3. Target Users
          </h4>
          <p>
            Primary users are {project.client}&apos;s customer base. The
            application must support modern browsers and mobile-responsive
            layouts.
          </p>
        </div>

        <div>
          <h4 className="mb-6 font-[var(--font-sans)] font-semibold text-[var(--text-primary)]">
            4. Technical Requirements
          </h4>
          <ul className="list-disc space-y-6 pl-5">
            <li>Next.js application with App Router</li>
            <li>TypeScript with strict mode</li>
            <li>Supabase for authentication and database</li>
            <li>Responsive design with Tailwind CSS</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function BuildLogsTab({ projectId }: { projectId: string }) {
  const logs = getBuildLogsForProject(projectId);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <p className="text-sm text-[var(--text-secondary)]">
          No build logs available yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      {logs.map((log) => {
        const cfg = logStatusConfig[log.status];
        return (
          <div
            key={log.id}
            className="flex items-start gap-5 border-b border-[var(--border)] py-6"
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-6">
                <p className="text-sm text-[var(--text-primary)]">
                  {log.message}
                </p>
                <span className={`shrink-0 text-xs font-medium ${cfg.text}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                {new Date(log.timestamp).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TokenUsageTab({ project }: { project: Project }) {
  const pct = Math.round((project.tokensUsed / project.tokenBudget) * 100);

  const barColor =
    pct > 85
      ? "bg-[var(--dash-critical)]"
      : pct > 60
        ? "bg-[var(--dash-warning)]"
        : "bg-[var(--accent)]";

  const pctColor =
    pct > 85
      ? "text-[var(--dash-critical)]"
      : pct > 60
        ? "text-[var(--dash-warning)]"
        : "text-[var(--accent)]";

  return (
    <div>
      <h3 className="mb-8 font-[var(--font-sans)] text-base font-semibold text-[var(--text-primary)]">
        Token Consumption
      </h3>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <span className="font-[var(--font-serif)] text-3xl font-bold text-[var(--text-primary)]">
            {project.tokensUsed.toLocaleString()}
          </span>
          <span className="ml-1 text-sm text-[var(--text-secondary)]">
            / {project.tokenBudget.toLocaleString()} tokens
          </span>
        </div>
        <span className={`text-sm font-bold ${pctColor}`}>{pct}%</span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="mt-8 grid grid-cols-3 gap-8 border-t border-[var(--border)] pt-8">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Used</p>
          <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
            {project.tokensUsed.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Remaining</p>
          <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
            {(project.tokenBudget - project.tokensUsed).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Est. Cost</p>
          <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
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
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Project not found
        </h2>
        <Link
          href="/projects"
          className="mt-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          &larr; Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-10">
        <Link
          href="/projects"
          className="mb-6 inline-flex items-center gap-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          Projects
        </Link>
        <div className="flex items-center gap-6">
          <h1 className="font-[var(--font-serif)] text-[1.75rem] font-semibold text-[var(--text-primary)]">
            {project.name}
          </h1>
          <span className={`text-xs ${tierStyle[project.tier]}`}>
            {project.tier}
          </span>
          <span className={`text-xs ${statusStyle[project.status]}`}>
            {project.status}
          </span>
        </div>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          {project.client}
        </p>
      </div>

      <div className="mb-8 border-b border-[var(--border)]">
        <nav className="-mb-px flex gap-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 pb-4 pt-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && <OverviewTab project={project} />}
      {activeTab === "prd" && <PrdTab project={project} />}
      {activeTab === "logs" && <BuildLogsTab projectId={project.id} />}
      {activeTab === "tokens" && <TokenUsageTab project={project} />}
    </div>
  );
}
