import * as fs from 'fs'
import * as path from 'path'

import {
  GitHubClient,
  type GitTreeFile,
  type RepoCreateOptions,
  type RepoInfo,
} from './github-client'
import {
  generateDeliveryDocuments,
  documentFilesFromGenerated,
  type DocGeneratorInput,
} from './doc-generator'
import {
  validatePreTransfer,
  type PreTransferValidationInput,
  type PreTransferValidationResult,
} from './pre-transfer-validator'

export interface AuditEntry {
  timestamp: string
  step: string
  status: 'started' | 'completed' | 'failed' | 'retrying'
  details: string
  durationMs?: number
}

export interface TransferAgentConfig {
  githubToken?: string
  githubOrg?: string
  maxInviteRetries?: number
}

export interface TransferExecutionInput {
  deliveryId: string
  buildId: string
  commissionId: string
  repoName: string
  clientGithubUsername?: string
  clientGithubOrg?: string
  workspaceDir: string
  buildStatus: string
  commissionStatus: string
  templateOwner?: string
  templateRepo?: string
  docInput: DocGeneratorInput
  apiContracts?: PreTransferValidationInput['apiContracts']
  implementedRoutes?: PreTransferValidationInput['implementedRoutes']
}

export interface TransferExecutionResult {
  success: boolean
  repoUrl?: string
  transferredRepoUrl?: string
  validationResult: PreTransferValidationResult
  auditLog: AuditEntry[]
  error?: string
  deliverables?: string[]
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', '.next', '.turbo', '__pycache__',
  '.venv', 'vendor', '.cache', '.env',
])

function collectWorkspaceFiles(dir: string, basePath = ''): GitTreeFile[] {
  const results: GitTreeFile[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      results.push(...collectWorkspaceFiles(fullPath, relativePath))
    } else if (entry.isFile()) {
      if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue
      try {
        const stat = fs.statSync(fullPath)
        if (stat.size > 5_000_000) continue
        const content = fs.readFileSync(fullPath, 'utf-8')
        results.push({ path: relativePath, content })
      } catch {
        // skip binary or unreadable files
      }
    }
  }

  return results
}

export class TransferAgent {
  private github: GitHubClient
  private org: string
  private maxRetries: number
  private auditLog: AuditEntry[] = []

  constructor(config: TransferAgentConfig = {}) {
    this.github = new GitHubClient(config.githubToken)
    this.org = config.githubOrg ?? process.env.GITHUB_DELIVERY_ORG ?? process.env.GITHUB_ORG ?? 'mismo-agency'
    this.maxRetries = config.maxInviteRetries ?? 3
  }

  async execute(input: TransferExecutionInput): Promise<TransferExecutionResult> {
    this.auditLog = []

    const validation = await this.runValidation(input)
    if (!validation.allPassed) {
      this.log('pre_transfer_validation', 'failed', `Blocked: ${validation.blockers.join('; ')}`)
      return {
        success: false,
        validationResult: validation,
        auditLog: this.auditLog,
        error: `Pre-transfer validation failed: ${validation.blockers.join('; ')}`,
      }
    }

    let repoInfo: RepoInfo
    try {
      repoInfo = await this.createRepository(input)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        validationResult: validation,
        auditLog: this.auditLog,
        error: `Repository creation failed: ${msg}`,
      }
    }

    const [owner, repo] = repoInfo.fullName.split('/')

