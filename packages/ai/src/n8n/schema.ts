import { z } from 'zod'

export const triggerTypeSchema = z.enum(['webhook', 'schedule', 'manual'])

export const integrationSchema = z.enum([
  'slack',
  'notion',
  'google-sheets',
  'email',
  'custom-api',
])

export const n8nCredentialSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  data: z.record(z.string()).optional(),
})

export const n8nNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  typeVersion: z.number().default(1),
  position: z.tuple([z.number(), z.number()]),
  parameters: z.record(z.unknown()).default({}),
  credentials: z.record(z.object({ id: z.string(), name: z.string() })).optional(),
})

export const n8nConnectionSchema = z.object({
  node: z.string(),
  type: z.string().default('main'),
  index: z.number().default(0),
})

export const n8nWorkflowSchema = z.object({
  name: z.string(),
  nodes: z.array(n8nNodeSchema),
  connections: z.record(z.record(z.array(z.array(n8nConnectionSchema)))),
  active: z.boolean().default(false),
  settings: z.object({
    executionOrder: z.string().default('v1'),
    saveManualExecutions: z.boolean().default(true),
    callerPolicy: z.string().default('workflowsFromSameOwner'),
  }),
  tags: z.array(z.string()).default([]),
})

export const workflowRequestSchema = z.object({
  projectName: z.string().min(1),
  commissionId: z.string().optional(),
  trigger: z.object({
    type: triggerTypeSchema,
    config: z.record(z.unknown()).default({}),
  }),
  actions: z.array(
    z.object({
      integration: integrationSchema,
      operation: z.string(),
      parameters: z.record(z.unknown()).default({}),
    }),
  ),
  errorHandling: z.boolean().default(true),
  monitoringWebhook: z.string().url().optional(),
})

export const sandboxResultSchema = z.object({
  success: z.boolean(),
  executionId: z.string().optional(),
  nodeResults: z.array(
    z.object({
      nodeName: z.string(),
      nodeType: z.string(),
      input: z.unknown(),
      output: z.unknown(),
      executionTimeMs: z.number(),
      error: z.string().optional(),
    }),
  ),
  infiniteLoopDetected: z.boolean().default(false),
  errorPathsCovered: z.boolean().default(false),
  totalExecutionTimeMs: z.number(),
})

export type TriggerType = z.infer<typeof triggerTypeSchema>
export type Integration = z.infer<typeof integrationSchema>
export type N8nCredential = z.infer<typeof n8nCredentialSchema>
export type N8nNode = z.infer<typeof n8nNodeSchema>
export type N8nConnection = z.infer<typeof n8nConnectionSchema>
export type N8nWorkflow = z.infer<typeof n8nWorkflowSchema>
export type WorkflowRequest = z.infer<typeof workflowRequestSchema>
export type SandboxResult = z.infer<typeof sandboxResultSchema>
