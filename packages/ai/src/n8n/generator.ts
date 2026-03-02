import { generateObject, type LanguageModel } from 'ai'
import { z } from 'zod'
import { getActiveModel } from '../providers'
import {
  type WorkflowRequest,
  type N8nWorkflow,
  type N8nNode,
  type N8nCredential,
  type N8nConnection,
  workflowRequestSchema,
  n8nWorkflowSchema,
} from './schema'
import {
  resetNodeCounter,
  buildTriggerNode,
  buildIntegrationNode,
  buildErrorTriggerNode,
  buildMockDataNode,
} from './templates'

export interface GeneratedWorkflowBundle {
  workflow: N8nWorkflow
  credentials: N8nCredential[]
  mockDataNode: N8nNode
  envTemplate: Record<string, string>
}

const aiRefinementSchema = z.object({
  nodeAdjustments: z.array(
    z.object({
      nodeName: z.string(),
      parameterOverrides: z.record(z.unknown()),
      rationale: z.string(),
    }),
  ),
  additionalNodes: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      parameters: z.record(z.unknown()),
      insertAfter: z.string(),
      rationale: z.string(),
    }),
  ),
  connectionNotes: z.array(z.string()),
})

export class WorkflowGenerator {
  private model: LanguageModel

  constructor(model?: LanguageModel) {
    this.model = (model ?? getActiveModel()) as LanguageModel
  }

  async generate(input: WorkflowRequest): Promise<GeneratedWorkflowBundle> {
    const request = workflowRequestSchema.parse(input)
    resetNodeCounter()

    const nodes: N8nNode[] = []
    const credentials: N8nCredential[] = []
    const envEntries: Record<string, string> = {}

    const { node: triggerNode, credential: triggerCred } = buildTriggerNode(
      request.trigger.type,
      request.trigger.config,
    )
    nodes.push(triggerNode)
    if (triggerCred) credentials.push(triggerCred)

    for (let i = 0; i < request.actions.length; i++) {
      const action = request.actions[i]
      const { node, credential } = buildIntegrationNode(
        action.integration,
        action.operation,
        action.parameters,
        i,
      )
      nodes.push(node)
      credentials.push(credential)

      const envKey = `${action.integration.toUpperCase().replace(/-/g, '_')}_API_KEY`
      envEntries[envKey] = ''
    }

    if (request.errorHandling && request.monitoringWebhook) {
      const errorNodes = buildErrorTriggerNode(
        request.monitoringWebhook,
        nodes.length,
      )
      nodes.push(...errorNodes)
    }

    const connections = this.buildConnections(nodes)
    const mockDataNode = buildMockDataNode(request.actions)

    let workflow: N8nWorkflow = {
      name: `${request.projectName} Automation`,
      nodes,
      connections,
      active: false,
      settings: {
        executionOrder: 'v1',
        saveManualExecutions: true,
        callerPolicy: 'workflowsFromSameOwner',
      },
      tags: ['mismo-generated', request.projectName],
    }

    try {
      workflow = await this.refineWithAI(workflow, request)
    } catch {
      // AI refinement is best-effort; the structural workflow is valid on its own
    }

    n8nWorkflowSchema.parse(workflow)

    return { workflow, credentials, mockDataNode, envTemplate: envEntries }
  }

  private buildConnections(
    nodes: N8nNode[],
  ): Record<string, Record<string, N8nConnection[][]>> {
    const connections: Record<string, Record<string, N8nConnection[][]>> = {}

    const mainChain = nodes.filter(
      (n) =>
        n.type !== 'n8n-nodes-base.errorTrigger' &&
        n.name !== 'Alert: Workflow Failed',
    )
    const errorTrigger = nodes.find(
      (n) => n.type === 'n8n-nodes-base.errorTrigger',
    )
    const alertNode = nodes.find((n) => n.name === 'Alert: Workflow Failed')

    for (let i = 0; i < mainChain.length - 1; i++) {
      const source = mainChain[i]
      const target = mainChain[i + 1]
      connections[source.name] = {
        main: [[{ node: target.name, type: 'main', index: 0 }]],
      }
    }

    if (errorTrigger && alertNode) {
      connections[errorTrigger.name] = {
        main: [[{ node: alertNode.name, type: 'main', index: 0 }]],
      }
    }

    return connections
  }

  private async refineWithAI(
    workflow: N8nWorkflow,
    request: WorkflowRequest,
  ): Promise<N8nWorkflow> {
    const { object: refinement } = await generateObject({
      model: this.model,
      schema: aiRefinementSchema,
      prompt: [
        'You are an n8n workflow automation expert.',
        `Review and suggest improvements for this workflow: "${workflow.name}".`,
        '',
        '## Workflow Nodes',
        ...workflow.nodes.map(
          (n) =>
            `- ${n.name} (${n.type}): ${JSON.stringify(n.parameters)}`,
        ),
        '',
        '## Original Request',
        `Trigger: ${request.trigger.type}`,
        `Actions: ${request.actions.map((a) => `${a.integration}:${a.operation}`).join(', ')}`,
        '',
        'Suggest parameter improvements, data transformations, or missing nodes.',
        'Only suggest changes that improve reliability; do NOT add unnecessary nodes.',
        'Keep suggestions minimal and practical.',
      ].join('\n'),
      maxOutputTokens: 2000,
    })

    const refined = structuredClone(workflow)

    for (const adj of refinement.nodeAdjustments) {
      const node = refined.nodes.find((n) => n.name === adj.nodeName)
      if (node) {
        node.parameters = { ...node.parameters, ...adj.parameterOverrides }
      }
    }

    return refined
  }
}
