'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { timeAgo } from '@/lib/format'

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

const SKIP_DELETE_CONFIRM_KEY = 'skipDeleteConfirm'

type Session = {
  id: string
  startedAt: Date | string
}

export function ActiveSessionsList({ sessions }: { sessions: Session[] }) {
  const router = useRouter()
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [dontRemind, setDontRemind] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  function handleTrashClick(e: React.MouseEvent, sessionId: string) {
    e.preventDefault()
    e.stopPropagation()
    if (typeof window !== 'undefined' && localStorage.getItem(SKIP_DELETE_CONFIRM_KEY) === 'true') {
      performDelete(sessionId)
      return
    }
    setSessionToDelete(sessionId)
    setDontRemind(false)
  }

  async function performDelete(sessionId: string) {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/interview/session/${sessionId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setSessionToDelete(null)
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  function handleConfirm() {
    if (!sessionToDelete) return
    if (dontRemind && typeof window !== 'undefined') {
      localStorage.setItem(SKIP_DELETE_CONFIRM_KEY, 'true')
    }
    performDelete(sessionToDelete)
  }

  function handleCancel() {
    setSessionToDelete(null)
    setDontRemind(false)
  }

  const startedAt = (s: Session) =>
    typeof s.startedAt === 'string' ? new Date(s.startedAt) : s.startedAt

  return (
    <>
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="group relative block border border-gray-100 rounded-xl px-4 py-4 transition-colors hover:bg-gray-50"
          >
            <Link
              href={`/chat?session=${session.id}`}
              className="flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">Chat with Mo</p>
                <p className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                  In progress
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Started {timeAgo(startedAt(session))}</span>
                <button
                  type="button"
                  aria-label="Delete chat"
                  onClick={(e) => handleTrashClick(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {sessionToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 id="delete-modal-title" className="text-lg font-semibold text-gray-900">
              Delete this chat?
            </h2>
            <p className="mt-2 text-sm text-gray-500">This action cannot be undone.</p>
            <label className="mt-4 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={dontRemind}
                onChange={(e) => setDontRemind(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-gray-500"
              />
              <span className="text-sm text-gray-600">Do not remind me again</span>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isDeleting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'I understand'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
