'use client'

import { useState, useCallback } from 'react'

interface CredentialField {
  service: string
  label: string
  placeholder: string
}

interface CredentialFormProps {
  commissionId: string
  requiredCredentials: CredentialField[]
  onComplete?: () => void
}

interface SaveResult {
  service: string
  saved: boolean
  error?: string
}

const SERVICE_ICONS: Record<string, string> = {
  slackApi: 'Slack',
  notionApi: 'Notion',
  googleSheetsOAuth2Api: 'Google Sheets',
  smtp: 'Email (SMTP)',
  httpHeaderAuth: 'API Key',
}

export function CredentialForm({
  commissionId,
  requiredCredentials,
  onComplete,
}: CredentialFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<SaveResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback((service: string, value: string) => {
    setValues((prev) => ({ ...prev, [service]: value }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setResults([])

    const credentials = requiredCredentials
      .filter((c) => values[c.service]?.trim())
      .map((c) => ({
        service: c.service,
        token: values[c.service].trim(),
      }))

    if (credentials.length === 0) {
      setError('Please fill in at least one credential.')
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionId, credentials }),
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Failed to save')
      }

      const data = await response.json()
      setResults(data.results)

      setValues({})
      onComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Configure Automation Credentials
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Your API keys are encrypted at rest using pgsodium. They are never stored in plaintext or committed to Git.
        </p>
      </div>

      <div className="space-y-4">
        {requiredCredentials.map((cred) => {
          const displayName = SERVICE_ICONS[cred.service] || cred.label
          const result = results.find((r) => r.service === cred.service)

          return (
            <div key={cred.service} className="relative">
              <label
                htmlFor={cred.service}
                className="block text-sm font-medium text-gray-700"
              >
                {displayName}
              </label>
              <div className="mt-1 relative">
                <input
                  id={cred.service}
                  type="password"
                  autoComplete="off"
                  value={values[cred.service] || ''}
                  onChange={(e) => handleChange(cred.service, e.target.value)}
                  placeholder={cred.placeholder}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
                {result && (
                  <span
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                      result.saved ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.saved ? 'Saved' : 'Failed'}
                  </span>
                )}
              </div>
              {result?.error && (
                <p className="mt-1 text-xs text-red-500">{result.error}</p>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Encrypting & Saving...' : 'Save Credentials'}
        </button>
        <span className="text-xs text-gray-400">
          Encrypted with AES-256 via pgsodium
        </span>
      </div>
    </form>
  )
}
