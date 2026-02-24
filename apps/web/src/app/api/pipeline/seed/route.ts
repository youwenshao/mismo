import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { TEMPLATE_CONFIGS, generateTemplateFiles } from '@mismo/templates'

const VALID_TEMPLATE_IDS = ['SERVERLESS_SAAS', 'MONOLITHIC_MVP', 'MICROSERVICES_SCALE'] as const

const requestBodySchema = z.object({
  projectId: z.string().min(1),
  templateId: z.enum(VALID_TEMPLATE_IDS),
  repoName: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Repository name must be alphanumeric with dashes/underscores'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const parsed = requestBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 },
      )
    }

    const { projectId, templateId, repoName } = parsed.data

    const config = TEMPLATE_CONFIGS[templateId]
    if (!config) {
      return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 400 })
    }

    const files = generateTemplateFiles(templateId)

    // TODO: GitHub API integration
    // When GitHub API token is available, create the repository and push files:
    //   1. POST /user/repos to create the repo
    //   2. Use the Git Trees API to commit all files in a single commit
    //   3. Return the actual repo URL from the API response
    const repoUrl = `https://github.com/user/${repoName}`

    return NextResponse.json({
      success: true,
      projectId,
      templateId,
      repoUrl,
      files: files.map((f) => f.path),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Pipeline seed failed: ${message}` }, { status: 500 })
  }
}
