import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { MODEL_PROVIDERS } from '@mismo/shared'
import { LanguageModel } from 'ai'
import { withRateLimit } from './rate-limiter'

type ProviderId = keyof typeof MODEL_PROVIDERS

interface ActiveModelConfig {
  providerId: string
  modelId: string
}

const providerFactories: Record<
  ProviderId,
  (modelId: string, apiKey: string) => ReturnType<ReturnType<typeof createDeepSeek>>
> = {
  deepseek: (modelId, apiKey) => {
    const provider = createDeepSeek({ apiKey })
    return provider(modelId)
  },
  kimi: (modelId, apiKey) => {
    const provider = createOpenAICompatible({
      name: 'kimi',
      apiKey,
      baseURL: 'https://api.moonshot.ai/v1',
    })
    return withRateLimit(provider(modelId)) as ReturnType<ReturnType<typeof createDeepSeek>>
  },
  minimax: (modelId, apiKey) => {
    const provider = createOpenAICompatible({
      name: 'minimax',
      apiKey,
      baseURL: 'https://api.minimax.chat/v1',
    })
    return provider(modelId) as ReturnType<ReturnType<typeof createDeepSeek>>
  },
  zai: (modelId, apiKey) => {
    const provider = createOpenAICompatible({
      name: 'zai',
      apiKey,
      baseURL: 'https://api.z.ai/api/paas/v4/',
    })
    return provider(modelId) as ReturnType<ReturnType<typeof createDeepSeek>>
  },
}

declare const process: { env: Record<string, string | undefined> } | undefined

function getEnv(key: string): string | undefined {
  try {
    return process?.env[key]
  } catch {
    return undefined
  }
}

function getApiKey(providerId: ProviderId): string | undefined {
  return getEnv(MODEL_PROVIDERS[providerId].envKey)
}

function getDefaultConfig(): ActiveModelConfig {
  return {
    providerId: getEnv('DEFAULT_MO_PROVIDER') || 'deepseek',
    modelId: getEnv('DEFAULT_MO_MODEL') || 'deepseek-chat',
  }
}

export function getActiveModel(config?: Partial<ActiveModelConfig>): LanguageModel {
  const defaults = getDefaultConfig()
  const providerId = (config?.providerId || defaults.providerId) as ProviderId
  const modelId = config?.modelId || defaults.modelId

  const factory = providerFactories[providerId]
  if (!factory) {
    throw new Error(`Unknown provider: ${providerId}`)
  }

  const apiKey = getApiKey(providerId)
  if (!apiKey) {
    throw new Error(
      `API key not configured for provider ${providerId}. Set ${MODEL_PROVIDERS[providerId].envKey} in your environment.`,
    )
  }

  return factory(modelId, apiKey)
}

/**
 * Gets the active model with farm-monitor failover support.
 * Checks SystemConfig for provider overrides set by the farm-monitor
 * (e.g., Kimi -> DeepSeek failover during API degradation).
 */
export async function getActiveModelWithFallback(
  supabaseUrl?: string,
  supabaseKey?: string,
  config?: Partial<ActiveModelConfig>,
): Promise<LanguageModel> {
  const override = await getProviderOverride(supabaseUrl, supabaseKey)
  if (override) {
    const providerId = override as ProviderId
    if (providerFactories[providerId] && getApiKey(providerId)) {
      const models = MODEL_PROVIDERS[providerId].models as ReadonlyArray<{
        id: string
        name: string
        default?: boolean
      }>
      const defaultModel = models.find((m) => m.default) || models[0]
      return getActiveModel({ providerId, modelId: defaultModel.id })
    }
  }
  return getActiveModel(config)
}

async function getProviderOverride(
  supabaseUrl?: string,
  supabaseKey?: string,
): Promise<string | null> {
  const url = supabaseUrl || getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL')
  const key = supabaseKey || getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null

  try {
    const res = await fetch(`${url}/rest/v1/SystemConfig?key=eq.active_ai_provider&select=value`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ value: { provider?: string } }>
    return data[0]?.value?.provider || null
  } catch {
    return null
  }
}

export async function isGitHubPaused(
  supabaseUrl?: string,
  supabaseKey?: string,
): Promise<{ paused: boolean; resetAt: string | null }> {
  const url = supabaseUrl || getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL')
  const key = supabaseKey || getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return { paused: false, resetAt: null }

  try {
    const res = await fetch(`${url}/rest/v1/SystemConfig?key=eq.github_builds_paused&select=value`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })
    if (!res.ok) return { paused: false, resetAt: null }
    const data = (await res.json()) as Array<{ value: { paused?: boolean; resetAt?: string } }>
    const val = data[0]?.value
    return { paused: val?.paused || false, resetAt: val?.resetAt || null }
  } catch {
    return { paused: false, resetAt: null }
  }
}

export function getProviderList() {
  return Object.values(MODEL_PROVIDERS).map((p) => ({
    ...p,
    configured: !!getApiKey(p.id as ProviderId),
  }))
}

export async function checkProviderHealth(
  providerId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const pid = providerId as ProviderId
    const apiKey = getApiKey(pid)
    if (!apiKey) {
      return { ok: false, error: `No API key set (${MODEL_PROVIDERS[pid].envKey})` }
    }
    const models = MODEL_PROVIDERS[pid].models as ReadonlyArray<{
      id: string
      name: string
      default?: boolean
    }>
    const defaultModel = models.find((m) => m.default) || models[0]
    getActiveModel({ providerId, modelId: defaultModel.id })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
