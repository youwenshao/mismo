import { generateObject, type LanguageModel } from 'ai'
import { z } from 'zod'

import { getActiveModel } from '../providers'
import type {
  ImpactReport,
  FileImpact,
  BoundaryMap,
  ExtractedContracts,
} from './schema'
import { impactReportSchema } from './schema'
import { CodeVectorStore, CodeEmbedder } from './vectorization'

interface ImpactAnalysisConfig {
  collectionName: string
  forbiddenFiles?: string[]
  model?: LanguageModel
}

const searchQuerySchema = z.object({
  queries: z.array(z.string()).min(1).max(10),
})

export class ImpactAnalysisAgent {
  private collectionName: string
  private forbiddenFiles: Set<string>
  private model: LanguageModel

  constructor(config: ImpactAnalysisConfig) {
    this.collectionName = config.collectionName
    this.forbiddenFiles = new Set(config.forbiddenFiles ?? [])
    this.model = config.model ?? getActiveModel()
  }

  async analyze(
    changeRequest: string,
    boundaryMap: BoundaryMap,
    contracts: ExtractedContracts,
  ): Promise<ImpactReport> {
    const embedder = new CodeEmbedder()
    const store = new CodeVectorStore()

    const searchQueries = await this.generateSearchQueries(changeRequest)

    const seen = new Set<string>()
    const relevantFiles: Array<{ filePath: string; score: number; content: string }> = []

    for (const query of searchQueries) {
      const queryEmbedding = await embedder.embedSingle(query)
      const results = await store.search(this.collectionName, queryEmbedding, 10)

      for (const { chunk, score } of results) {
        if (!seen.has(chunk.filePath)) {
          seen.add(chunk.filePath)
          relevantFiles.push({
            filePath: chunk.filePath,
            score,
            content: chunk.content,
          })
        }
      }
    }

    const classifiedFiles = this.classifyFiles(relevantFiles, boundaryMap)

    const report = await this.refineWithLLM(
      changeRequest,
      classifiedFiles,
      boundaryMap,
      contracts,
    )

    return report
  }

  private async generateSearchQueries(changeRequest: string): Promise<string[]> {
    const { object } = await generateObject({
      model: this.model,
      schema: searchQuerySchema,
      system: [
        'You are a code search specialist.',
        'Given a change request, produce semantic search queries that will find relevant code in a repository.',
        'Generate varied queries covering different aspects of the change: direct functionality, related systems, dependencies, and edge cases.',
      ].join(' '),
      prompt: `Change request: "${changeRequest}"\n\nGenerate 3-8 semantic search queries to find all code relevant to this change.`,
    })

    return object.queries
  }

  private classifyFiles(
    files: Array<{ filePath: string; score: number; content: string }>,
    boundaryMap: BoundaryMap,
  ): FileImpact[] {
    const coreSet = new Set(boundaryMap.core)
    const shellSet = new Set(boundaryMap.shell)
    const adapterSet = new Set(boundaryMap.adapter)
    const safeSet = new Set(boundaryMap.safeToModify)

    return files.map(({ filePath }) => {
      if (this.forbiddenFiles.has(filePath)) {
        return {
          filePath,
          zone: 'core' as const,
          action: 'avoid' as const,
          risk: 'critical' as const,
          reason: 'File is in the forbidden list',
        }
      }

      if (coreSet.has(filePath)) {
        return {
          filePath,
          zone: 'core' as const,
          action: 'avoid' as const,
          risk: 'critical' as const,
          reason: 'Core file — modifying would risk breaking foundational functionality',
        }
      }

      if (shellSet.has(filePath)) {
        return {
          filePath,
          zone: 'shell' as const,
          action: 'modify' as const,
          risk: 'medium' as const,
          reason: 'Shell file — must maintain backward compatibility',
        }
      }

      if (adapterSet.has(filePath)) {
        return {
          filePath,
          zone: 'adapter' as const,
          action: 'modify' as const,
          risk: 'low' as const,
          reason: 'Adapter file — safe to modify with contract awareness',
        }
      }

      if (safeSet.has(filePath)) {
        return {
          filePath,
          zone: 'safeToModify' as const,
          action: 'modify' as const,
          risk: 'low' as const,
          reason: 'Explicitly marked safe to modify',
        }
      }

      return {
        filePath,
        zone: 'adapter' as const,
        action: 'modify' as const,
        risk: 'medium' as const,
        reason: 'File not in boundary map — treating as adapter with medium risk',
      }
    })
  }

  private async refineWithLLM(
    changeRequest: string,
    classifiedFiles: FileImpact[],
    boundaryMap: BoundaryMap,
    contracts: ExtractedContracts,
  ): Promise<ImpactReport> {
    const { object } = await generateObject({
      model: this.model,
      schema: impactReportSchema,
      system: [
        'You are a senior software architect performing impact analysis for a code change.',
        'You are given a change request, a list of files with their boundary classifications, and existing API/data contracts.',
        'Your job is to refine the file list, suggest new files if needed, and produce a risk assessment.',
        '',
        'Rules:',
        '- NEVER suggest modifying core files. They must stay in filesToAvoid.',
        '- Forbidden files must always be in filesToAvoid with risk "critical".',
        '- Shell files can be modified but must maintain backward compatibility.',
        '- Adapter and safeToModify files are safe targets for changes.',
        '- If the change requires new files (new modules, tests, configs), list them in newFilesToCreate.',
        '- The overallRisk should reflect the highest risk across all files being touched.',
        '- Provide clear reasoning explaining the risk assessment and modification strategy.',
      ].join('\n'),
      prompt: [
        `Change Request: ${changeRequest}`,
        '',
        '--- Classified Files ---',
        JSON.stringify(classifiedFiles, null, 2),
        '',
        '--- Boundary Map ---',
        JSON.stringify(boundaryMap, null, 2),
        '',
        '--- Existing Contracts ---',
        `API Contracts: ${JSON.stringify(contracts.apiContracts, null, 2)}`,
        `Data Contracts: ${JSON.stringify(contracts.dataContracts, null, 2)}`,
        `Interface Contracts: ${JSON.stringify(contracts.interfaceContracts, null, 2)}`,
        '',
        'Refine the impact analysis. Remove files that are not actually relevant,',
        'add any missing files, and provide your overall risk assessment.',
      ].join('\n'),
    })

    return object
  }
}
