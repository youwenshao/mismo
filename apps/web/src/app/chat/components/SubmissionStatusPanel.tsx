'use client'

import { useRef, useEffect } from 'react'

interface SubmissionStatusPanelProps {
  statusMessage: string
  streamOutput: string
  isDone?: boolean
}

export function SubmissionStatusPanel({
  statusMessage,
  streamOutput,
  isDone,
}: SubmissionStatusPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamOutput])

  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl">
        <span
          className={`shrink-0 w-1.5 h-1.5 rounded-full ${isDone ? 'bg-green-400' : 'bg-gray-300 animate-pulse'}`}
        />
        <p className="text-xs font-mono text-gray-400">{statusMessage}</p>
      </div>

      {streamOutput && (
        <div className="relative h-32 overflow-hidden">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto px-4 py-3"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
            }}
          >
            <pre className="whitespace-pre-wrap text-[10px] leading-relaxed text-gray-200/80 font-mono">
              {streamOutput}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
