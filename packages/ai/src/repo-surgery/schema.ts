import { z } from 'zod'

export const boundaryZoneSchema = z.enum(['core', 'shell', 'adapter', 'safeToModify'])

export const riskLevelSchema = z.enum(['low', 'medium', 'high', 'critical'])

export const surgeryStatusSchema = z.enum([
  'INGESTING',
  'VECTORIZING',
  'ANALYZING',
  'MODIFYING',
  'VALIDATING',
  'REVIEWING',
  'COMPLETED',
  'FAILED',
  'HALTED',
])

// --- Ingestion Types ---

export const functionSignatureSchema = z.object({
  name: z.string(),
  filePath: z.string(),
  line: z.number(),
  params: z.array(z.string()),
  returnType: z.string().optional(),
  exported: z.boolean().default(false),
  className: z.string().optional(),
})

export const apiRouteSchema = z.object({
  method: z.string(),
  path: z.string(),
  filePath: z.string(),
  line: z.number(),
  handler: z.string().optional(),
  params: z.array(z.string()).default([]),
  responseType: z.string().optional(),
})

export const databaseSchemaEntry = z.object({
  name: z.string(),
  type: z.enum(['table', 'model', 'collection', 'entity']),
  filePath: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      nullable: z.boolean().default(false),
      isPrimary: z.boolean().default(false),
      isRelation: z.boolean().default(false),
    }),
  ),
})

export const astDataSchema = z.object({
  functions: z.array(functionSignatureSchema),
  routes: z.array(apiRouteSchema),
  schemas: z.array(databaseSchemaEntry),
})

export const clocStatsSchema = z.object({
  totalFiles: z.number(),
  totalLines: z.number(),
  languages: z.record(
    z.object({
      files: z.number(),
      blank: z.number(),
      comment: z.number(),
      code: z.number(),
    }),
  ),
})

export const dependencyInfoSchema = z.object({
  name: z.string(),
  current: z.string(),
  latest: z.string().optional(),
  outdated: z.boolean().default(false),
  type: z.enum(['production', 'development']).default('production'),
})

export const recentActivitySchema = z.object({
  totalCommits: z.number(),
  contributors: z.array(
    z.object({
      name: z.string(),
      email: z.string(),
      commitCount: z.number(),
    }),
  ),
  hotFiles: z.array(
    z.object({
      filePath: z.string(),
      changeCount: z.number(),
      lastModified: z.string(),
    }),
  ),
  lastCommitDate: z.string(),
})

export const ingestionResultSchema = z.object({
  surgeryId: z.string(),
  cloneDir: z.string(),
  clocStats: clocStatsSchema,
  dependencies: z.array(dependencyInfoSchema),
  recentActivity: recentActivitySchema,
  astData: astDataSchema,
})

// --- Vectorization Types ---

export const vectorizationResultSchema = z.object({
  surgeryId: z.string(),
  collectionName: z.string(),
  chunkCount: z.number(),
  embeddingModel: z.string(),
  dimensions: z.number(),
})

export const codeChunkSchema = z.object({
  filePath: z.string(),
  language: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  content: z.string(),
  functionName: z.string().optional(),
  className: z.string().optional(),
})

// --- Boundary Mapping Types ---

export const boundaryMapSchema = z.object({
  core: z.array(z.string()),
  shell: z.array(z.string()),
  adapter: z.array(z.string()),
  safeToModify: z.array(z.string()),
})

export const fileClassificationSchema = z.object({
  filePath: z.string(),
  zone: boundaryZoneSchema,
  reason: z.string(),
  dependentCount: z.number().default(0),
  dependencyCount: z.number().default(0),
})

// --- Contract Extraction Types ---

export const apiContractSchema = z.object({
  method: z.string(),
  path: z.string(),
  requestSchema: z.unknown().optional(),
  responseSchema: z.unknown().optional(),
  statusCodes: z.array(z.number()).default([200]),
  filePath: z.string(),
})

export const dataContractSchema = z.object({
  modelName: z.string(),
  tableName: z.string().optional(),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean().default(true),
    }),
  ),
  filePath: z.string(),
})

export const interfaceContractSchema = z.object({
  service: z.string(),
  method: z.string(),
  url: z.string().optional(),
  expectedRequest: z.unknown().optional(),
  expectedResponse: z.unknown().optional(),
  filePath: z.string(),
})

export const extractedContractsSchema = z.object({
  apiContracts: z.array(apiContractSchema),
  dataContracts: z.array(dataContractSchema),
  interfaceContracts: z.array(interfaceContractSchema),
})

// --- Impact Analysis Types ---

export const fileImpactSchema = z.object({
  filePath: z.string(),
  zone: boundaryZoneSchema,
  action: z.enum(['modify', 'create', 'avoid']),
  risk: riskLevelSchema,
  reason: z.string(),
})

