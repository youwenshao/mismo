"use client";

interface SubmissionStatusPanelProps {
  statusMessage: string;
  streamOutput: string;
}

export function SubmissionStatusPanel({
  statusMessage,
  streamOutput,
}: SubmissionStatusPanelProps) {
  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-700">{statusMessage}</p>
      <div className="relative mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
        <div className="max-h-28 overflow-y-auto pr-1">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-500">
            {streamOutput || "I'm preparing your project plan..."}
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-transparent to-gray-50" />
      </div>
    </div>
  );
}
