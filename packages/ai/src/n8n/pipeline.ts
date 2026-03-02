import { WorkflowGenerator, type GeneratedWorkflowBundle } from './generator'
import { WorkflowDeployer, type DeploymentMode, type DeploymentResult } from './deploy'
import { WorkflowSandbox, type SandboxConfig } from './sandbox'
import type { WorkflowRequest, SandboxResult } from './schema'

export interface PipelineConfig {
  deploymentMode: DeploymentMode
  sandboxConfig?: SandboxConfig
  managedN8nUrl?: string
  managedN8nApiKey?: string
  monitoringWebhook?: string
  skipSandbox?: boolean
}

export interface PipelineResult {
  generation: GeneratedWorkflowBundle
  sandboxResult?: SandboxResult
  deployment: DeploymentResult
  deliverables: Record<string, string>
}

export class N8nPipeline {
  private generator: WorkflowGenerator
  private deployer: WorkflowDeployer
  private sandbox?: WorkflowSandbox

  constructor(config: PipelineConfig) {
    this.generator = new WorkflowGenerator()
    this.deployer = new WorkflowDeployer()
    if (config.sandboxConfig && !config.skipSandbox) {
      this.sandbox = new WorkflowSandbox(config.sandboxConfig)
    }
  }

  async run(
    request: WorkflowRequest,
    config: PipelineConfig,
  ): Promise<PipelineResult> {
    const generation = await this.generator.generate(request)

    let sandboxResult: SandboxResult | undefined
    if (this.sandbox) {
      sandboxResult = await this.sandbox.runTest(
        generation.workflow,
        generation.mockDataNode,
      )

      if (sandboxResult.infiniteLoopDetected) {
        throw new Error(
          'Sandbox detected an infinite loop in the generated workflow. Aborting deployment.',
        )
      }
    }

    const deployment = await this.deployer.deploy({
      mode: config.deploymentMode,
      workflow: generation.workflow,
      credentials: generation.credentials,
      projectName: request.projectName,
      commissionId: request.commissionId,
      managedN8nUrl: config.managedN8nUrl,
      managedN8nApiKey: config.managedN8nApiKey,
      monitoringWebhook: config.monitoringWebhook,
    })

    const deliverables: Record<string, string> = { ...deployment.artifacts }

    if (!deliverables['.gitignore']) {
      deliverables['.gitignore'] = [
        '.env',
        'node_modules/',
        '.n8n/',
        '*.log',
        '',
      ].join('\n')
    }

    if (sandboxResult) {
      deliverables['test-report.json'] = JSON.stringify(
        {
          testedAt: new Date().toISOString(),
          success: sandboxResult.success,
          infiniteLoopDetected: sandboxResult.infiniteLoopDetected,
          errorPathsCovered: sandboxResult.errorPathsCovered,
          totalExecutionTimeMs: sandboxResult.totalExecutionTimeMs,
          nodeCount: sandboxResult.nodeResults.length,
          nodeResults: sandboxResult.nodeResults.map((n) => ({
            name: n.nodeName,
            type: n.nodeType,
            executionTimeMs: n.executionTimeMs,
            hasError: !!n.error,
          })),
        },
        null,
        2,
      )
    }

    return { generation, sandboxResult, deployment, deliverables }
  }
}
