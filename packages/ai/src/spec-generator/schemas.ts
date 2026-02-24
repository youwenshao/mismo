import { z } from 'zod'

export const userStorySchema = z.object({
  title: z.string().min(1, 'User story title is required'),
  given: z.string().min(1, 'Given precondition is required'),
  when: z.string().min(1, 'When action is required'),
  then: z.string().min(1, 'Then outcome is required'),
})

export const featureSchema = z.object({
  name: z.string().min(1, 'Feature name is required'),
  description: z.string().min(1, 'Feature description is required'),
  priority: z.enum(['must-have', 'should-have', 'nice-to-have']),
  userStories: z.array(userStorySchema).min(1, 'At least one user story is required per feature'),
})

export const prdContentSchema = z.object({
  overview: z.string().min(1, 'Overview is required'),
  problemStatement: z.string().min(1, 'Problem statement is required'),
  targetUsers: z.string().min(1, 'Target users description is required'),
  features: z.array(featureSchema),
  monetization: z.string().min(1, 'Monetization description is required'),
  constraints: z.array(z.string()),
})

export const generatedPRDSchema = z.object({
  content: prdContentSchema,
  userStories: z.array(featureSchema),
  archTemplate: z.enum(['SERVERLESS_SAAS', 'MONOLITHIC_MVP', 'MICROSERVICES_SCALE']),
  ambiguityScore: z.number().min(0).max(1),
  mermaidDataModel: z.string().min(1),
  generatedAt: z.string().datetime(),
})

export const llmPromptPayloadSchema = z.object({
  systemPrompt: z.string().min(1),
  userPrompt: z.string().min(1),
  extractedData: z.record(z.unknown()),
  requestedOutputSchema: z.string().min(1),
})

export type ValidatedPRDContent = z.infer<typeof prdContentSchema>
export type ValidatedFeature = z.infer<typeof featureSchema>
export type ValidatedUserStory = z.infer<typeof userStorySchema>
export type ValidatedGeneratedPRD = z.infer<typeof generatedPRDSchema>
export type ValidatedLLMPromptPayload = z.infer<typeof llmPromptPayloadSchema>
