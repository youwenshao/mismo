import { NodeSSH } from 'node-ssh'
import type { MonitorState } from '../state'
import type { AlertRouter } from '../alerts/router'
import type { SecurityEvent } from '../collectors/security'

interface FarmConfig {
  ssh: { user: string; keyPath: string }
  studios: Array<{ id: string; host: string; role: string }>
}

export class SecurityResponder {
  constructor(
    private config: FarmConfig,
    private alertRouter: AlertRouter,
  ) {}

  async evaluate(studioId: string, events: SecurityEvent[], state: MonitorState): Promise<void> {
    for (const event of events) {
      switch (event.type) {
        case 'ssh_failure':
          await this.handleSshFailure(studioId, event, state)
          break
        case 'outbound_anomaly':
          await this.handleOutboundAnomaly(studioId, event, state)
          break
        case 'credential_expiry':
          await this.handleCredentialExpiry(event, state)
          break
      }
    }
  }

  private async handleSshFailure(studioId: string, event: SecurityEvent, state: MonitorState): Promise<void> {
    if (!event.sourceIp) return
    const alertKey = `ssh-fail-${studioId}-${event.sourceIp}`
    if (!state.shouldAlert(alertKey, 'P0')) return

    await this.alertRouter.send('P0', 'SECURITY', `Unauthorized SSH attempt on ${studioId}`,
      `Failed SSH from ${event.sourceIp}. Banning IP via pf.`, studioId)
    state.recordAlert(alertKey, 'P0')

    await this.banIp(studioId, event.sourceIp)
  }

  private async handleOutboundAnomaly(studioId: string, event: SecurityEvent, state: MonitorState): Promise<void> {
    const alertKey = `outbound-${studioId}`
    if (!state.shouldAlert(alertKey, 'P0')) return

    await this.alertRouter.send('P0', 'SECURITY', `Suspicious outbound traffic on ${studioId}`,
      event.details, studioId)
    state.recordAlert(alertKey, 'P0')
  }

  private async handleCredentialExpiry(event: SecurityEvent, state: MonitorState): Promise<void> {
    const alertKey = `cred-expiry-${event.service}`
    if (!state.shouldAlert(alertKey, 'P1')) return

    await this.alertRouter.send('P1', 'SECURITY', `Credential rotation needed: ${event.service}`,
      event.details)
    state.recordAlert(alertKey, 'P1')
  }

  private async banIp(studioId: string, ip: string): Promise<void> {
    const host = this.config.studios.find(s => s.id === studioId)?.host
    if (!host) return

    const ssh = new NodeSSH()
    try {
      await ssh.connect({
        host,
        username: this.config.ssh.user,
        privateKeyPath: this.config.ssh.keyPath,
        readyTimeout: 10_000,
      })
      await ssh.execCommand(`sudo pfctl -t blocked_ips -T add ${ip} 2>/dev/null || true`)
      console.log(`[security-responder] Banned IP ${ip} on ${studioId}`)
    } catch (err) {
      console.error(`[security-responder] Failed to ban IP ${ip} on ${studioId}:`, err)
    } finally {
      ssh.dispose()
    }
  }
}
