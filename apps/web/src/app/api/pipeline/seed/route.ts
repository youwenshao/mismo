import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { TEMPLATE_CONFIGS, generateTemplateFiles } from '@mismo/templates'
import { GitHubClient } from '@mismo/ai'

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

    const githubToken = process.env.GITHUB_TOKEN
    if (githubToken) {
      const github = new GitHubClient(githubToken)
      const org = process.env.GITHUB_DELIVERY_ORG || process.env.GITHUB_ORG || 'mismo-agency'

      const repoInfo = await github.createRepo(org, repoName, {
        private: true,
        autoInit: true,
        licenseTemplate: 'mit',
        gitignoreTemplate: 'Node',
        description: `Mismo project ${projectId} (${templateId})`,
      })

      const [owner, repo] = repoInfo.fullName.split('/')

      const treeFiles = files.map((f) => ({ path: f.path, content: f.content }))
      await github.pushTreeCommit(owner, repo, treeFiles, `chore: scaffold ${templateId} template`)

      return NextResponse.json({
        success: true,
        projectId,
        templateId,
        repoUrl: repoInfo.htmlUrl,
        files: files.map((f) => f.path),
      })
    }

    const repoUrl = `https://github.com/user/${repoName}`
    return NextResponse.json({
      success: true,
      projectId,
      templateId,
      repoUrl,
      files: files.map((f) => f.path),
      note: 'GITHUB_TOKEN not configured — repo URL is a placeholder',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Pipeline seed failed: ${message}` }, { status: 500 })
  }
}
