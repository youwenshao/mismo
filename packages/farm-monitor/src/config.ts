import { FARM_THRESHOLDS } from '@mismo/shared'

export const config = {
  thresholds: FARM_THRESHOLDS,

  studios: [
    { id: 'studio-1', host: process.env.STUDIO_1_SSH_HOST || '192.168.1.101', role: 'control-plane' as const },
    { id: 'studio-2', host: process.env.STUDIO_2_SSH_HOST || '192.168.1.102', role: 'worker' as const },
    { id: 'studio-3', host: process.env.STUDIO_3_SSH_HOST || '192.168.1.103', role: 'worker' as const },
  ],

  ssh: {
    user: process.env.SSH_USER || 'admin',
    keyPath: process.env.SSH_KEY_PATH || `${process.env.HOME}/.ssh/id_ed25519`,
  },

  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
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

  localQueuePath: process.env.FARM_MONITOR_QUEUE_PATH || '/tmp/mismo-build-queue.db',
} as const
