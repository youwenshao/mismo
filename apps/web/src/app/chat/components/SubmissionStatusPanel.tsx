"use client";

import { useRef, useEffect } from "react";

interface SubmissionStatusPanelProps {
  statusMessage: string;
  streamOutput: string;
}

export function SubmissionStatusPanel({
  statusMessage,
  streamOutput,
}: SubmissionStatusPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamOutput]);

  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl">
        <span className="shrink-0 w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
        <p className="text-sm font-medium text-gray-700">{statusMessage}</p>
      </div>

      {streamOutput && (
        <div className="relative h-32 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-white via-white/50 to-transparent" />
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto px-4 py-3"
          >
            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-300 font-mono">
              {streamOutput}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
