"use client";

import { useState } from "react";
import {
  mockReviewTasks,
  getHoursUntilDeadline,
  formatDeadlineCountdown,
  type ReviewTask,
  type ReviewStatus,
  type ReviewType,
  type Priority,
} from "@/lib/mock-data";

const priorityConfig: Record<Priority, string> = {
  Critical: "text-[var(--dash-active)] font-semibold",
  High: "text-[var(--text-primary)] font-semibold",
  Medium: "text-[var(--text-secondary)] font-normal",
  Low: "text-[#A3A3A0] font-normal",
};

const statusConfig: Record<ReviewStatus, string> = {
  Pending: "text-[var(--dash-pending)] font-normal",
  "In Review": "text-[var(--dash-active)] font-medium",
  Completed: "text-[var(--dash-complete)] font-medium",
};

const reviewTypeConfig: Record<ReviewType, string> = {
  Spec: "text-[var(--text-secondary)] font-medium",
  Code: "text-[var(--text-primary)] font-medium",
  Security: "text-[var(--dash-active)] font-medium",
};

function getSlaColor(deadline: string): string {
  const hours = getHoursUntilDeadline(deadline);
  if (hours < 0) return "text-[var(--dash-critical)]";
  if (hours < 1) return "text-[var(--dash-critical)]";
  if (hours < 4) return "text-[var(--dash-warning)]";
  return "text-[var(--text-primary)]";
}

export default function ReviewQueuePage() {
  const [tasks, setTasks] = useState<ReviewTask[]>(() =>
    [...mockReviewTasks].sort(
      (a, b) =>
        new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime(),
    ),
  );

  const pending = tasks.filter((t) => t.status === "Pending").length;
  const inReview = tasks.filter((t) => t.status === "In Review").length;
  const completed = tasks.filter((t) => t.status === "Completed").length;

  function handleClaim(taskId: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: "In Review" as const, assignee: "You" }
          : t,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-12">
        <h1 className="font-[var(--font-serif)] text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
          Review Queue
        </h1>
        <p className="mt-8 text-sm text-[var(--text-secondary)]">
          Projects awaiting human review
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-6 py-6 text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                Project
              </th>
              <th className="px-6 py-6 text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                Client
              </th>
              <th className="px-6 py-6 text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                Type
              </th>
              <th className="px-6 py-6 text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                Priority
              </th>
              <th className="px-6 py-6 text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                SLA Deadline
              </th>
              <th className="px-6 py-6 text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                Status
              </th>
              <th className="px-6 py-6 text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-secondary)]"
              >
                <td className="px-6 py-6 font-medium text-[var(--text-primary)]">
                  {task.projectName}
                </td>
                <td className="px-6 py-6 text-[var(--text-secondary)]">
                  {task.client}
                </td>
                <td className="px-6 py-6">
                  <span className={`text-xs ${reviewTypeConfig[task.reviewType]}`}>
                    {task.reviewType}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <span className={`text-xs ${priorityConfig[task.priority]}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <span
                    className={`text-xs font-medium ${getSlaColor(task.slaDeadline)}`}
                  >
                    {formatDeadlineCountdown(task.slaDeadline)}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <span className={`text-xs ${statusConfig[task.status]}`}>
                    {task.status}
                  </span>
                </td>
                <td className="px-6 py-6">
                  {task.status === "Pending" ? (
                    <button
                      onClick={() => handleClaim(task.id)}
                      className="rounded-[4px] bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
                    >
                      Claim
                    </button>
                  ) : task.status === "In Review" ? (
                    <span className="text-xs text-[var(--text-secondary)]">
                      {task.assignee}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--dash-complete)] font-medium">
                      Done
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12 flex items-center justify-center gap-10 text-xs text-[var(--text-secondary)]">
        <span className="font-medium">
          <span className="text-[var(--dash-active)]">{pending}</span> pending
        </span>
        <span className="h-3 w-px bg-[var(--border)]" />
        <span className="font-medium">
          <span className="text-[var(--dash-active)]">{inReview}</span> in
          review
        </span>
        <span className="h-3 w-px bg-[var(--border)]" />
        <span className="font-medium">
          <span className="text-[var(--dash-complete)]">{completed}</span>{" "}
          completed today
        </span>
      </div>
    </div>
  );
}
