'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

type Tab = 'rating' | 'bug'

export default function FeedbackPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const commissionId = params.commissionId as string

  const initialRating = Number(searchParams.get('rating')) || 0
  const initialTab = (searchParams.get('tab') as Tab) ?? 'rating'

  const [tab, setTab] = useState<Tab>(initialTab)
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [bugTitle, setBugTitle] = useState('')
  const [bugDescription, setBugDescription] = useState('')
  const [bugSteps, setBugSteps] = useState('')
  const [bugSubmitted, setBugSubmitted] = useState(false)
  const [bugIssueUrl, setBugIssueUrl] = useState<string | null>(null)

  async function submitRating() {
    if (!rating) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionId, rating, comment }),
      })
      if (!res.ok) throw new Error('Failed to submit feedback')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitBug() {
    if (!bugTitle || !bugDescription) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/feedback/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionId,
          title: bugTitle,
          description: bugDescription,
          stepsToReproduce: bugSteps,
        }),
      })
      if (!res.ok) throw new Error('Failed to submit bug report')
      const data = await res.json()
      setBugIssueUrl(data.issueUrl)
      setBugSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">
            {rating >= 7 ? '🎉' : '🙏'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
          <p className="text-gray-600">
            {rating >= 7
              ? 'We\'re glad you had a great experience.'
              : 'We\'re sorry it wasn\'t perfect. Our team will reach out to help.'}
          </p>
        </div>
      </div>
    )
  }

  if (bugSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bug Reported</h1>
          <p className="text-gray-600 mb-4">
            We've created an issue to track this. Thank you for letting us know.
          </p>
          {bugIssueUrl && (
            <a
              href={bugIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              View on GitHub
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-lg w-full">
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setTab('rating')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === 'rating'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Rate Your Experience
          </button>
          <button
            onClick={() => setTab('bug')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === 'bug'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Report a Bug
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {tab === 'rating' && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">How did we do?</h1>
            <p className="text-gray-600 mb-6 text-sm">
              Your feedback helps us improve. Rate your experience from 1 to 10.
            </p>

            <div className="flex gap-2 justify-center mb-6 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                    rating === n
                      ? 'bg-blue-600 text-white shadow-md scale-110'
                      : n <= 3
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : n <= 6
                          ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any additional comments? (optional)"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <button
              onClick={submitRating}
              disabled={!rating || submitting}
              className="mt-4 w-full bg-blue-600 text-white rounded-lg py-3 font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        )}

        {tab === 'bug' && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Report a Bug</h1>
            <p className="text-gray-600 mb-6 text-sm">
              Found something wrong? Let us know and we'll fix it.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={bugTitle}
                  onChange={(e) => setBugTitle(e.target.value)}
                  placeholder="Brief description of the issue"
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={bugDescription}
                  onChange={(e) => setBugDescription(e.target.value)}
                  placeholder="What happened? What did you expect to happen?"
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Steps to Reproduce (optional)
                </label>
                <textarea
                  value={bugSteps}
                  onChange={(e) => setBugSteps(e.target.value)}
                  placeholder="1. Go to...\n2. Click on...\n3. See error..."
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={submitBug}
                disabled={!bugTitle || !bugDescription || submitting}
                className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Bug Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
