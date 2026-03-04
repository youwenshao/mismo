import { FARM_THRESHOLDS, CAPACITY_THRESHOLDS, FLEET_CONFIG } from '@mismo/shared'

export const config = {
  thresholds: { ...FARM_THRESHOLDS, ...CAPACITY_THRESHOLDS },

  studios: [
    {
      id: 'studio-1',
      host: process.env.STUDIO_1_SSH_HOST || '192.168.31.78',
      role: 'control-plane' as const,
      ramGb: 48,
      workerConcurrency: FLEET_CONFIG['studio-1'].workerConcurrency,
    },
    {
      id: 'studio-2',
      host: process.env.STUDIO_2_SSH_HOST || '192.168.31.242',
      role: 'worker' as const,
      ramGb: 64,
      workerConcurrency: FLEET_CONFIG['studio-2'].workerConcurrency,
    },
    {
      id: 'studio-3',
      host: process.env.STUDIO_3_SSH_HOST || '192.168.31.153',
      role: 'worker' as const,
      ramGb: 64,
      workerConcurrency: FLEET_CONFIG['studio-3'].workerConcurrency,
    },
  ],

  get ssh() {
    return {
      user: process.env.SSH_USER || 'admin',
      keyPath: process.env.SSH_KEY_PATH || `${process.env.HOME}/.ssh/mismo_ed25519`,
      passphrase: process.env.SSH_PASSPHRASE || '',
    }
  },

  get supabase() {
    return {
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceRoleKey:
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    }
  },

  apis: {
    kimiBaseUrl: 'https://api.moonshot.ai/v1',
    kimiApiKey: process.env.KIMI_API_KEY || '',
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
    githubToken: process.env.GITHUB_TOKEN || '',
  },

  alerts: {
    slackWebhookUrl: process.env.SLACK_ALERT_WEBHOOK_URL || '',
    alertEmail: process.env.ALERT_EMAIL || '',
    alertPhone: process.env.ALERT_PHONE_NUMBER || '',
  },

  intervals: {
    resourceCollector: 2 * 60_000,
    apiHealth: 30_000,
    githubHealth: 60_000,
    buildTracker: 30_000,
    securityScanner: 5 * 60_000,
    containerHealth: 2 * 60_000,
  },

  redis: {
    host: process.env.REDIS_HOST || process.env.MAIN_NODE_IP || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  localQueuePath: process.env.FARM_MONITOR_QUEUE_PATH || '/tmp/mismo-build-queue.db',
} as const
