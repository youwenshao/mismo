import { NextRequest, NextResponse } from 'next/server'

interface PipelineStage {
  name: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  startedAt: string | null
  finishedAt: string | null
  output: string
}

interface PipelineStatus {
  projectId: string
  pipelineId: string
  commit: string
  branch: string
  triggeredAt: string
  stages: PipelineStage[]
}

const MOCK_STAGES: PipelineStage[] = [
  {
    name: 'lint-and-typecheck',
    status: 'success',
    startedAt: '2025-06-01T10:00:00Z',
    finishedAt: '2025-06-01T10:01:12Z',
    output: 'All lint rules passed. No type errors found.',
  },
  {
    name: 'build',
    status: 'success',
    startedAt: '2025-06-01T10:01:15Z',
    finishedAt: '2025-06-01T10:03:45Z',
    output: 'Build completed successfully.',
  },
  {
    name: 'e2e-tests',
    status: 'running',
    startedAt: '2025-06-01T10:03:50Z',
    finishedAt: null,
    output: 'Running 12 test files… 8/12 passed so far.',
  },
  {
    name: 'security-scan',
    status: 'pending',
    startedAt: null,
    finishedAt: null,
    output: '',
  },
  {
    name: 'lighthouse',
    status: 'pending',
    startedAt: null,
    finishedAt: null,
    output: '',
  },
  {
    name: 'deployment',
    status: 'pending',
    startedAt: null,
    finishedAt: null,
    output: '',
  },
]

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: projectId' },
      { status: 400 },
    )
  }

  const response: PipelineStatus = {
    projectId,
    pipelineId: `pipe_${projectId}_001`,
    commit: 'a1b2c3d',
    branch: 'main',
    triggeredAt: '2025-06-01T10:00:00Z',
    stages: MOCK_STAGES,
  }

  return NextResponse.json(response)
}
