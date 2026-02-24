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
        <div className="mb-8 flex items-start gap-4 border-l-2 border-amber-500 bg-amber-50 p-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Some requirements need clarification
            </p>
            <p className="mt-3 text-sm leading-relaxed text-amber-700">
              Ambiguity score is {prd.ambiguityScore}%. A project manager will
              reach out to resolve open questions before development begins.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-6">
          <h1 className="font-[var(--font-serif)] text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
            {prd.projectName}
          </h1>
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            v{prd.version}
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          Product Requirements Document &middot; Last updated{" "}
          {prd.lastUpdated}
        </p>
      </div>

      {/* Sections */}
      <div>
        {prd.sections.map((section) => {
          const isTBD = sectionHasTBD(section.id);
          const isCommentOpen = activeSectionId === section.id;
          const unresolvedCount = commentCount(section.id);

          return (
            <section
              key={section.id}
              id={section.id}
              className={`mb-24 ${
                isTBD ? "bg-amber-50" : ""
              }`}
            >
              {/* Section header with comment button */}
              <div className="mb-8 flex items-start justify-between">
                <h2 className="font-[var(--font-serif)] text-lg font-semibold text-[var(--text-primary)]">
                  {section.title}
                  {isTBD && (
                    <span className="ml-2 text-xs font-medium text-amber-700">
                      Needs clarification
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => toggleCommentPanel(section.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                    isCommentOpen
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--accent)]"
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
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
                      {unresolvedCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Section content */}
              <div className="text-sm leading-relaxed text-[var(--text-primary)]">
                <SectionContent section={section} prd={prd} />
              </div>

              {/* Comment panel */}
              {isCommentOpen && (
                <div className="mt-12 border-t border-[var(--border)] pt-8">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                    Comments
                  </h3>

                  {(comments[section.id] ?? []).length === 0 && (
                    <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                      No comments yet. Be the first to add one.
                    </p>
                  )}

                  <div className="space-y-8">
                    {(comments[section.id] ?? []).map((comment) => (
                      <div
                        key={comment.id}
                        className={`py-6 ${
                          comment.resolved ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                              {comment.author[0]}
                            </span>
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {comment.author}
                            </span>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {formatTimestamp(comment.timestamp)}
                            </span>
                          </div>
                          {!comment.resolved && (
                            <button
                              onClick={() =>
                                resolveComment(section.id, comment.id)
                              }
                              className="text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-green-700"
                            >
                              Resolve
                            </button>
                          )}
                          {comment.resolved && (
                            <span className="text-xs font-medium text-green-600">
                              Resolved
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Add comment input */}
                  <div className="mt-6 flex gap-6">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addComment(section.id);
                      }}
                      placeholder="Add a comment..."
                      className="flex-1 rounded-[2px] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none transition-colors focus:border-[var(--accent)]"
                    />
                    <button
                      onClick={() => addComment(section.id)}
                      disabled={!newComment.trim()}
                      className="rounded-[4px] bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
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
      <div className="mt-12 pb-12">
        <button
          disabled={ambiguityHigh}
          className={`rounded-[4px] px-8 py-3.5 text-base font-semibold transition-colors ${
            ambiguityHigh
              ? "cursor-not-allowed bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          }`}
        >
          Approve PRD &amp; Continue
        </button>
        {ambiguityHigh && (
          <p className="mt-6 text-sm leading-relaxed text-[var(--text-secondary)]">
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
    "must-have": "text-[var(--accent)] font-medium",
    "should-have": "text-[var(--text-primary)] font-medium",
    "nice-to-have": "text-[var(--text-secondary)]",
  };
  return (
    <span className={`text-xs ${styles[priority]}`}>{priority}</span>
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
            className="bg-amber-200 px-1 font-semibold text-amber-900"
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
        <div className="space-y-8">
          <div>
            <h3 className="mb-6 font-[var(--font-sans)] text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              Description
            </h3>
            <p className="leading-relaxed">
              <HighlightTBD text={prd.overview.description} />
            </p>
          </div>
          <div>
            <h3 className="mb-6 font-[var(--font-sans)] text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
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
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {prd.targetUsers.personas.map((persona) => (
            <div
              key={persona.name}
            >
              <h3 className="font-[var(--font-sans)] text-sm font-semibold text-[var(--text-primary)]">
                {persona.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                <HighlightTBD text={persona.description} />
              </p>
            </div>
          ))}
        </div>
      );

    case "features":
      return (
        <div className="space-y-8">
          {prd.features.map((feature) => (
            <div
              key={feature.name}
              className="pb-8"
            >
              <div className="flex items-center gap-4">
                <h3 className="font-[var(--font-sans)] text-sm font-semibold text-[var(--text-primary)]">
                  {feature.name}
                </h3>
                <PriorityBadge priority={feature.priority} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                <HighlightTBD text={feature.description} />
              </p>
            </div>
          ))}
        </div>
      );

    case "user-stories":
      return (
        <div className="space-y-8">
          {prd.userStories.map((story) => (
            <div key={story.title}>
              <h3 className="mb-6 font-[var(--font-sans)] text-sm font-semibold text-[var(--text-primary)]">
                {story.title}
              </h3>
              <pre className="overflow-x-auto rounded-[4px] bg-[var(--code-bg)] p-6 font-[var(--font-mono)] text-sm leading-relaxed text-[var(--text-primary)]">
                <code>
                  <span className="text-emerald-700">Given </span>
                  <HighlightTBD text={story.given} />
                  {"\n"}
                  <span className="text-sky-700">When </span>
                  <HighlightTBD text={story.when} />
                  {"\n"}
                  <span className="text-amber-700">Then </span>
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
          <div className="mb-6 flex items-center gap-4">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Mermaid.js
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              Diagram rendering coming soon
            </span>
          </div>
          <pre className="overflow-x-auto rounded-[4px] bg-[var(--code-bg)] p-6 font-[var(--font-mono)] text-sm leading-relaxed text-[var(--text-primary)]">
            <code>{prd.dataModel}</code>
          </pre>
        </div>
      );

    case "api":
      return prd.apiSpec ? (
        <pre className="overflow-x-auto rounded-[4px] bg-[var(--code-bg)] p-6 font-[var(--font-mono)] text-sm leading-relaxed text-[var(--text-primary)]">
          <code>{JSON.stringify(prd.apiSpec, null, 2)}</code>
        </pre>
      ) : (
        <p className="text-sm italic leading-relaxed text-[var(--text-secondary)]">
          No API specification provided yet.
        </p>
      );

    case "architecture":
      return (
        <div className="space-y-6">
          <span className="text-sm font-semibold text-[var(--accent)]">
            {prd.architecture.template}
          </span>
          <p className="leading-relaxed">
            <HighlightTBD text={prd.architecture.description} />
          </p>
        </div>
      );

    default:
      return null;
  }
}
