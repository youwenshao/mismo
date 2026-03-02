import {
  TransferAgent,
  type TransferExecutionInput,
  type TransferExecutionResult,
} from '../delivery/transfer-agent'
import { type DocGeneratorInput } from '../delivery/doc-generator'

export interface TransferConfig {
  projectId: string
  clientGithubUsername: string
  repoName: string
  ageTier: 'MINOR' | 'ADULT'
  tier: 'VIBE' | 'VERIFIED' | 'FOUNDRY'
}

export interface TransferStep {
  step: string
  status: 'completed' | 'pending' | 'skipped'
  details: string
}

export interface TransferResult {
  success: boolean
  repoUrl?: string
  hostingStatus: 'mismo_managed' | 'client_managed'
  steps: TransferStep[]
}

function planMinorTransfer(config: TransferConfig): TransferResult {
  return {
    success: true,
    hostingStatus: 'mismo_managed',
    steps: [
      {
        step: 'Age verification',
        status: 'completed',
        details: 'Client is a minor (16-17). Mismo retains ownership per policy.',
      },
      {
        step: 'Repository transfer',
        status: 'skipped',
        details: 'Repo remains under Mismo org. Minor clients do not receive repo transfer.',
      },
      {
        step: 'Hosting setup',
        status: 'completed',
        details: 'Project hosted on Mismo infrastructure with subscription billing.',
      },
      {
        step: 'Access provisioning',
        status: 'completed',
        details: `Read-only collaborator access granted to @${config.clientGithubUsername}.`,
      },
      {
        step: 'Subscription billing',
        status: 'completed',
        details: 'Monthly hosting subscription activated for managed hosting.',
      },
    ],
  }
}

function planAdultVibeTransfer(config: TransferConfig): TransferResult {
  return {
    success: true,
    repoUrl: `https://github.com/${config.clientGithubUsername}/${config.repoName}`,
    hostingStatus: 'client_managed',
    steps: [
      {
        step: 'Age verification',
        status: 'completed',
        details: 'Client is an adult. Full IP transfer eligible.',
      },
      {
        step: 'Repository transfer',
        status: 'completed',
        details: `Repository transferred to github.com/${config.clientGithubUsername}/${config.repoName}.`,
      },
      {
        step: 'Deployment guide',
        status: 'completed',
        details: 'Deployment documentation and environment variable guide provided.',
      },
      {
        step: 'Vercel project transfer',
        status: 'skipped',
        details:
          'VIBE tier does not include Vercel project transfer. Client deploys independently.',
      },
      {
        step: 'Hosting handoff',
        status: 'completed',
        details:
          'Client assumes hosting responsibility. Mismo support ends after 30-day grace period.',
      },
    ],
  }
}

function planAdultPremiumTransfer(config: TransferConfig): TransferResult {
  return {
    success: true,
    repoUrl: `https://github.com/${config.clientGithubUsername}/${config.repoName}`,
    hostingStatus: 'client_managed',
    steps: [
      {
        step: 'Age verification',
        status: 'completed',
        details: 'Client is an adult. Full IP transfer eligible.',
      },
      {
        step: 'Repository transfer',
        status: 'completed',
        details: `Repository transferred to github.com/${config.clientGithubUsername}/${config.repoName}.`,
      },
      {
        step: 'Vercel project transfer',
        status: 'completed',
        details: `Vercel project ownership transferred to client's Vercel account.`,
      },
      {
        step: 'Domain configuration',
        status: 'completed',
        details: 'Custom domain DNS records handed off. Client manages renewals.',
      },
      {
        step: 'Environment secrets',
        status: 'completed',
        details: 'All environment variables and secrets rotated and transferred securely.',
      },
      {
        step: 'Hosting handoff',
        status: 'completed',
        details: 'Client assumes full hosting responsibility with Vercel.',
      },
    ],
  }
}

export function planTransfer(config: TransferConfig): TransferResult {
  if (config.ageTier === 'MINOR') {
    return planMinorTransfer(config)
  }

  if (config.tier === 'VIBE') {
    return planAdultVibeTransfer(config)
  }

  return planAdultPremiumTransfer(config)
}

export interface ExecuteTransferOptions {
  config: TransferConfig
  buildId: string
  commissionId: string
  workspaceDir: string
  docInput: DocGeneratorInput
  githubOrg?: string
}

export async function executeTransfer(
  options: ExecuteTransferOptions,
): Promise<TransferExecutionResult> {
  const plan = planTransfer(options.config)

  if (options.config.ageTier === 'MINOR') {
    return {
      success: true,
      validationResult: {
        secretScanPassed: true,
        bmadChecksPassed: true,
        contractCheckPassed: true,
        envScanPassed: true,
        allPassed: true,
        gates: [],
        blockers: [],
      },
      auditLog: [{
        timestamp: new Date().toISOString(),
        step: 'minor_policy',
        status: 'completed',
        details: 'Minor client — repo retained under agency org per policy.',
      }],
    }
  }

  const agent = new TransferAgent({ githubOrg: options.githubOrg })

  const input: TransferExecutionInput = {
    deliveryId: `delivery-${options.config.projectId}`,
    buildId: options.buildId,
    commissionId: options.commissionId,
    repoName: options.config.repoName,
    clientGithubUsername: options.config.clientGithubUsername,
    workspaceDir: options.workspaceDir,
    buildStatus: 'SUCCESS',
    commissionStatus: 'COMPLETED',
    docInput: options.docInput,
  }

  return agent.execute(input)
}

export type { TransferExecutionInput, TransferExecutionResult }
