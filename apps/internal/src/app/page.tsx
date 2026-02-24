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
  Critical:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const statusConfig: Record<ReviewStatus, string> = {
  Pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "In Review":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const reviewTypeConfig: Record<ReviewType, string> = {
  Spec: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Code: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Security:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

function getSlaColor(deadline: string): string {
  const hours = getHoursUntilDeadline(deadline);
  if (hours < 0) return "text-red-600 dark:text-red-400";
  if (hours < 1) return "text-red-600 dark:text-red-400";
  if (hours < 4) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Review Queue
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Projects awaiting human review
        </p>
      </div>

      {/* Review table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Project
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Client
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Type
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Priority
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  SLA Deadline
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {task.projectName}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {task.client}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${reviewTypeConfig[task.reviewType]}`}
                    >
                      {task.reviewType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityConfig[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${getSlaColor(task.slaDeadline)}`}
                    >
                      {formatDeadlineCountdown(task.slaDeadline)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[task.status]}`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.status === "Pending" ? (
                      <button
                        onClick={() => handleClaim(task.id)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                      >
                        Claim
                      </button>
                    ) : task.status === "In Review" ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.assignee}
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Done
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium">
          <span className="text-amber-600 dark:text-amber-400">{pending}</span>{" "}
          pending
        </span>
        <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
        <span className="font-medium">
          <span className="text-blue-600 dark:text-blue-400">{inReview}</span>{" "}
          in review
        </span>
        <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
        <span className="font-medium">
          <span className="text-green-600 dark:text-green-400">
            {completed}
          </span>{" "}
          completed today
        </span>
      </div>
    </div>
  );
}
