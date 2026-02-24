export interface BuildReport {
  projectId: string
  stage: string
  status: 'pending' | 'running' | 'success' | 'failed'
  output: string
  timestamp: string
  metrics?: {
    lighthouseScore?: number
    vulnerabilities?: { critical: number; high: number; medium: number; low: number }
    testsPassed?: number
    testsFailed?: number
  }
}

export function createBuildReport(
  params: Partial<BuildReport> & { projectId: string; stage: string },
): BuildReport {
  return {
    status: 'pending',
    output: '',
    timestamp: new Date().toISOString(),
    ...params,
  }
}
