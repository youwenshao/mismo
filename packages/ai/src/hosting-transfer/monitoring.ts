import * as tls from 'tls'
import type { HealthCheckResult, MonitorAlert } from './schema'

const DOWNTIME_THRESHOLD_MS = 5 * 60 * 1000
const ERROR_RATE_THRESHOLD = 0.01
const CERT_EXPIRY_WARNING_DAYS = 7

export class HealthMonitor {
  async check(url: string): Promise<HealthCheckResult> {
    const checkedAt = new Date().toISOString()

    try {
      const start = Date.now()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)

      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mismo-HealthCheck/1.0' },
      })
      clearTimeout(timeout)

      const responseTimeMs = Date.now() - start

      let errorRate: number | undefined
      try {
        const healthUrl = new URL('/health', url).toString()
        const healthRes = await fetch(healthUrl, {
          headers: { 'User-Agent': 'Mismo-HealthCheck/1.0' },
        })
        if (healthRes.ok) {
          const body = (await healthRes.json()) as {
            errorRate?: number
            error_rate?: number
          }
          errorRate = body.errorRate ?? body.error_rate
        }
      } catch {
        // /health endpoint may not exist
      }

      let certExpiry: string | undefined
      try {
        certExpiry = await this.checkCertExpiry(url)
      } catch {
        // cert check may fail for non-HTTPS
      }

      const status = this.deriveStatus(res.status, responseTimeMs, errorRate)

      return {
        url,
        status,
        statusCode: res.status,
        responseTimeMs,
        errorRate,
        certExpiry,
        checkedAt,
      }
    } catch (err) {
      return {
        url,
        status: 'down',
        checkedAt,
        details: err instanceof Error ? err.message : String(err),
      }
    }
  }

  evaluate(
    result: HealthCheckResult,
    transferId: string,
  ): MonitorAlert[] {
    const alerts: MonitorAlert[] = []

    if (result.status === 'down') {
      alerts.push({
        transferId,
        alertType: 'downtime',
        details: `Service is down: ${result.details ?? 'No response'}`,
        severity: 'critical',
        deploymentUrl: result.url,
        checkedAt: result.checkedAt,
      })
    }

    if (
      result.errorRate !== undefined &&
      result.errorRate > ERROR_RATE_THRESHOLD
    ) {
      alerts.push({
        transferId,
        alertType: 'error_rate',
        details: `Error rate ${(result.errorRate * 100).toFixed(2)}% exceeds ${ERROR_RATE_THRESHOLD * 100}% threshold`,
        severity: result.errorRate > 0.05 ? 'critical' : 'warning',
        deploymentUrl: result.url,
        checkedAt: result.checkedAt,
      })
    }

    if (result.certExpiry) {
      const expiryDate = new Date(result.certExpiry)
      const daysUntilExpiry =
        (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)

      if (daysUntilExpiry < CERT_EXPIRY_WARNING_DAYS) {
        alerts.push({
          transferId,
          alertType: 'cert_expiry',
          details: `SSL certificate expires in ${Math.floor(daysUntilExpiry)} days (${result.certExpiry})`,
          severity: daysUntilExpiry < 1 ? 'critical' : 'warning',
          deploymentUrl: result.url,
          checkedAt: result.checkedAt,
        })
      }
    }

    return alerts
  }

  async sendAlert(alert: MonitorAlert): Promise<void> {
    const webhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL
    if (!webhookUrl) {
      console.warn('[HealthMonitor] No SLACK_ALERT_WEBHOOK_URL configured, logging alert:', alert)
      return
    }

    const emoji = alert.severity === 'critical' ? ':rotating_light:' : ':warning:'
    const color = alert.severity === 'critical' ? '#FF0000' : '#FFA500'

    const payload = {
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${emoji} *Hosting Transfer Alert*\n*Type:* ${alert.alertType}\n*URL:* ${alert.deploymentUrl}\n*Details:* ${alert.details}\n*Transfer ID:* ${alert.transferId}`,
              },
            },
          ],
        },
      ],
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('[HealthMonitor] Failed to send Slack alert:', err)
    }
  }

  private async checkCertExpiry(url: string): Promise<string | undefined> {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return undefined

    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: parsed.hostname,
          port: Number(parsed.port) || 443,
          servername: parsed.hostname,
          timeout: 5000,
        },
        () => {
          const cert = socket.getPeerCertificate()
          socket.destroy()

          if (cert?.valid_to) {
            resolve(new Date(cert.valid_to).toISOString())
          } else {
            resolve(undefined)
          }
        },
      )

      socket.on('error', (err) => {
        socket.destroy()
        reject(err)
      })

      socket.on('timeout', () => {
        socket.destroy()
        reject(new Error('TLS connection timed out'))
      })
    })
  }

  private deriveStatus(
    statusCode: number,
    responseTimeMs: number,
    errorRate?: number,
  ): HealthCheckResult['status'] {
    if (statusCode >= 500) return 'down'
    if (statusCode >= 400) return 'degraded'
    if (responseTimeMs > 5000) return 'degraded'
    if (errorRate !== undefined && errorRate > ERROR_RATE_THRESHOLD)
      return 'degraded'
    return 'healthy'
  }
}
