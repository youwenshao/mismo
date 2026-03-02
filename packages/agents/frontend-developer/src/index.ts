import express from 'express'
import { prisma } from '@mismo/db'
import { z } from 'zod'

const app = express()
app.use(express.json({ limit: '10mb' }))

const GenerateRequestSchema = z.object({
  buildId: z.string().min(1),
  designDna: z.object({
    mood: z.string().optional(),
    typography: z.record(z.unknown()).optional(),
    colors: z.record(z.unknown()).optional(),
    motion: z.record(z.unknown()).optional(),
    content_rules: z.record(z.unknown()).optional(),
  }),
  contentJson: z.record(z.unknown()),
  backendTypes: z.object({
    zodSchemas: z.string(),
    types: z.string(),
    routes: z.array(z.object({
      method: z.string(),
      path: z.string(),
      requestSchema: z.string().optional(),
      responseSchema: z.string().optional(),
    })),
  }),
})

function generateApiClient(backendTypes: z.infer<typeof GenerateRequestSchema>['backendTypes']): string {
  const imports = [
    `import { z } from 'zod'`,
    `import type { AxiosInstance } from 'axios'`,
    '',
    '// Re-exported Zod schemas from backend for runtime validation',
    backendTypes.zodSchemas,
    '',
    '// Re-exported TypeScript types',
    backendTypes.types,
    '',
  ]

  const methods = backendTypes.routes.map((route) => {
    const fnName = route.path
      .replace(/^\/api\//, '')
      .replace(/\//g, '_')
      .replace(/[:\-]/g, '')
    const method = route.method.toLowerCase()

    const hasRequestBody = ['post', 'put', 'patch'].includes(method)
    const paramType = route.requestSchema ? route.requestSchema : 'unknown'
    const returnType = route.responseSchema ? route.responseSchema : 'unknown'

    if (hasRequestBody) {
      return [
        `  async ${fnName}(data: ${paramType}): Promise<${returnType}> {`,
        `    const res = await this.client.${method}<${returnType}>('${route.path}', data)`,
        `    return res.data`,
        `  }`,
      ].join('\n')
    }

    return [
      `  async ${fnName}(): Promise<${returnType}> {`,
      `    const res = await this.client.${method}<${returnType}>('${route.path}')`,
      `    return res.data`,
      `  }`,
    ].join('\n')
  })

  return [
    ...imports,
    'export class ApiClient {',
    '  constructor(private client: AxiosInstance) {}',
    '',
    ...methods,
    '}',
    '',
  ].join('\n')
}

function generateComponent(
  name: string,
  designDna: z.infer<typeof GenerateRequestSchema>['designDna'],
): { name: string; code: string } {
  const mood = designDna.mood || 'neutral'
  const colors = designDna.colors || {}
  const primary = (colors as Record<string, string>).primary || '#3b82f6'
  const typography = designDna.typography || {}
  const fontFamily = (typography as Record<string, string>).fontFamily || 'Inter, system-ui, sans-serif'

  const code = [
    `import React from 'react'`,
    `import { cn } from '@mismo/ui'`,
    ``,
    `export interface ${name}Props {`,
    `  className?: string`,
    `  children?: React.ReactNode`,
    `}`,
    ``,
    `const designTokens = {`,
    `  mood: '${mood}',`,
    `  primary: '${primary}',`,
    `  fontFamily: '${fontFamily}',`,
    `} as const`,
    ``,
    `export function ${name}({ className, children }: ${name}Props) {`,
    `  return (`,
    `    <div`,
    `      className={cn('${name.toLowerCase()}', className)}`,
    `      style={{ fontFamily: designTokens.fontFamily }}`,
    `    >`,
    `      {children}`,
    `    </div>`,
    `  )`,
    `}`,
    ``,
  ].join('\n')

  return { name, code }
}

function generatePage(
  path: string,
  pageContent: Record<string, unknown>,
  componentNames: string[],
): { path: string; code: string } {
  const imports = componentNames
    .map((c) => `import { ${c} } from '@/components/${c}'`)
    .join('\n')

  const sections = Object.entries(pageContent).map(([key, value]) => {
    const sectionTitle = typeof value === 'object' && value !== null && 'title' in value
      ? String((value as Record<string, unknown>).title)
      : key
    return `        <section id="${key}"><h2>${sectionTitle}</h2></section>`
  })

  const code = [
    `import React from 'react'`,
    imports,
    ``,
    `export default function Page() {`,
    `  return (`,
    `    <main>`,
    ...sections,
    `    </main>`,
    `  )`,
    `}`,
    ``,
  ].join('\n')

  return { path, code }
}

function validateGeneratedCode(
  components: Array<{ name: string; code: string }>,
  pages: Array<{ path: string; code: string }>,
  apiClient: string,
): string[] {
  const errors: string[] = []

  for (const comp of components) {
    if (comp.code.includes(': any') || comp.code.includes('<any>')) {
      errors.push(`Component ${comp.name} contains 'any' type`)
    }
  }

  for (const page of pages) {
    if (page.code.includes(': any') || page.code.includes('<any>')) {
      errors.push(`Page ${page.path} contains 'any' type`)
    }
  }

  if (apiClient.includes(': any') || apiClient.includes('<any>')) {
    errors.push(`API client contains 'any' type`)
  }

  return errors
}

app.post('/generate', async (req, res) => {
  let buildId: string | undefined

  try {
    const parsed = GenerateRequestSchema.parse(req.body)
    buildId = parsed.buildId

    const componentNames: string[] = []
    const contentEntries = Object.entries(parsed.contentJson)

    for (const [key] of contentEntries) {
      const name = key.charAt(0).toUpperCase() + key.slice(1).replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
      componentNames.push(name)
    }

    const components = componentNames.map((name) =>
      generateComponent(name, parsed.designDna),
    )

    const pages: Array<{ path: string; code: string }> = []
    for (const [key, value] of contentEntries) {
      const pagePath = `/${key === 'home' ? '' : key}`
      pages.push(generatePage(pagePath, value as Record<string, unknown>, componentNames))
    }

    const apiClient = generateApiClient(parsed.backendTypes)

    const validationErrors = validateGeneratedCode(components, pages, apiClient)
    if (validationErrors.length > 0) {
      const build = await prisma.build.findUnique({ where: { id: buildId } })
      if (build) {
        const existing = Array.isArray(build.errorLogs) ? build.errorLogs : []
        await prisma.build.update({
          where: { id: buildId },
          data: {
            failureCount: { increment: 1 },
            errorLogs: [...(existing as any[]), { source: 'frontend-developer', errors: validationErrors, timestamp: new Date().toISOString() }],
          },
        })
      }

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors,
      })
      return
    }

    res.json({
      success: true,
      components,
      pages,
      apiClient,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)

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
              errorLogs: [...(existing as any[]), { source: 'frontend-developer', error: message, timestamp: new Date().toISOString() }],
            },
          })
        }
      } catch {
        console.error('Failed to log error to Build record')
      }
    }

    res.status(400).json({ success: false, error: message })
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'frontend-developer-agent' })
})

const PORT = Number(process.env.PORT) || 3003
app.listen(PORT, () => {
  console.log(`Frontend Developer Agent listening on :${PORT}`)
})