export const impactReportSchema = z.object({
  changeRequest: z.string(),
  filesToTouch: z.array(fileImpactSchema),
  filesToAvoid: z.array(fileImpactSchema),
  newFilesToCreate: z.array(
    z.object({
      filePath: z.string(),
      purpose: z.string(),
    }),
  ),
  overallRisk: riskLevelSchema,
  reasoning: z.string(),
})

// --- Diff Generation Types ---

export const fileDiffSchema = z.object({
  filePath: z.string(),
  isNew: z.boolean().default(false),
  unifiedDiff: z.string(),
  summary: z.string(),
})

export const generatedTestSchema = z.object({
  filePath: z.string(),
  testFilePath: z.string(),
  testContent: z.string(),
  framework: z.string(),
})

export const generatedDiffSchema = z.object({
  diffs: z.array(fileDiffSchema),
  newTests: z.array(generatedTestSchema),
  totalFilesModified: z.number(),
  totalFilesCreated: z.number(),
})

// --- Validation Types ---

export const gateResultSchema = z.object({
  name: z.string(),
  gate: z.number().min(1).max(4),
  passed: z.boolean(),
  details: z.string(),
  blockers: z.array(z.string()).default([]),
  duration: z.number().optional(),
})

export const validationResultSchema = z.object({
  gates: z.array(gateResultSchema),
  allPassed: z.boolean(),
  haltReason: z.string().optional(),
})

// --- Review Types ---

export const reviewOutputSchema = z.object({
  prUrl: z.string(),
  prNumber: z.number(),
  confidenceScore: z.number().min(0).max(100),
  confidenceLabel: z.enum(['safe-to-merge', 'review-recommended', 'manual-review-required']),
  riskSummary: z.string(),
  surgeryBranch: z.string(),
  rollbackBranch: z.string(),
  filesChanged: z.number(),
  additions: z.number(),
  deletions: z.number(),
})

// --- Pipeline Request/Response ---

export const repoSurgeryRequestSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string().default('main'),
  changeRequest: z.string().min(1),
  forbiddenFiles: z.array(z.string()).default([]),
  prdJson: z.unknown().optional(),
  commissionId: z.string().optional(),
})

export const repoSurgeryResultSchema = z.object({
  surgeryId: z.string(),
  status: surgeryStatusSchema,
  ingestion: ingestionResultSchema.optional(),
  vectorization: vectorizationResultSchema.optional(),
  boundaryMap: boundaryMapSchema.optional(),
  contracts: extractedContractsSchema.optional(),
  impactReport: impactReportSchema.optional(),
  diffs: generatedDiffSchema.optional(),
  validation: validationResultSchema.optional(),
  review: reviewOutputSchema.optional(),
})

// --- Inferred Types ---

export type BoundaryZone = z.infer<typeof boundaryZoneSchema>
export type RiskLevel = z.infer<typeof riskLevelSchema>
export type SurgeryStatus = z.infer<typeof surgeryStatusSchema>
export type FunctionSignature = z.infer<typeof functionSignatureSchema>
export type APIRoute = z.infer<typeof apiRouteSchema>
export type DatabaseSchemaEntry = z.infer<typeof databaseSchemaEntry>
export type ASTData = z.infer<typeof astDataSchema>
export type ClocStats = z.infer<typeof clocStatsSchema>
export type DependencyInfo = z.infer<typeof dependencyInfoSchema>
export type RecentActivity = z.infer<typeof recentActivitySchema>
export type IngestionResult = z.infer<typeof ingestionResultSchema>
export type VectorizationResult = z.infer<typeof vectorizationResultSchema>
export type CodeChunk = z.infer<typeof codeChunkSchema>
export type BoundaryMap = z.infer<typeof boundaryMapSchema>
export type FileClassification = z.infer<typeof fileClassificationSchema>
export type ApiContract = z.infer<typeof apiContractSchema>
export type DataContract = z.infer<typeof dataContractSchema>
export type InterfaceContract = z.infer<typeof interfaceContractSchema>
export type ExtractedContracts = z.infer<typeof extractedContractsSchema>
export type FileImpact = z.infer<typeof fileImpactSchema>
export type ImpactReport = z.infer<typeof impactReportSchema>
export type FileDiff = z.infer<typeof fileDiffSchema>
export type GeneratedTest = z.infer<typeof generatedTestSchema>
export type GeneratedDiff = z.infer<typeof generatedDiffSchema>
export type GateResult = z.infer<typeof gateResultSchema>
export type ValidationResult = z.infer<typeof validationResultSchema>
export type ReviewOutput = z.infer<typeof reviewOutputSchema>
export type RepoSurgeryRequest = z.infer<typeof repoSurgeryRequestSchema>
export type RepoSurgeryResult = z.infer<typeof repoSurgeryResultSchema>
