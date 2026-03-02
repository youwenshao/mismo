import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { generateObject, type LanguageModel } from 'ai'
import { z } from 'zod'

import { getActiveModel } from '../providers'
import type {
  GeneratedDiff,
  FileDiff,
  GeneratedTest,
  ImpactReport,
  ExtractedContracts,
} from './schema'
import { generatedDiffSchema } from './schema'

interface DiffGenerationConfig {
  cloneDir: string
  model?: LanguageModel
}

const singleFileDiffSchema = z.object({
  filePath: z.string(),
  unifiedDiff: z.string(),
  summary: z.string(),
})

const newFileSchema = z.object({
  filePath: z.string(),
  content: z.string(),
  summary: z.string(),
})

const testGenerationSchema = z.object({
  testFilePath: z.string(),
  testContent: z.string(),
  framework: z.string(),
})

export class DiffGenerationAgent {
  private cloneDir: string
  private model: LanguageModel

  constructor(config: DiffGenerationConfig) {
    this.cloneDir = config.cloneDir
    this.model = config.model ?? getActiveModel()
  }

  async generate(
    impactReport: ImpactReport,
    contracts: ExtractedContracts,
    changeRequest: string,
  ): Promise<GeneratedDiff> {
    const diffs: FileDiff[] = []
    const newTests: GeneratedTest[] = []
    const testFramework = await this.detectTestFramework(this.cloneDir)
    const forbiddenPaths = new Set(
      impactReport.filesToAvoid.map((f) => f.filePath),
    )

    const filesToModify = impactReport.filesToTouch.filter(
      (f) => f.action === 'modify' && f.zone !== 'core' && !forbiddenPaths.has(f.filePath),
    )

    for (const file of filesToModify) {
      try {
        const diff = await this.generateFileDiff(
          file.filePath,
          changeRequest,
          contracts,
        )
        if (diff) diffs.push(diff)
      } catch (err) {
        console.error(`Failed to generate diff for ${file.filePath}:`, err)
      }
    }

    for (const newFile of impactReport.newFilesToCreate) {
      if (forbiddenPaths.has(newFile.filePath)) continue

      try {
        const diff = await this.generateNewFileDiff(
          newFile.filePath,
          newFile.purpose,
          changeRequest,
          contracts,
        )
        if (diff) diffs.push(diff)
      } catch (err) {
        console.error(`Failed to generate new file ${newFile.filePath}:`, err)
      }
    }

    for (const file of filesToModify) {
      try {
        const test = await this.generateTestForFile(
          file.filePath,
          changeRequest,
          testFramework,
        )
        if (test) newTests.push(test)
      } catch (err) {
        console.error(`Failed to generate test for ${file.filePath}:`, err)
      }
    }

    return {
      diffs,
      newTests,
      totalFilesModified: diffs.filter((d) => !d.isNew).length,
      totalFilesCreated: diffs.filter((d) => d.isNew).length,
    }
  }

  private async generateFileDiff(
    filePath: string,
    changeRequest: string,
    contracts: ExtractedContracts,
  ): Promise<FileDiff | null> {
    const fullPath = path.join(this.cloneDir, filePath)
    let currentContent: string
    try {
      currentContent = await fs.readFile(fullPath, 'utf-8')
    } catch {
      console.error(`Cannot read file ${fullPath}, skipping`)
      return null
    }

    const relevantContracts = this.getRelevantContracts(filePath, contracts)

    const { object } = await generateObject({
      model: this.model,
      schema: singleFileDiffSchema,
      system: [
        'You are an expert software engineer generating precise unified diffs.',
        'You must produce valid unified diff format (with --- a/ and +++ b/ headers, @@ line markers).',
        '',
        'Rules:',
        '- Only modify what is necessary to fulfill the change request.',
        '- Respect existing API contracts — do not break backward compatibility.',
        '- Follow BMAD architecture rules: never modify core files, database migrations must be additive only.',
        '- Preserve existing code style, indentation, and conventions.',
        '- If the file uses TypeScript, maintain proper types.',
        '- The diff should be minimal and focused.',
      ].join('\n'),
      prompt: [
        `Change Request: ${changeRequest}`,
        '',
        `File: ${filePath}`,
        '--- Current Content ---',
        currentContent,
        '',
        relevantContracts.length > 0
          ? `--- Relevant Contracts ---\n${JSON.stringify(relevantContracts, null, 2)}`
          : '',
        '',
        'Generate a unified diff for this file to implement the change request.',
        'Include the filePath, the unified diff, and a brief summary of changes.',
      ].join('\n'),
    })

    return {
      filePath: object.filePath,
      isNew: false,
      unifiedDiff: object.unifiedDiff,
      summary: object.summary,
    }
  }

