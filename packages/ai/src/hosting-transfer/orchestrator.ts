import { prisma, type Prisma } from '@mismo/db'
import type {
  TransferRequest,
  VercelTransferConfig,
  PaasTransferConfig,
  CloudTransferConfig,
  SelfHostedConfig,
  DeployResult,
  HostingTransferResult,
} from './schema'
import { TransferRequestSchema } from './schema'
import { VercelDeployer } from './providers/vercel'
import { PaasDeployer } from './providers/paas'
import { CloudDeployer } from './providers/cloud'
import { SelfHostedDeployer } from './providers/self-hosted'
import { HealthMonitor } from './monitoring'

const MAX_RETRIES = 3
const MONITORING_DAYS = 7

export class HostingTransferOrchestrator {
  private vercel = new VercelDeployer()
  private paas = new PaasDeployer()
  private cloud = new CloudDeployer()
  private selfHosted = new SelfHostedDeployer()
  private monitor = new HealthMonitor()

  async initiate(request: TransferRequest): Promise<string> {
    const validated = TransferRequestSchema.parse(request)

    const transfer = await prisma.hostingTransfer.create({
      data: {
        commissionId: validated.commissionId,
        buildId: validated.buildId,
        provider: validated.provider,
        status: 'PENDING_PAYMENT',
        clientAccountId: validated.clientAccountId,
        clientCredentials: validated.clientCredentials as Record<string, string> | undefined,
        stripePaymentIntentId: validated.stripePaymentIntentId,
        idempotencyKey: validated.idempotencyKey,
      },
    })

    return transfer.id
  }

