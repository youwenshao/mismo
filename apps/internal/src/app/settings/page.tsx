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

export default function SettingsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [activeProvider, setActiveProvider] = useState('deepseek')
  const [activeModel, setActiveModel] = useState('deepseek-chat')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

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

  useEffect(() => {
    loadData()
  }, [loadData])

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
        body: JSON.stringify({
          providerId: activeProvider,
          modelId: activeModel,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestResult({
          ok: true,
          message: `Response: "${data.response}"`,
        })
      } else {
        setTestResult({ ok: false, message: data.error })
      }
    } catch (e) {
      setTestResult({
        ok: false,
        message: e instanceof Error ? e.message : 'Test failed',
      })
    } finally {
      setTesting(false)
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
                      className={`w-2 h-2 rounded-full ${
                        p.configured ? 'bg-green-500' : 'bg-red-400'
                      }`}
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

      <section className="mb-8">
        <h2 className="text-sm font-medium mb-1">Admin Whitelist</h2>
        <p className="text-sm text-gray-400">Whitelist management coming soon</p>
      </section>

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
