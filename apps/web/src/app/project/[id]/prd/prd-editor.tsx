"use client";

import { useState } from "react";
import type { PRDData, Comment } from "./demo-data";

export default function PRDEditor({ prd }: { prd: PRDData }) {
  const [comments, setComments] = useState<Record<string, Comment[]>>(
    prd.comments,
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const ambiguityHigh = prd.ambiguityScore > 20;

  function hasTBD(text: string): boolean {
    return /\bTBD\b/i.test(text);
  }

  function sectionHasTBD(sectionId: string): boolean {
    switch (sectionId) {
      case "overview":
        return (
          hasTBD(prd.overview.description) ||
          hasTBD(prd.overview.problemStatement)
        );
      case "target-users":
        return prd.targetUsers.personas.some(
          (p) => hasTBD(p.name) || hasTBD(p.description),
        );
      case "features":
        return prd.features.some(
          (f) => hasTBD(f.name) || hasTBD(f.description),
        );
      case "user-stories":
        return prd.userStories.some(
          (s) =>
            hasTBD(s.title) ||
            hasTBD(s.given) ||
            hasTBD(s.when) ||
            hasTBD(s.then),
        );
      case "data-model":
        return hasTBD(prd.dataModel);
      case "api":
        return hasTBD(JSON.stringify(prd.apiSpec));
      case "architecture":
        return (
          hasTBD(prd.architecture.template) ||
          hasTBD(prd.architecture.description)
        );
      default:
        return false;
    }
  }

  function toggleCommentPanel(sectionId: string) {
    setActiveSectionId((prev) => (prev === sectionId ? null : sectionId));
    setNewComment("");
  }

  function addComment(sectionId: string) {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      author: "You",
      content: newComment.trim(),
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    setComments((prev) => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] ?? []), comment],
    }));
    setNewComment("");
  }

  function resolveComment(sectionId: string, commentId: string) {
    setComments((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).map((c) =>
        c.id === commentId ? { ...c, resolved: true } : c,
      ),
    }));
  }

  function commentCount(sectionId: string): number {
    return (comments[sectionId] ?? []).filter((c) => !c.resolved).length;
  }

  function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="relative">
      {/* Ambiguity warning banner */}
      {ambiguityHigh && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-950/30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Some requirements need clarification
            </p>
            <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
              Ambiguity score is {prd.ambiguityScore}%. A project manager will
              reach out to resolve open questions before development begins.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {prd.projectName}
          </h1>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            v{prd.version}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          Product Requirements Document &middot; Last updated{" "}
          {prd.lastUpdated}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {prd.sections.map((section) => {
          const isTBD = sectionHasTBD(section.id);
          const isCommentOpen = activeSectionId === section.id;
          const unresolvedCount = commentCount(section.id);

          return (
            <section
              key={section.id}
              id={section.id}
              className={`relative rounded-lg border p-6 transition-colors ${
                isTBD
                  ? "border-l-4 border-amber-300 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-950/20"
                  : "border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900/50"
              }`}
            >
              {/* Section header with comment button */}
              <div className="mb-4 flex items-start justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {section.title}
                  {isTBD && (
                    <span className="ml-2 inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                      Needs clarification
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => toggleCommentPanel(section.id)}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isCommentOpen
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  }`}
                  aria-label={`Comments for ${section.title}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                    />
                  </svg>
                  {unresolvedCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                      {unresolvedCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Section content */}
              <div className="prose-sm text-gray-700 dark:text-gray-300">
                <SectionContent section={section} prd={prd} />
              </div>

              {/* Comment panel */}
              {isCommentOpen && (
                <div className="mt-6 border-t border-gray-200 pt-5 dark:border-white/10">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                    Comments
                  </h3>

                  {(comments[section.id] ?? []).length === 0 && (
                    <p className="mb-4 text-sm text-gray-400 dark:text-gray-500">
                      No comments yet. Be the first to add one.
                    </p>
                  )}

                  <div className="space-y-3">
                    {(comments[section.id] ?? []).map((comment) => (
                      <div
                        key={comment.id}
                        className={`rounded-lg border p-3 ${
                          comment.resolved
                            ? "border-gray-100 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900"
                            : "border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                              {comment.author[0]}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {comment.author}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {formatTimestamp(comment.timestamp)}
                            </span>
                          </div>
                          {!comment.resolved && (
                            <button
                              onClick={() =>
                                resolveComment(section.id, comment.id)
                              }
                              className="rounded px-2 py-0.5 text-xs font-medium text-gray-400 transition-colors hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                            >
                              Resolve
                            </button>
                          )}
                          {comment.resolved && (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              Resolved
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Add comment input */}
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addComment(section.id);
                      }}
                      placeholder="Add a comment..."
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => addComment(section.id)}
                      disabled={!newComment.trim()}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Approve button */}
      <div className="mt-12 flex flex-col items-center pb-12">
        <button
          disabled={ambiguityHigh}
          className={`rounded-xl px-8 py-3.5 text-base font-semibold shadow-lg transition-all ${
            ambiguityHigh
              ? "cursor-not-allowed bg-gray-200 text-gray-400 shadow-none dark:bg-gray-800 dark:text-gray-500"
              : "bg-indigo-600 text-white shadow-indigo-500/25 hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]"
          }`}
        >
          Approve PRD &amp; Continue
        </button>
        {ambiguityHigh && (
          <p className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
            Resolve ambiguities before approving
          </p>
        )}
      </div>
    </div>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: "must-have" | "should-have" | "nice-to-have";
}) {
  const styles = {
    "must-have":
      "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-400/20",
    "should-have":
      "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-400/20",
    "nice-to-have":
      "bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-400/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}

function HighlightTBD({ text }: { text: string }) {
  if (!/\bTBD\b/.test(text)) {
    return <>{text}</>;
  }
  const parts = text.split(/(\bTBD\b)/g);
  return (
    <>
      {parts.map((part, i) =>
        part === "TBD" ? (
          <mark
            key={i}
            className="rounded bg-amber-200 px-1 font-semibold text-amber-900 dark:bg-amber-700/40 dark:text-amber-200"
          >
            TBD
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SectionContent({
  section,
  prd,
}: {
  section: { id: string; type: string };
  prd: PRDData;
}) {
  switch (section.type) {
    case "overview":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Description
            </h3>
            <p className="leading-relaxed">
              <HighlightTBD text={prd.overview.description} />
            </p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Problem Statement
            </h3>
            <p className="leading-relaxed">
              <HighlightTBD text={prd.overview.problemStatement} />
            </p>
          </div>
        </div>
      );

    case "target-users":
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prd.targetUsers.personas.map((persona) => (
            <div
              key={persona.name}
              className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-gray-800/30"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {persona.name}
              </h3>
              <p className="mt-1 text-sm leading-relaxed">
                <HighlightTBD text={persona.description} />
              </p>
            </div>
          ))}
        </div>
      );

    case "features":
      return (
        <div className="space-y-3">
          {prd.features.map((feature) => (
            <div
              key={feature.name}
              className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-gray-800/30"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {feature.name}
                  </h3>
                  <PriorityBadge priority={feature.priority} />
                </div>
                <p className="mt-1 text-sm leading-relaxed">
                  <HighlightTBD text={feature.description} />
                </p>
              </div>
            </div>
          ))}
        </div>
      );

    case "user-stories":
      return (
        <div className="space-y-4">
          {prd.userStories.map((story) => (
            <div key={story.title}>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                {story.title}
              </h3>
              <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-950 p-4 text-sm leading-relaxed text-gray-100 dark:border-white/10">
                <code>
                  <span className="text-emerald-400">Given </span>
                  <HighlightTBD text={story.given} />
                  {"\n"}
                  <span className="text-sky-400">When </span>
                  <HighlightTBD text={story.when} />
                  {"\n"}
                  <span className="text-amber-400">Then </span>
                  <HighlightTBD text={story.then} />
                </code>
              </pre>
            </div>
          ))}
        </div>
      );

    case "data-model":
      return (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              Mermaid.js
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Diagram rendering coming soon
            </span>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-950 p-4 text-sm leading-relaxed text-gray-100 dark:border-white/10">
            <code>{prd.dataModel}</code>
          </pre>
        </div>
      );

    case "api":
      return prd.apiSpec ? (
        <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-950 p-4 text-sm leading-relaxed text-gray-100 dark:border-white/10">
          <code>{JSON.stringify(prd.apiSpec, null, 2)}</code>
        </pre>
      ) : (
        <p className="text-sm italic text-gray-400 dark:text-gray-500">
          No API specification provided yet.
        </p>
      );

    case "architecture":
      return (
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-500/30 dark:bg-indigo-950/30">
            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
              {prd.architecture.template}
            </span>
          </div>
          <p className="leading-relaxed">
            <HighlightTBD text={prd.architecture.description} />
          </p>
        </div>
      );

    default:
      return null;
  }
}
