"use client";

import { useState } from "react";

const stages = [
  {
    name: "Discovery",
    description: "Interview completed",
    date: "Feb 10, 2026",
    status: "completed" as const,
  },
  {
    name: "Spec Review",
    description: "PRD under review",
    date: "Feb 12, 2026",
    status: "completed" as const,
  },
  {
    name: "Contracted",
    description: "Payment received",
    date: "Feb 14, 2026",
    status: "completed" as const,
  },
  {
    name: "Development",
    description: "AI agents building your app",
    date: "~Feb 18, 2026",
    status: "current" as const,
  },
  {
    name: "Verification",
    description: "Automated testing & human review",
    date: "~Feb 22, 2026",
    status: "pending" as const,
  },
  {
    name: "Client Review",
    description: "Your 3-day review window",
    date: "~Feb 25, 2026",
    status: "pending" as const,
  },
  {
    name: "Delivered",
    description: "Repository transferred",
    date: "~Feb 28, 2026",
    status: "pending" as const,
  },
];

type StageStatus = (typeof stages)[number]["status"];

function connectorColor(targetStatus: StageStatus) {
  return targetStatus === "completed" || targetStatus === "current"
    ? "bg-green-500 dark:bg-green-400"
    : "bg-gray-200 dark:bg-gray-700";
}

function labelColor(status: StageStatus) {
  if (status === "completed") return "text-green-700 dark:text-green-400";
  if (status === "current") return "text-indigo-700 dark:text-indigo-400";
  return "text-gray-400 dark:text-gray-500";
}

function circleClasses(status: StageStatus) {
  if (status === "completed")
    return "border-green-500 bg-green-500 dark:border-green-400 dark:bg-green-400";
  if (status === "current")
    return "border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400";
  return "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900";
}

function StageIndicator({
  status,
  size,
}: {
  status: StageStatus;
  size: "sm" | "md";
}) {
  const dim = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const dot = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  const check = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const pulse = size === "md" ? "-inset-1.5" : "-inset-1";

  return (
    <div className="relative flex items-center justify-center">
      {status === "current" && (
        <span
          className={`absolute ${pulse} animate-pulse rounded-full bg-indigo-500/20 dark:bg-indigo-400/20`}
        />
      )}
      <div
        className={`relative z-10 flex ${dim} shrink-0 items-center justify-center rounded-full border-2 transition-colors ${circleClasses(status)}`}
      >
        {status === "completed" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`${check} text-white`}
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
        ) : status === "current" ? (
          <div className={`${dot} rounded-full bg-white`} />
        ) : (
          <div className={`${dot} rounded-full bg-gray-300 dark:bg-gray-600`} />
        )}
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [revisionNotes, setRevisionNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmitRevision() {
    if (!revisionNotes.trim()) return;
    setSubmitted(true);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Project Status
      </h1>
      <p className="mb-10 text-sm text-gray-500 dark:text-gray-400">
        Track your project through each stage of the development pipeline.
      </p>

      {/* ── Desktop horizontal timeline ── */}
      <div className="hidden lg:block">
        <div className="flex items-start">
          {stages.map((stage, i) => (
            <div
              key={stage.name}
              className="flex flex-1 flex-col items-center"
            >
              <div className="flex w-full items-center">
                {i > 0 ? (
                  <div
                    className={`h-0.5 flex-1 ${connectorColor(stage.status)}`}
                  />
                ) : (
                  <div className="flex-1" />
                )}

                <StageIndicator status={stage.status} size="md" />

                {i < stages.length - 1 ? (
                  <div
                    className={`h-0.5 flex-1 ${connectorColor(stages[i + 1]!.status)}`}
                  />
                ) : (
                  <div className="flex-1" />
                )}
              </div>

              <div className="mt-3 flex flex-col items-center gap-0.5 px-1">
                <p
                  className={`text-center text-sm font-medium ${labelColor(stage.status)}`}
                >
                  {stage.name}
                </p>
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  {stage.description}
                </p>
                <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                  {stage.date}
                </p>
                {stage.status === "current" && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-950/50 dark:text-indigo-400 dark:ring-indigo-400/20">
                    In Progress
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile / tablet vertical timeline ── */}
      <div className="lg:hidden">
        {stages.map((stage, i) => (
          <div key={stage.name} className="flex gap-4">
            <div className="flex flex-col items-center">
              <StageIndicator status={stage.status} size="sm" />
              {i < stages.length - 1 && (
                <div
                  className={`w-0.5 flex-1 ${connectorColor(stages[i + 1]!.status)}`}
                />
              )}
            </div>

            <div className="pb-8">
              <p
                className={`text-sm font-medium ${labelColor(stage.status)}`}
              >
                {stage.name}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {stage.description}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {stage.date}
              </p>
              {stage.status === "current" && (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-950/50 dark:text-indigo-400 dark:ring-indigo-400/20">
                  In Progress
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Live Preview ── */}
      <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Live Preview
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Preview updates automatically as development progresses.
        </p>

        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center dark:border-white/5 dark:bg-gray-800/50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </div>
          <code className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
            https://taskflow-preview.vercel.app
          </code>
          <a
            href="#"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Open Preview
          </a>
        </div>
      </div>

      {/* ── Request Changes ── */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Request Changes
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          You have{" "}
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            2 free revision cycles
          </span>{" "}
          remaining.
        </p>

        {submitted ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-500/30 dark:bg-green-950/20">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 text-green-600 dark:text-green-400"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Revision request submitted successfully
              </p>
            </div>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              We&apos;ll review your notes and incorporate the changes.
              You&apos;ll be notified when the updated preview is ready.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Describe the changes you'd like…"
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
            />
            <button
              onClick={handleSubmitRevision}
              disabled={!revisionNotes.trim()}
              className="mt-3 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit Revision Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
