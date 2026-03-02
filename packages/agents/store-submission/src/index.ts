import express from 'express'
import { prisma } from '@mismo/db'
import { z } from 'zod'

const app = express()
app.use(express.json({ limit: '10mb' }))

const GenerateRequestSchema = z.object({
  buildId: z.string().min(1),
  prd: z.object({
    appName: z.string().min(1),
    description: z.string().min(1),
    category: z.string().default('Utilities'),
    keywords: z.array(z.string()).optional().default([]),
    privacyPolicyUrl: z.string().url().optional(),
    features: z.array(z.object({
      title: z.string(),
      description: z.string(),
    })).optional().default([]),
  }),
  platform: z.enum(['ios', 'android', 'both']).default('both'),
  appInfo: z.object({
    bundleId: z.string(),
    version: z.string().default('1.0.0'),
    buildNumber: z.string().default('1'),
  }),
  designDna: z.object({
    mood: z.string().optional(),
    colors: z.record(z.unknown()).optional(),
  }).optional().default({}),
})

type GenerateRequest = z.infer<typeof GenerateRequestSchema>

const IOS_CATEGORIES: Record<string, string> = {
  'Utilities': 'MZGenre.Utilities',
  'Productivity': 'MZGenre.Productivity',
  'Business': 'MZGenre.Business',
  'Education': 'MZGenre.Education',
  'Finance': 'MZGenre.Finance',
  'Health & Fitness': 'MZGenre.HealthAndFitness',
  'Lifestyle': 'MZGenre.Lifestyle',
  'Social Networking': 'MZGenre.SocialNetworking',
  'Entertainment': 'MZGenre.Entertainment',
  'Shopping': 'MZGenre.Shopping',
}

const ANDROID_CATEGORIES: Record<string, string> = {
  'Utilities': 'TOOLS',
  'Productivity': 'PRODUCTIVITY',
  'Business': 'BUSINESS',
  'Education': 'EDUCATION',
  'Finance': 'FINANCE',
  'Health & Fitness': 'HEALTH_AND_FITNESS',
  'Lifestyle': 'LIFESTYLE',
  'Social Networking': 'SOCIAL',
  'Entertainment': 'ENTERTAINMENT',
  'Shopping': 'SHOPPING',
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
}

function generateStoreListing(prd: GenerateRequest['prd']): {
  title: string
  subtitle: string
  description: string
  keywords: string[]
  privacyPolicyUrl: string
  category: string
} {
  const title = truncate(prd.appName, 30)
  const subtitle = truncate(
    prd.features.length > 0
      ? prd.features[0].title
      : prd.description.split('.')[0],
    30,
  )

  const featureLines = prd.features
    .slice(0, 5)
    .map((f) => `• ${f.title}: ${f.description}`)
    .join('\n')

  const description = truncate(
    [
      prd.description,
      '',
      featureLines ? 'Key Features:' : '',
      featureLines,
    ].filter(Boolean).join('\n'),
    4000,
  )

  return {
    title,
    subtitle,
    description,
    keywords: prd.keywords.slice(0, 100),
    privacyPolicyUrl: prd.privacyPolicyUrl || '',
    category: prd.category,
  }
}

function generateMaestroFlows(
  screens: string[],
  appInfo: GenerateRequest['appInfo'],
): Array<{ device: string; flow: string }> {
  const devices = [
    { device: 'iPhone_15_Pro', width: 1179, height: 2556 },
    { device: 'iPhone_15_Pro_Max', width: 1290, height: 2796 },
    { device: 'iPad_Pro_12_9', width: 2048, height: 2732 },
    { device: 'Pixel_8', width: 1080, height: 2400 },
    { device: 'Pixel_8_Pro', width: 1344, height: 2992 },
  ]

  return devices.map(({ device, width, height }) => {
    const steps = [
      `appId: ${appInfo.bundleId}`,
      '---',
      '- launchApp',
      '- waitForAnimationToEnd',
      `- takeScreenshot: screenshots/${device}_launch`,
    ]

    for (let i = 0; i < Math.min(screens.length, 4); i++) {
      steps.push(`- tapOn: "${screens[i]}"`)
      steps.push('- waitForAnimationToEnd')
      steps.push(`- takeScreenshot: screenshots/${device}_${screens[i].toLowerCase().replace(/\s+/g, '_')}`)
    }

    return { device, flow: steps.join('\n') }
  })
}

function generateIOSMetadata(
  listing: ReturnType<typeof generateStoreListing>,
  appInfo: GenerateRequest['appInfo'],
): Record<string, unknown> {
  return {
    app_identifier: appInfo.bundleId,
    app_version: appInfo.version,
    title: { 'en-US': listing.title },
    subtitle: { 'en-US': listing.subtitle },
    description: { 'en-US': listing.description },
    keywords: { 'en-US': listing.keywords.join(', ') },
    privacy_url: listing.privacyPolicyUrl,
    primary_category: IOS_CATEGORIES[listing.category] || 'MZGenre.Utilities',
    automatic_release: false,
    phased_release: true,
    price_tier: 0,
    app_review_information: {
      notes_for_review: 'Standard app submission. No special demo accounts required.',
    },
  }
}

function generateAndroidMetadata(
  listing: ReturnType<typeof generateStoreListing>,
  appInfo: GenerateRequest['appInfo'],
): Record<string, unknown> {
  return {
    package_name: appInfo.bundleId,
    version_code: parseInt(appInfo.buildNumber, 10),
    version_name: appInfo.version,
    title: { 'en-US': listing.title },
    short_description: { 'en-US': listing.subtitle },
    full_description: { 'en-US': listing.description },
    category: ANDROID_CATEGORIES[listing.category] || 'TOOLS',
    default_language: 'en-US',
    content_rating: 'Everyone',
    pricing: 'free',
  }
}

app.post('/generate', async (req, res) => {
  let buildId: string | undefined

  try {
    const parsed = GenerateRequestSchema.parse(req.body)
    buildId = parsed.buildId

    const storeListing = generateStoreListing(parsed.prd)

    const screenNames = parsed.prd.features.map((f) => f.title)
    const screenshots = generateMaestroFlows(screenNames, parsed.appInfo)

    const metadata: Record<string, unknown> = {}
    if (parsed.platform === 'ios' || parsed.platform === 'both') {
      metadata.ios = generateIOSMetadata(storeListing, parsed.appInfo)
    }
    if (parsed.platform === 'android' || parsed.platform === 'both') {
      metadata.android = generateAndroidMetadata(storeListing, parsed.appInfo)
    }

    res.json({
      success: true,
      storeListing,
      screenshots,
      metadata,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[store-submission] Error for build ${buildId}:`, message)

    if (buildId) {
      try {
        const build = await prisma.build.findUnique({ where: { id: buildId } })
        if (build) {
          const existing = Array.isArray(build.errorLogs) ? build.errorLogs : []
          await prisma.build.update({
            where: { id: buildId },
            data: {
              status: 'FAILED',
              failureCount: { increment: 1 },
              errorLogs: [...(existing as any[]), { source: 'store-submission', error: message, timestamp: new Date().toISOString() }],
            },
          })
        }
      } catch {
        console.error('[store-submission] Failed to log error to Build record')
      }
    }

    res.status(400).json({ success: false, error: message })
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'store-submission-agent' })
})

const PORT = Number(process.env.PORT) || 3023
app.listen(PORT, () => {
  console.log(`[store-submission] listening on port ${PORT}`)
})