    try {
      await this.pushCode(owner, repo, input)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        repoUrl: repoInfo.htmlUrl,
        validationResult: validation,
        auditLog: this.auditLog,
        error: `Code push failed: ${msg}`,
      }
    }

    let docPaths: string[] = []
    try {
      docPaths = await this.generateAndPushDocs(owner, repo, input)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log('doc_generation', 'failed', msg)
    }

    try {
      await this.setupBranches(owner, repo)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log('branch_setup', 'failed', msg)
    }

    try {
      await this.tagRelease(owner, repo)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log('tag_release', 'failed', msg)
    }

    const clientTarget = input.clientGithubOrg ?? input.clientGithubUsername
    if (!clientTarget) {
      this.log('transfer', 'completed', 'No client GitHub account specified. Repo remains under agency org.')
      return {
        success: true,
        repoUrl: repoInfo.htmlUrl,
        validationResult: validation,
        auditLog: this.auditLog,
        deliverables: docPaths,
      }
    }

    let transferredUrl: string | undefined
    try {
      transferredUrl = await this.transferOwnership(
        owner,
        repo,
        input.clientGithubUsername!,
        clientTarget,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        repoUrl: repoInfo.htmlUrl,
        validationResult: validation,
        auditLog: this.auditLog,
        error: `Transfer failed: ${msg}`,
        deliverables: docPaths,
      }
    }

    return {
      success: true,
      repoUrl: repoInfo.htmlUrl,
      transferredRepoUrl: transferredUrl,
      validationResult: validation,
      auditLog: this.auditLog,
      deliverables: docPaths,
    }
  }

  private async runValidation(
    input: TransferExecutionInput,
  ): Promise<PreTransferValidationResult> {
    this.log('pre_transfer_validation', 'started', 'Running secret scan, BMAD checks, contract diff, env scan')
    const start = Date.now()

    const result = await validatePreTransfer({
      workspaceDir: input.workspaceDir,
      buildStatus: input.buildStatus,
      commissionStatus: input.commissionStatus,
      apiContracts: input.apiContracts,
      implementedRoutes: input.implementedRoutes,
    })

    this.log(
      'pre_transfer_validation',
      result.allPassed ? 'completed' : 'failed',
      result.allPassed
        ? 'All 4 validation gates passed'
        : `${result.blockers.length} blocker(s) found`,
      Date.now() - start,
    )

    return result
  }

  private async createRepository(
    input: TransferExecutionInput,
  ): Promise<RepoInfo> {
    this.log('create_repo', 'started', `Creating ${this.org}/${input.repoName}`)
    const start = Date.now()

    let repoInfo: RepoInfo
    if (input.templateOwner && input.templateRepo) {
      repoInfo = await this.github.createFromTemplate(
        input.templateOwner,
        input.templateRepo,
        this.org,
        input.repoName,
      )
    } else {
      const options: RepoCreateOptions = {
        private: true,
        autoInit: true,
        licenseTemplate: 'mit',
        gitignoreTemplate: 'Node',
      }
      repoInfo = await this.github.createRepo(this.org, input.repoName, options)
    }

    this.log('create_repo', 'completed', `Created ${repoInfo.fullName}`, Date.now() - start)
    return repoInfo
  }

  private async pushCode(
    owner: string,
    repo: string,
    input: TransferExecutionInput,
  ): Promise<void> {
    this.log('push_code', 'started', `Pushing build output from ${input.workspaceDir}`)
    const start = Date.now()

    const files = collectWorkspaceFiles(input.workspaceDir)
    if (files.length === 0) {
      throw new Error(`No files found in workspace: ${input.workspaceDir}`)
    }

    await this.github.pushTreeCommit(
      owner,
      repo,
      files,
      `feat: initial project delivery\n\nBuild ID: ${input.buildId}\nCommission: ${input.commissionId}`,
    )

    this.log('push_code', 'completed', `Pushed ${files.length} files`, Date.now() - start)
  }

  private async generateAndPushDocs(
    owner: string,
    repo: string,
    input: TransferExecutionInput,
  ): Promise<string[]> {
    this.log('generate_docs', 'started', 'Generating BMAD delivery documents')
    const start = Date.now()

    const docs = generateDeliveryDocuments(input.docInput)
    const docFiles = documentFilesFromGenerated(docs)

    const treeFiles: GitTreeFile[] = docFiles.map((f) => ({
      path: f.path,
      content: f.content,
    }))

    treeFiles.push({
      path: 'CONTRACTS.json',
      content: docs.apiContracts,
    })
    treeFiles.push({
      path: 'ARCHITECTURE.md',
      content: docs.architectureDecisionRecord,
    })

    await this.github.pushTreeCommit(
      owner,
      repo,
      treeFiles,
      'docs: add BMAD delivery documentation\n\nIncludes ADR, API contracts, data boundaries, runbook, hosting contract',
    )

    const paths = docFiles.map((f) => f.path)
    this.log('generate_docs', 'completed', `Generated ${paths.length} documents`, Date.now() - start)
    return paths
  }

  private async setupBranches(owner: string, repo: string): Promise<void> {
    this.log('branch_protection', 'started', 'Setting up branch protection and development branch')
    const start = Date.now()

    await this.github.setupBranchProtection(owner, repo, 'main', {
      requiredReviewers: 1,
      dismissStaleReviews: true,
      enforceAdmins: true,
      allowForcePushes: false,
      allowDeletions: false,
    })

    await this.github.createBranch(owner, repo, 'development', 'main')

    this.log('branch_protection', 'completed', 'main protected, development branch created', Date.now() - start)
  }

  private async tagRelease(owner: string, repo: string): Promise<void> {
    this.log('tag_release', 'started', 'Creating v1.0.0 tag')
    const start = Date.now()

    const sha = await this.github.getLatestCommitSha(owner, repo, 'main')
    await this.github.createTag(owner, repo, 'v1.0.0', sha, 'Initial delivery release')

    this.log('tag_release', 'completed', 'Tagged v1.0.0', Date.now() - start)
  }

  private async transferOwnership(
    owner: string,
    repo: string,
    clientUsername: string,
    transferTarget: string,
  ): Promise<string> {
    this.log('invite_collaborator', 'started', `Inviting @${clientUsername} as admin`)
    let inviteStart = Date.now()

    let lastInviteId: number | undefined

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const invite = await this.github.inviteCollaborator(owner, repo, clientUsername, 'admin')
        lastInviteId = invite.invitationId
        this.log('invite_collaborator', 'completed', `Invitation #${invite.invitationId} sent (attempt ${attempt})`, Date.now() - inviteStart)
        break
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (attempt === this.maxRetries) {
          this.log('invite_collaborator', 'failed', `All ${this.maxRetries} invite attempts failed: ${msg}`)
          throw new Error(`Failed to invite collaborator after ${this.maxRetries} attempts: ${msg}`)
        }
        this.log('invite_collaborator', 'retrying', `Attempt ${attempt} failed: ${msg}. Retrying...`)
        inviteStart = Date.now()
      }
    }

    if (lastInviteId !== undefined) {
      this.log('await_acceptance', 'started', `Waiting for @${clientUsername} to accept invitation`)
      const accepted = await this.pollInviteAcceptance(owner, repo, lastInviteId)

      if (!accepted) {
        this.log('await_acceptance', 'failed', `Invitation not accepted after ${this.maxRetries} retry cycles`)
        throw new Error('Client did not accept invitation within the allowed window')
      }
      this.log('await_acceptance', 'completed', 'Invitation accepted')
    }

    this.log('transfer_repo', 'started', `Transferring ${owner}/${repo} to ${transferTarget}`)
    const transferStart = Date.now()

    const result = await this.github.transferRepo(owner, repo, transferTarget)
    if (!result.success) {
      this.log('transfer_repo', 'failed', result.newUrl ?? 'Unknown error')
      throw new Error(`Repository transfer failed: ${result.newUrl}`)
    }

    this.log('transfer_repo', 'completed', `Transferred to ${result.newUrl}`, Date.now() - transferStart)

    this.log('verify_access', 'started', `Verifying @${clientUsername} has admin access`)
    try {
      const newOwner = transferTarget
      const perm = await this.github.verifyAdminAccess(newOwner, repo, clientUsername)
      if (perm.permission === 'admin') {
        this.log('verify_access', 'completed', `@${clientUsername} confirmed as admin`)
      } else {
        this.log('verify_access', 'failed', `@${clientUsername} has ${perm.permission} access, expected admin`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log('verify_access', 'failed', `Verification error: ${msg}`)
    }

    return result.newUrl!
  }

  private async pollInviteAcceptance(
    owner: string,
    repo: string,
    invitationId: number,
  ): Promise<boolean> {
    const maxChecks = 6
    const intervalMs = 4 * 60 * 60 * 1000

    for (let check = 0; check < maxChecks; check++) {
      const status = await this.github.checkInviteStatus(owner, repo, invitationId)

      if (status === 'accepted') return true
      if (status === 'expired') return false

      if (check < maxChecks - 1) {
        await sleep(intervalMs)
      }
    }

    return false
  }

  private log(step: string, status: AuditEntry['status'], details: string, durationMs?: number): void {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      step,
      status,
      details,
      durationMs,
    })
  }

  getAuditLog(): AuditEntry[] {
    return [...this.auditLog]
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