  async onPaymentConfirmed(paymentIntentId: string): Promise<void> {
    const transfer = await prisma.hostingTransfer.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    })

    if (!transfer) {
      console.warn(`No transfer found for payment intent: ${paymentIntentId}`)
      return
    }

    if (transfer.status !== 'PENDING_PAYMENT') {
      return
    }

    await prisma.hostingTransfer.update({
      where: { id: transfer.id },
      data: {
        status: 'PAYMENT_CONFIRMED',
        paymentConfirmedAt: new Date(),
      },
    })

    await this.deploy(transfer.id)
  }

  async deploy(transferId: string): Promise<DeployResult> {
    const transfer = await prisma.hostingTransfer.findUniqueOrThrow({
      where: { id: transferId },
    })

    await prisma.hostingTransfer.update({
      where: { id: transferId },
      data: { status: 'DEPLOYING' },
    })

    let result: DeployResult

    try {
      const config = (transfer.deploymentConfig ?? {}) as Record<string, unknown>

      switch (transfer.provider) {
        case 'VERCEL':
          result = await this.vercel.deploy(config as unknown as VercelTransferConfig)
          break
        case 'RAILWAY':
        case 'RENDER':
          result = await this.paas.deploy(config as unknown as PaasTransferConfig)
          break
        case 'AWS':
        case 'GCP':
          result = await this.cloud.deploy(config as unknown as CloudTransferConfig)
          break
        case 'SELF_HOSTED':
          result = this.selfHosted.deploy(config as unknown as SelfHostedConfig)
          break
        default:
          result = { success: false, error: `Unsupported provider: ${transfer.provider}` }
      }

      if (result.success) {
        await prisma.hostingTransfer.update({
          where: { id: transferId },
          data: {
            status: 'DEPLOYED',
            deploymentUrl: result.deploymentUrl,
            deploymentOutput: (result.output ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        })
      } else {
        await this.handleFailure(transferId, result.error ?? 'Deployment failed')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result = { success: false, error: msg }
      await this.handleFailure(transferId, msg)
    }

    return result
  }

  async transfer(transferId: string): Promise<HostingTransferResult> {
    const transfer = await prisma.hostingTransfer.findUniqueOrThrow({
      where: { id: transferId },
    })

    if (!transfer.clientAccountId) {
      return { success: false, error: 'No client account ID set for transfer' }
    }

    await prisma.hostingTransfer.update({
      where: { id: transferId },
      data: { status: 'TRANSFERRING' },
    })

    let result: HostingTransferResult

    try {
      const config = (transfer.deploymentConfig ?? {}) as Record<string, unknown>
      const projectId =
        (transfer.deploymentOutput as Record<string, unknown> | null)?.projectId as
          | string
          | undefined

      switch (transfer.provider) {
        case 'VERCEL':
          if (!projectId) {
            result = { success: false, error: 'No Vercel project ID from deployment' }
            break
          }
          result = await this.vercel.transfer(projectId, transfer.clientAccountId)
          if (!result.success) {
            const exportData = await this.vercel.exportConfig(
              projectId,
              config as unknown as VercelTransferConfig,
            )
            result = {
              success: true,
              transferOutput: {
                method: 'manual_export',
                ...exportData,
              },
            }
          }
          break
        case 'RAILWAY':
        case 'RENDER':
          if (!projectId) {
            result = { success: false, error: 'No service ID from deployment' }
            break
          }
          result = await this.paas.transfer(
            config as unknown as PaasTransferConfig,
            projectId,
            transfer.clientAccountId,
          )
          break
        case 'AWS':
        case 'GCP':
          result = {
            success: true,
            transferOutput: {
              method: 'direct_deployment',
              note: 'Resources deployed directly in client cloud account via Terraform',
            },
          }
          break
        case 'SELF_HOSTED':
          result = {
            success: true,
            transferOutput: {
              method: 'artifact_delivery',
              note: 'Docker Compose and install script delivered to client',
            },
          }
          break
        default:
          result = { success: false, error: `Unsupported provider: ${transfer.provider}` }
      }

      if (result.success) {
        const shouldMonitor =
          transfer.provider !== 'SELF_HOSTED'

        await prisma.hostingTransfer.update({
          where: { id: transferId },
          data: {
            status: shouldMonitor ? 'MONITORING' : 'COMPLETED',
            transferOutput: (result.transferOutput ?? undefined) as Prisma.InputJsonValue | undefined,
            monitoringEnabled: shouldMonitor,
            monitoringUntil: shouldMonitor
              ? new Date(Date.now() + MONITORING_DAYS * 24 * 60 * 60 * 1000)
              : undefined,
          },
        })
      } else {
        await this.handleFailure(transferId, result.error ?? 'Transfer failed')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result = { success: false, error: msg }
      await this.handleFailure(transferId, msg)
    }

    return result
  }

  async enableMonitoring(transferId: string): Promise<void> {
    await prisma.hostingTransfer.update({
      where: { id: transferId },
      data: {
        monitoringEnabled: true,
        monitoringUntil: new Date(
          Date.now() + MONITORING_DAYS * 24 * 60 * 60 * 1000,
        ),
        status: 'MONITORING',
      },
    })
  }

  async checkHealth(transferId: string): Promise<void> {
    const transfer = await prisma.hostingTransfer.findUniqueOrThrow({
      where: { id: transferId },
    })

    if (!transfer.deploymentUrl) return

    if (
      transfer.monitoringUntil &&
      new Date() > transfer.monitoringUntil
    ) {
      await prisma.hostingTransfer.update({
        where: { id: transferId },
        data: {
          monitoringEnabled: false,
          status: 'COMPLETED',
        },
      })
      return
    }

    const result = await this.monitor.check(transfer.deploymentUrl)

    await prisma.hostingTransfer.update({
      where: { id: transferId },
      data: {
        lastHealthCheck: new Date(),
        healthStatus: result as unknown as Prisma.InputJsonValue,
      },
    })

    const alerts = this.monitor.evaluate(result, transferId)
    for (const alert of alerts) {
      await this.monitor.sendAlert(alert)
    }
  }

  async retry(transferId: string): Promise<DeployResult | HostingTransferResult> {
    const transfer = await prisma.hostingTransfer.findUniqueOrThrow({
      where: { id: transferId },
    })

    if (transfer.status !== 'FAILED') {
      return { success: false, error: `Cannot retry transfer in status: ${transfer.status}` }
    }

    if (transfer.retryCount >= MAX_RETRIES) {
      return { success: false, error: `Max retries (${MAX_RETRIES}) exceeded` }
    }

    await prisma.hostingTransfer.update({
      where: { id: transferId },
      data: {
        retryCount: { increment: 1 },
        status: 'PAYMENT_CONFIRMED',
      },
    })

    return this.deploy(transferId)
  }

  private async handleFailure(
    transferId: string,
    error: string,
  ): Promise<void> {
    const transfer = await prisma.hostingTransfer.findUniqueOrThrow({
      where: { id: transferId },
    })

    const existing = Array.isArray(transfer.errorLogs)
      ? (transfer.errorLogs as Prisma.JsonArray)
      : []

    const newLogs = [
      ...existing,
      { error, timestamp: new Date().toISOString() },
    ] as Prisma.InputJsonValue

    await prisma.hostingTransfer.update({
      where: { id: transferId },
      data: {
        status: 'FAILED',
        failureCount: { increment: 1 },
        errorLogs: newLogs,
      },
    })
  }
}
