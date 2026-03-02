import type { Locale } from '../i18n/strings'

export type NotificationEvent =
  | 'BUILD_STARTED'
  | 'BUILD_PROGRESS'
  | 'BUILD_COMPLETE'
  | 'TRANSFER_READY'
  | 'SUPPORT_REQUIRED'
  | 'FEEDBACK_REQUEST'
  | 'MAINTENANCE_REPORT'

export interface TemplateData {
  clientName: string
  clientEmail: string
  projectName: string
  commissionId: string
  locale: Locale
}

export interface BuildStartedData extends TemplateData {
  stage: string
}

export interface BuildProgressData extends TemplateData {
  stage: string
  progressPercent: number
  progressDetail: string
  nextStep: string
  estimatedCompletion?: string
}

export interface BuildCompleteData extends TemplateData {
  buildId: string
  githubUrl: string
  vercelUrl?: string
}

export interface TransferReadyData extends TemplateData {
  githubUrl: string
  hostingUrl?: string
  adrUrl?: string
  howToGuideUrl?: string
  apiDocsUrl?: string
  videoUrl?: string
}

export interface SupportRequiredData extends TemplateData {
  reason: string
  failureCount: number
}

export interface FeedbackRequestData extends TemplateData {
  deliveryDate: string
  feedbackUrl: string
}

export type EventDataMap = {
  BUILD_STARTED: BuildStartedData
  BUILD_PROGRESS: BuildProgressData
  BUILD_COMPLETE: BuildCompleteData
  TRANSFER_READY: TransferReadyData
  SUPPORT_REQUIRED: SupportRequiredData
  FEEDBACK_REQUEST: FeedbackRequestData
  MAINTENANCE_REPORT: TemplateData
}

export type AnyEventData = EventDataMap[keyof EventDataMap]

export const BUILD_STAGE_ORDER = [
  'DB_ARCHITECT',
  'BACKEND',
  'FRONTEND',
  'DEVOPS',
  'VALIDATION',
] as const

export const STAGE_LABELS: Record<string, Record<Locale, string>> = {
  DB_ARCHITECT: { en: 'database architecture', zh: '数据库架构设计' },
  BACKEND: { en: 'backend API development', zh: '后端 API 开发' },
  FRONTEND: { en: 'frontend development', zh: '前端开发' },
  DEVOPS: { en: 'deployment configuration', zh: '部署配置' },
  VALIDATION: { en: 'acceptance testing', zh: '验收测试' },
}

export function stageToProgress(status: string): number {
  const idx = BUILD_STAGE_ORDER.indexOf(status as typeof BUILD_STAGE_ORDER[number])
  if (idx === -1) return 0
  return Math.round(((idx + 1) / BUILD_STAGE_ORDER.length) * 100)
}

export function mapBuildStatusToEvent(
  oldStatus: string,
  newStatus: string,
): NotificationEvent | null {
  if (newStatus === 'RUNNING' && oldStatus === 'PENDING') return 'BUILD_STARTED'
  if (newStatus === 'SUCCESS') return 'BUILD_COMPLETE'
  if (newStatus === 'FAILED') return 'SUPPORT_REQUIRED'
  return null
}
