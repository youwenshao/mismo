import { NextRequest, NextResponse } from 'next/server'
import { WorkflowGenerator, workflowRequestSchema } from '@mismo/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = workflowRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const generator = new WorkflowGenerator()
    const bundle = await generator.generate(parsed.data)

    return NextResponse.json({
      workflow: bundle.workflow,
      credentials: bundle.credentials.map((c) => ({
        name: c.name,
        type: c.type,
      })),
      envTemplate: bundle.envTemplate,
      mockDataNode: bundle.mockDataNode,
    })
  } catch (err) {
    console.error('Workflow generation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 },
    )
  }
}
