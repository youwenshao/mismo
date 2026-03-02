import { z } from 'zod'

export const HostingProviderSchema = z.enum([
  'VERCEL',
  'RAILWAY',
  'RENDER',
  'AWS',
  'GCP',
  'SELF_HOSTED',
])
export type HostingProvider = z.infer<typeof HostingProviderSchema>

export const TransferStatusSchema = z.enum([
  'PENDING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'DEPLOYING',
  'DEPLOYED',
  'TRANSFERRING',
  'COMPLETED',
  'FAILED',
  'MONITORING',
])
export type TransferStatus = z.infer<typeof TransferStatusSchema>

export const TransferRequestSchema = z.object({
  commissionId: z.string(),
  buildId: z.string().optional(),
  provider: HostingProviderSchema,
  clientAccountId: z.string().optional(),
  clientCredentials: z.record(z.string()).optional(),
  idempotencyKey: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
})
export type TransferRequest = z.infer<typeof TransferRequestSchema>

export const EnvVarSchema = z.object({
  key: z.string(),
  value: z.string(),
  sensitive: z.boolean().default(false),
})
export type EnvVar = z.infer<typeof EnvVarSchema>

export const VercelTransferConfigSchema = z.object({
  vercelAccountId: z.string(),
  vercelTeamId: z.string().optional(),
  projectName: z.string(),
  framework: z.string().default('nextjs'),
  buildCommand: z.string().default('next build'),
  outputDir: z.string().default('.next'),
  envVars: z.array(EnvVarSchema).default([]),
  gitRepoUrl: z.string().optional(),
})
export type VercelTransferConfig = z.infer<typeof VercelTransferConfigSchema>

export const PaasTransferConfigSchema = z.object({
  provider: z.enum(['RAILWAY', 'RENDER']),
  projectName: z.string(),
  serviceConfig: z.object({
    type: z.enum(['web', 'worker', 'cron']).default('web'),
    startCommand: z.string().optional(),
    buildCommand: z.string().optional(),
    healthcheckPath: z.string().default('/health'),
    plan: z.string().default('starter'),
  }),
  envVars: z.array(EnvVarSchema).default([]),
  customDomains: z.array(z.string()).default([]),
  gitRepoUrl: z.string().optional(),
  databaseConfig: z
    .object({
      engine: z.enum(['postgres', 'mysql', 'redis']),
      plan: z.string().default('starter'),
    })
    .optional(),
})
export type PaasTransferConfig = z.infer<typeof PaasTransferConfigSchema>

export const CloudResourceSchema = z.object({
  s3: z
    .object({
      bucketName: z.string(),
      region: z.string(),
      versioning: z.boolean().default(true),
    })
    .optional(),
  cloudfront: z
    .object({
      originDomain: z.string(),
      priceClass: z.string().default('PriceClass_100'),
      certificate: z.string().optional(),
    })
    .optional(),
  rds: z
    .object({
      engine: z.enum(['postgres', 'mysql']).default('postgres'),
      instanceClass: z.string().default('db.t3.micro'),
      allocatedStorage: z.number().default(20),
      dbName: z.string(),
    })
    .optional(),
  compute: z
    .object({
      type: z.enum(['ec2', 'ecs', 'cloud-run']).default('ecs'),
      instanceType: z.string().default('t3.micro'),
      containerImage: z.string().optional(),
      cpu: z.number().default(256),
      memory: z.number().default(512),
    })
    .optional(),
})
export type CloudResource = z.infer<typeof CloudResourceSchema>

export const CloudTransferConfigSchema = z.object({
  provider: z.enum(['AWS', 'GCP']),
  region: z.string(),
  terraformVars: z.record(z.string()).default({}),
  resources: CloudResourceSchema,
  clientAwsAccessKey: z.string().optional(),
  clientAwsSecretKey: z.string().optional(),
  clientGcpServiceAccount: z.string().optional(),
  existingTerraformDir: z.string().optional(),
})
export type CloudTransferConfig = z.infer<typeof CloudTransferConfigSchema>

export const SelfHostedConfigSchema = z.object({
  domain: z.string(),
  email: z.string().email(),
  serverIp: z.string().optional(),
  appImage: z.string().optional(),
  appPort: z.number().default(3000),
  needsDatabase: z.boolean().default(true),
  needsRedis: z.boolean().default(false),
  backupSchedule: z.string().default('0 3 * * *'),
  backupS3Bucket: z.string().optional(),
  envVars: z.array(EnvVarSchema).default([]),
})
export type SelfHostedConfig = z.infer<typeof SelfHostedConfigSchema>

export const HealthCheckResultSchema = z.object({
  url: z.string(),
  status: z.enum(['healthy', 'degraded', 'down', 'unknown']),
  statusCode: z.number().optional(),
  responseTimeMs: z.number().optional(),
  errorRate: z.number().optional(),
  certExpiry: z.string().datetime().optional(),
  checkedAt: z.string().datetime(),
  details: z.string().optional(),
})
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>

export const MonitorAlertSchema = z.object({
  transferId: z.string(),
  alertType: z.enum(['downtime', 'error_rate', 'cert_expiry']),
  details: z.string(),
  severity: z.enum(['warning', 'critical']),
  deploymentUrl: z.string(),
  checkedAt: z.string().datetime(),
})
export type MonitorAlert = z.infer<typeof MonitorAlertSchema>

export interface DeployResult {
  success: boolean
  deploymentUrl?: string
  projectId?: string
  output?: Record<string, unknown>
  artifacts?: Record<string, string>
  error?: string
}

export interface HostingTransferResult {
  success: boolean
  transferOutput?: Record<string, unknown>
  error?: string
}