  private async generateNewFileDiff(
    filePath: string,
    purpose: string,
    changeRequest: string,
    contracts: ExtractedContracts,
  ): Promise<FileDiff | null> {
    const relevantContracts = this.getRelevantContracts(filePath, contracts)

    const { object } = await generateObject({
      model: this.model,
      schema: newFileSchema,
      system: [
        'You are an expert software engineer creating new files for a codebase.',
        'Generate the complete content for a new file.',
        '',
        'Rules:',
        '- Follow existing project conventions and code style.',
        '- Include all necessary imports.',
        '- Implement proper error handling.',
        '- If TypeScript, include proper type annotations.',
        '- The file must integrate cleanly with existing contracts.',
      ].join('\n'),
      prompt: [
        `Change Request: ${changeRequest}`,
        '',
        `New File: ${filePath}`,
        `Purpose: ${purpose}`,
        '',
        relevantContracts.length > 0
          ? `--- Relevant Contracts ---\n${JSON.stringify(relevantContracts, null, 2)}`
          : '',
        '',
        'Generate the full content for this new file.',
      ].join('\n'),
    })

    const lines = object.content.split('\n')
    const diffLines = lines.map((line) => `+${line}`).join('\n')
    const unifiedDiff = [
      `--- /dev/null`,
      `+++ b/${filePath}`,
      `@@ -0,0 +1,${lines.length} @@`,
      diffLines,
    ].join('\n')

    return {
      filePath: object.filePath,
      isNew: true,
      unifiedDiff,
      summary: object.summary,
    }
  }

  private async generateTestForFile(
    filePath: string,
    changeRequest: string,
    framework: string,
  ): Promise<GeneratedTest | null> {
    const fullPath = path.join(this.cloneDir, filePath)
    let currentContent: string
    try {
      currentContent = await fs.readFile(fullPath, 'utf-8')
    } catch {
      return null
    }

    const ext = path.extname(filePath)
    const baseName = path.basename(filePath, ext)
    const dir = path.dirname(filePath)
    const testFilePath = path.join(dir, `__tests__`, `${baseName}.test${ext}`)

    const { object } = await generateObject({
      model: this.model,
      schema: testGenerationSchema,
      system: [
        `You are an expert test engineer writing tests using ${framework}.`,
        'Generate comprehensive tests for the modified file.',
        '',
        'Rules:',
        '- Cover the main functionality and edge cases.',
        '- Test error conditions.',
        '- Use descriptive test names.',
        '- Mock external dependencies appropriately.',
        '- Follow the conventions of the test framework.',
      ].join('\n'),
      prompt: [
        `Change Request: ${changeRequest}`,
        `Test Framework: ${framework}`,
        '',
        `Source File: ${filePath}`,
        '--- Source Content ---',
        currentContent,
        '',
        `Generate tests for this file. The test file should be placed at: ${testFilePath}`,
      ].join('\n'),
    })

    return {
      filePath,
      testFilePath: object.testFilePath,
      testContent: object.testContent,
      framework: object.framework,
    }
  }

  private getRelevantContracts(
    filePath: string,
    contracts: ExtractedContracts,
  ): Array<Record<string, unknown>> {
    const relevant: Array<Record<string, unknown>> = []

    for (const api of contracts.apiContracts) {
      if (api.filePath === filePath) {
        relevant.push({ type: 'api', ...api })
      }
    }

    for (const data of contracts.dataContracts) {
      if (data.filePath === filePath) {
        relevant.push({ type: 'data', ...data })
      }
    }

    for (const iface of contracts.interfaceContracts) {
      if (iface.filePath === filePath) {
        relevant.push({ type: 'interface', ...iface })
      }
    }

    return relevant
  }

  private async detectTestFramework(dir: string): Promise<string> {
    const checks: Array<{ files: string[]; framework: string }> = [
      {
        files: ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts'],
        framework: 'vitest',
      },
      {
        files: ['jest.config.ts', 'jest.config.js', 'jest.config.mjs', 'jest.config.cjs'],
        framework: 'jest',
      },
      {
        files: ['pytest.ini', 'conftest.py', 'pyproject.toml'],
        framework: 'pytest',
      },
      {
        files: ['.mocharc.yml', '.mocharc.yaml', '.mocharc.js', '.mocharc.json'],
        framework: 'mocha',
      },
      {
        files: ['karma.conf.js', 'karma.conf.ts'],
        framework: 'karma',
      },
      {
        files: ['cypress.config.ts', 'cypress.config.js'],
        framework: 'cypress',
      },
      {
        files: ['playwright.config.ts', 'playwright.config.js'],
        framework: 'playwright',
      },
    ]

    for (const { files, framework } of checks) {
      for (const file of files) {
        try {
          await fs.access(path.join(dir, file))
          return framework
        } catch {
          // file does not exist, continue
        }
      }
    }

    try {
      const pkgRaw = await fs.readFile(path.join(dir, 'package.json'), 'utf-8')
      const pkg = JSON.parse(pkgRaw) as Record<string, unknown>
      const allDeps = {
        ...(pkg.dependencies as Record<string, string> | undefined),
        ...(pkg.devDependencies as Record<string, string> | undefined),
      }
      if ('vitest' in allDeps) return 'vitest'
      if ('jest' in allDeps) return 'jest'
      if ('mocha' in allDeps) return 'mocha'
    } catch {
      // no package.json or parse error
    }

    return 'vitest'
  }
}
