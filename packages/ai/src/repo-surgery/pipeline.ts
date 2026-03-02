import { RepoIngestion } from './ingestion'
import { vectorizeRepo } from './vectorization'
import { BoundaryMapper } from './boundary-mapper'
import { ContractExtractor } from './contract-extractor'
import { ImpactAnalysisAgent } from './impact-analysis'
import { DiffGenerationAgent } from './diff-generator'
import { ValidationGates } from './validation-gates'
import { ReviewGenerator } from './review-generator'
import type {
  RepoSurgeryRequest,
  RepoSurgeryResult,
  SurgeryStatus,
  IngestionResult,
  VectorizationResult,
  BoundaryMap,
  ExtractedContracts,
  ImpactReport,
  GeneratedDiff,
  ValidationResult,
  ReviewOutput,
} from './schema'

export interface RepoSurgeryPipelineConfig {
  workspaceDir?: string
  skipValidation?: boolean
  skipReview?: boolean
  githubToken?: string
}

type StatusCallback = (status: SurgeryStatus, detail?: string) => void | Promise<void>

export class RepoSurgeryPipeline {
  private config: Required<RepoSurgeryPipelineConfig>

  constructor(config?: RepoSurgeryPipelineConfig) {
    this.config = {
      workspaceDir: config?.workspaceDir ?? process.env.REPO_SURGERY_WORKSPACE ?? '/tmp/mismo-surgery',
      skipValidation: config?.skipValidation ?? false,
      skipReview: config?.skipReview ?? false,
      githubToken: config?.githubToken ?? process.env.GITHUB_TOKEN ?? '',
    }
  }

  async run(
    surgeryId: string,
    request: RepoSurgeryRequest,
    onStatus?: StatusCallback,
  ): Promise<RepoSurgeryResult> {
    const result: RepoSurgeryResult = {
      surgeryId,
      status: 'INGESTING',
    }

    try {
      await onStatus?.('INGESTING', 'Cloning and analyzing repository')
      const ingestion = await this.ingest(surgeryId, request)
      result.ingestion = ingestion
      result.status = 'VECTORIZING'

      await onStatus?.('VECTORIZING', 'Embedding code into vector store')
      const vectorization = await this.vectorize(surgeryId, ingestion.cloneDir)
      result.vectorization = vectorization
      result.status = 'ANALYZING'

      await onStatus?.('ANALYZING', 'Mapping boundaries and extracting contracts')
      const { boundaryMap, contracts } = await this.analyze(ingestion)
      result.boundaryMap = boundaryMap
      result.contracts = contracts
      result.status = 'MODIFYING'

      await onStatus?.('MODIFYING', 'Generating impact report and diffs')
      const { impactReport, diffs } = await this.modify(
        request,
        vectorization.collectionName,
        boundaryMap,
        contracts,
        ingestion.cloneDir,
      )
      result.impactReport = impactReport
      result.diffs = diffs
      result.status = 'VALIDATING'

      if (!this.config.skipValidation) {
        await onStatus?.('VALIDATING', 'Running validation gates')
        const validation = await this.validate(ingestion.cloneDir, diffs, contracts)
        result.validation = validation

        if (!validation.allPassed) {
          result.status = 'HALTED'
          await onStatus?.('HALTED', validation.haltReason ?? 'Validation gate failed')
          return result
        }
      }

      result.status = 'REVIEWING'

      if (!this.config.skipReview) {
        await onStatus?.('REVIEWING', 'Creating GitHub PR')
        const review = await this.review(
          surgeryId,
          request,
          ingestion.cloneDir,
          diffs,
          result.validation!,
          impactReport,
          boundaryMap,
        )
        result.review = review
      }

      result.status = 'COMPLETED'
      await onStatus?.('COMPLETED', 'Pipeline finished successfully')
      return result
    } catch (error) {
      result.status = 'FAILED'
      await onStatus?.('FAILED', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  private async ingest(surgeryId: string, request: RepoSurgeryRequest): Promise<IngestionResult> {
    const ingestion = new RepoIngestion({ workspaceDir: this.config.workspaceDir })
    return ingestion.ingest(surgeryId, request.repoUrl, request.branch)
  }

  private async vectorize(surgeryId: string, cloneDir: string): Promise<VectorizationResult> {
    return vectorizeRepo(surgeryId, cloneDir)
  }

  private async analyze(
    ingestion: IngestionResult,
  ): Promise<{ boundaryMap: BoundaryMap; contracts: ExtractedContracts }> {
    const [boundaryResult, contracts] = await Promise.all([
      new BoundaryMapper().classifyDirectory(ingestion.cloneDir, ingestion.astData),
      new ContractExtractor().extract(ingestion.cloneDir, ingestion.astData),
    ])

    return {
      boundaryMap: boundaryResult.boundaryMap,
      contracts,
    }
  }

  private async modify(
    request: RepoSurgeryRequest,
    collectionName: string,
    boundaryMap: BoundaryMap,
    contracts: ExtractedContracts,
    cloneDir: string,
  ): Promise<{ impactReport: ImpactReport; diffs: GeneratedDiff }> {
    const impactAgent = new ImpactAnalysisAgent({
      collectionName,
      forbiddenFiles: request.forbiddenFiles,
    })
    const impactReport = await impactAgent.analyze(request.changeRequest, boundaryMap, contracts)

    const diffAgent = new DiffGenerationAgent({ cloneDir })
    const diffs = await diffAgent.generate(impactReport, contracts, request.changeRequest)

    return { impactReport, diffs }
  }

  private async validate(
    cloneDir: string,
    diffs: GeneratedDiff,
    contracts: ExtractedContracts,
  ): Promise<ValidationResult> {
    const gates = new ValidationGates({ cloneDir })
    return gates.runAll(diffs, contracts)
  }

  private async review(
    surgeryId: string,
    request: RepoSurgeryRequest,
    cloneDir: string,
    diffs: GeneratedDiff,
    validation: ValidationResult,
    impactReport: ImpactReport,
    boundaryMap: BoundaryMap,
  ): Promise<ReviewOutput> {
    const reviewer = new ReviewGenerator({
      cloneDir,
      repoUrl: request.repoUrl,
      githubToken: this.config.githubToken,
    })
    return reviewer.generate(
      surgeryId,
      request.changeRequest,
      diffs,
      validation,
      impactReport,
      boundaryMap,
    )
  }
}
