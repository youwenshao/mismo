import { generateDocumentation, type DocGenerationInput } from './doc-generator'
import { recordWalkthrough, type RecordingOptions } from './walkthrough-recorder'
import { readFileSync } from 'fs'

export interface AssemblyInput {
  buildId: string
  commissionId: string
  githubUrl: string
  vercelUrl?: string
  prdJson: Record<string, unknown>
  buildOutput: DocGenerationInput['buildOutput']
  supabaseUrl: string
  supabaseServiceKey: string
}

export interface AssemblyResult {
  githubUrl: string
  hostingUrl: string | null
  adrDocument: string
  howToGuide: string
  apiDocs: string | null
  videoUrl: string | null
}

export async function assembleDeliveryPackage(input: AssemblyInput): Promise<AssemblyResult> {
  const docs = await generateDocumentation({
    projectName: (input.prdJson.name as string) ?? 'Project',
    prdJson: input.prdJson,
    buildOutput: input.buildOutput,
  })

  let videoUrl: string | null = null

  if (input.vercelUrl) {
    try {
      const routes = extractRoutesFromPRD(input.prdJson)
      const recording = await recordWalkthrough({
        targetUrl: input.vercelUrl,
        routes,
      })

      videoUrl = await uploadToSupabaseStorage(
        recording.videoPath,
        input.buildId,
        input.supabaseUrl,
        input.supabaseServiceKey,
      )
    } catch (err) {
      console.error('[delivery] Walkthrough recording failed, continuing without video:', err)
    }
  }

  return {
    githubUrl: input.githubUrl,
    hostingUrl: input.vercelUrl ?? null,
    adrDocument: docs.adr,
    howToGuide: docs.howToGuide,
    apiDocs: docs.apiDocs,
    videoUrl,
  }
}

function extractRoutesFromPRD(prd: Record<string, unknown>): string[] {
  const defaultRoutes = ['/', '/about']

  const userStories = prd.userStories as Array<Record<string, unknown>> | undefined
  if (!userStories?.length) return defaultRoutes

  const routes = new Set<string>(['/'])
  for (const story of userStories) {
    const route = story.route as string | undefined
    if (route) routes.add(route)
  }

  return Array.from(routes).slice(0, 10)
}

async function uploadToSupabaseStorage(
  filePath: string,
  buildId: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<string> {
  const fileName = `walkthrough-${buildId}.mp4`
  const bucket = 'walkthrough-videos'

  const fileBytes = readFileSync(filePath)
  const blob = new Blob([fileBytes], { type: 'video/mp4' })

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: blob,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase storage upload failed: ${response.status} ${text}`)
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`
}
