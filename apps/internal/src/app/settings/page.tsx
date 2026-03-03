'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProviderModel {
  id: string
  name: string
  default?: boolean
}

interface ProviderInfo {
  id: string
  name: string
  models: ProviderModel[]
  envKey: string
  configured: boolean
  health: { ok: boolean; error?: string }
}

interface Grant {
  id: string
  userId: string
  grantType: string
  usedAt: string | null
  expiresAt: string | null
  createdAt: string
  user: { id: string; supabaseAuthId: string; role: string }
  grantedByUser: { id: string; supabaseAuthId: string; role: string }
}

const GRANT_TYPE_LABELS: Record<string, string> = {
  UNLIMITED_7DAY: '7-day unlimited (non-Onsite)',
  FREE_SOURCE: '1 free Source commission',
  FREE_SOURCE_OR_DEPLOY: '1 free Source or Deploy commission',
}

export default function SettingsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [activeProvider, setActiveProvider] = useState('deepseek')
  const [activeModel, setActiveModel] = useState('deepseek-chat')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Admin whitelist state
  const [whitelistHashes, setWhitelistHashes] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [whitelistLoading, setWhitelistLoading] = useState(false)

  // Grants state
  const [grants, setGrants] = useState<Grant[]>([])
  const [grantsLoading, setGrantsLoading] = useState(false)
  const [grantUserId, setGrantUserId] = useState('')
  const [grantType, setGrantType] = useState('FREE_SOURCE')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [providersRes, configRes] = await Promise.all([
        fetch('/api/providers'),
        fetch('/api/config'),
      ])
      const providersData = await providersRes.json()
      const configData = await configRes.json()

      setProviders(providersData)

      if (configData['mo.provider']) {
        setActiveProvider(configData['mo.provider'] as string)
      }
      if (configData['mo.model']) {
        setActiveModel(configData['mo.model'] as string)
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadWhitelist = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whitelist')
      const data = await res.json()
      setWhitelistHashes(data.hashes || [])
    } catch (e) {
      console.error('Failed to load whitelist:', e)
    }
  }, [])

  const loadGrants = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/grants')
      const data = await res.json()
      setGrants(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load grants:', e)
    }
  }, [])

  const loadCurrentUser = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data?.user?.id) {
        const configRes = await fetch(`/api/config`)
        const config = await configRes.json()
        setCurrentUserId(config['currentUserId'] || data.user.id)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadData()
    loadWhitelist()
    loadGrants()
    loadCurrentUser()
  }, [loadData, loadWhitelist, loadGrants, loadCurrentUser])

  const selectedProvider = providers.find((p) => p.id === activeProvider)
  const availableModels = selectedProvider?.models ?? []

  useEffect(() => {
    if (selectedProvider) {
      const defaultModel = selectedProvider.models.find((m) => m.default)
      const currentModelValid = selectedProvider.models.some((m) => m.id === activeModel)
      if (!currentModelValid && defaultModel) {
        setActiveModel(defaultModel.id)
      }
    }
  }, [activeProvider, selectedProvider, activeModel])

  async function handleSave() {
    setSaving(true)
    setSaveSuccess(false)
    try {
      await Promise.all([
        fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'mo.provider', value: activeProvider }),
        }),
        fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'mo.model', value: activeModel }),
        }),
      ])
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: activeProvider, modelId: activeModel }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestResult({ ok: true, message: `Response: "${data.response}"` })
      } else {
        setTestResult({ ok: false, message: data.error })
      }
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  async function handleAddWhitelist() {
    if (!newEmail.trim()) return
    setWhitelistLoading(true)
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(newEmail.toLowerCase().trim())
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const emailHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      const res = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailHash }),
      })
      const result = await res.json()
      setWhitelistHashes(result.hashes || [])
      setNewEmail('')
    } catch (e) {
      console.error('Failed to add whitelist entry:', e)
    } finally {
      setWhitelistLoading(false)
    }
  }

  async function handleRemoveWhitelist(hash: string) {
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailHash: hash }),
      })
      const result = await res.json()
      setWhitelistHashes(result.hashes || [])
    } catch (e) {
      console.error('Failed to remove whitelist entry:', e)
    }
  }

  async function handleCreateGrant() {
    if (!grantUserId.trim()) return
    setGrantsLoading(true)
    try {
      const res = await fetch('/api/admin/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: grantUserId.trim(),
          grantType,
          grantedById: currentUserId,
        }),
      })
      if (res.ok) {
        setGrantUserId('')
        await loadGrants()
      } else {
        const data = await res.json()
        console.error('Failed to create grant:', data.error)
      }
    } catch (e) {
      console.error('Failed to create grant:', e)
    } finally {
      setGrantsLoading(false)
    }
  }

  async function handleDeleteGrant(grantId: string) {
    try {
      await fetch('/api/admin/grants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId }),
      })
      await loadGrants()
    } catch (e) {
      console.error('Failed to delete grant:', e)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = 'http://localhost:3000'
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Settings</h1>

      {/* Mo Configuration */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-4">Mo Configuration</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading providers...</p>
        ) : (
          <div className="space-y-5 max-w-lg">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Active Provider</label>
              <select
                value={activeProvider}
                onChange={(e) => setActiveProvider(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Active Model</label>
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.default ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Provider Status</label>
              <div className="space-y-2">
                {providers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-2 h-2 rounded-full ${p.configured ? 'bg-green-500' : 'bg-red-400'}`}
                    />
                    <span className="text-gray-700">{p.name}</span>
                    <span className="text-xs text-gray-400">
                      {p.configured ? 'API key configured' : `Missing ${p.envKey}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-black text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !selectedProvider?.configured}
                className="px-4 py-2 text-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test Provider'}
              </button>
              {saveSuccess && <span className="text-xs text-green-600">Saved</span>}
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  testResult.ok
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {testResult.ok ? 'Success' : 'Failed'}: {testResult.message}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Admin Whitelist */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-4">Admin Whitelist</h2>
        <div className="max-w-lg space-y-4">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="admin@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWhitelist()}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300"
            />
            <button
              onClick={handleAddWhitelist}
              disabled={whitelistLoading || !newEmail.trim()}
              className="px-4 py-2 text-sm bg-black text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {whitelistLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Email is hashed (SHA-256) client-side before storage. Only the hash is persisted.
          </p>
          {whitelistHashes.length === 0 ? (
            <p className="text-sm text-gray-400">
              No entries in DB whitelist. Check ADMIN_EMAIL_HASHES env var.
            </p>
          ) : (
            <div className="space-y-2">
              {whitelistHashes.map((hash) => (
                <div
                  key={hash}
                  className="flex items-center justify-between px-3 py-2 text-sm border border-gray-100 rounded-lg bg-gray-50/50"
                >
                  <code className="text-xs text-gray-500 font-mono">
                    {hash.slice(0, 12)}...{hash.slice(-8)}
                  </code>
                  <button
                    onClick={() => handleRemoveWhitelist(hash)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* User Grants */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-4">User Grants</h2>
        <div className="max-w-lg space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">User ID</label>
              <input
                type="text"
                placeholder="cuid of the user"
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Grant Type</label>
              <select
                value={grantType}
                onChange={(e) => setGrantType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-300"
              >
                {Object.entries(GRANT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreateGrant}
              disabled={grantsLoading || !grantUserId.trim()}
              className="px-4 py-2 text-sm bg-black text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {grantsLoading ? 'Creating...' : 'Create Grant'}
            </button>
          </div>

          {grants.length === 0 ? (
            <p className="text-sm text-gray-400">No grants issued yet.</p>
          ) : (
            <div className="space-y-2 mt-4">
              {grants.map((g) => (
                <div
                  key={g.id}
                  className="px-3 py-3 border border-gray-100 rounded-lg bg-gray-50/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-700">
                        {GRANT_TYPE_LABELS[g.grantType] || g.grantType}
                      </p>
                      <p className="text-xs text-gray-400">
                        User: <code className="font-mono">{g.userId.slice(0, 12)}...</code>
                      </p>
                      <p className="text-xs text-gray-400">
                        Created {new Date(g.createdAt).toLocaleDateString()}
                        {g.expiresAt && (
                          <span>
                            {' '}
                            &middot; Expires {new Date(g.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {g.usedAt ? (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          Used
                        </span>
                      ) : g.expiresAt && new Date(g.expiresAt) < new Date() ? (
                        <span className="text-xs text-red-400 bg-red-50 px-2 py-0.5 rounded-full">
                          Expired
                        </span>
                      ) : (
                        <>
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                          <button
                            onClick={() => handleDeleteGrant(g.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* System */}
      <section>
        <h2 className="text-sm font-medium mb-3">System</h2>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  )
}
