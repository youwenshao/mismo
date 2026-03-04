import { NodeSSH } from 'node-ssh'
import * as net from 'net'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface StudioConfig {
  id: string
  host: string
  role: 'control-plane' | 'worker'
  workerConcurrency: number
}

interface FarmConfig {
  ssh: { user: string; keyPath: string; passphrase?: string }
  supabase: { url: string; serviceRoleKey: string }
  thresholds: { CRED_ROTATION_WARNING_DAYS: number }
}

export interface SecurityEvent {
  type: 'ssh_failure' | 'outbound_anomaly' | 'credential_expiry'
  details: string
  sourceIp?: string
  service?: string
  expiresAt?: string
}

export class SecurityScanner {
  private config: FarmConfig
  private supabase: SupabaseClient | null = null

  constructor(config: FarmConfig) {
    this.config = config
  }

  private getClient(): SupabaseClient {
    if (!this.config.supabase.url) {
      throw new Error('SUPABASE_URL is not configured. Check .env or environment variables.')
    }
    if (!this.supabase) {
      this.supabase = createClient(this.config.supabase.url, this.config.supabase.serviceRoleKey)
    }
    return this.supabase
  }

  async scan(studio: StudioConfig): Promise<SecurityEvent[]> {
    const events: SecurityEvent[] = []

    const isReachable = await new Promise<boolean>((resolve) => {
      const socket = net.connect(22, studio.host, () => {
        socket.end()
        resolve(true)
      })
      socket.setTimeout(5000)
      socket.on('timeout', () => {
        socket.destroy()
        resolve(false)
      })
      socket.on('error', () => {
        resolve(false)
      })
    })

    if (!isReachable) {
      console.error(`[security-scanner] Host ${studio.host} is unreachable on port 22`)
      return events
    }

    const ssh = new NodeSSH()

    try {
      await ssh.connect({
        host: studio.host,
        username: this.config.ssh.user,
        privateKeyPath: this.config.ssh.keyPath,
        passphrase: this.config.ssh.passphrase,
        readyTimeout: 30_000,
      })

      const sshResult = await ssh.execCommand(
        'log show --predicate \'process == "sshd" AND eventMessage CONTAINS "Failed"\' --last 5m --style compact 2>/dev/null | tail -20',
      )
      if (sshResult.stdout.trim()) {
        const lines = sshResult.stdout.trim().split('\n')
        const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g
        const ips = new Set<string>()
        for (const line of lines) {
          const matches = line.match(ipRegex)
          if (matches) matches.forEach((ip) => ips.add(ip))
        }
        for (const ip of ips) {
          events.push({
            type: 'ssh_failure',
            details: `Failed SSH attempts from ${ip} on ${studio.id}`,
            sourceIp: ip,
          })
        }
      }

      const pfResult = await ssh.execCommand("pfctl -sr 2>/dev/null | grep -c 'block' || echo 0")
      const netResult = await ssh.execCommand(
        "netstat -an | grep ESTABLISHED | grep -v '127.0.0.1' | grep -v '::1' | grep -vE ':(443|53|22|5678|6379|5432|3000|3001|3002|3003|3010|3011|3012|3020|3021|3022|3023|3030|3031|3032|3033|3034) ' | wc -l",
      )
      const unexpectedConnections = parseInt(netResult.stdout.trim()) || 0
      if (unexpectedConnections > 100) {
        events.push({
          type: 'outbound_anomaly',
          details: `${unexpectedConnections} connections on unexpected ports on ${studio.id}`,
        })
      }
    } catch (err) {
      console.error(`[security-scanner] Failed to scan ${studio.id}:`, err)
    } finally {
      ssh.dispose()
    }

    if (studio.id === 'studio-1') {
      try {
        const warningDate = new Date(
          Date.now() + this.config.thresholds.CRED_ROTATION_WARNING_DAYS * 86_400_000,
        ).toISOString()
        const { data } = await this.getClient()
          .from('Credential')
          .select('id, service, rotationDate, commissionId')
          .lt('rotationDate', warningDate)
          .not('rotationDate', 'is', null)

        if (data) {
          for (const cred of data) {
            events.push({
              type: 'credential_expiry',
              details: `Credential for ${cred.service} (commission ${cred.commissionId}) expires at ${cred.rotationDate}`,
              service: cred.service,
              expiresAt: cred.rotationDate,
            })
          }
        }
      } catch (err) {
        console.error('[security-scanner] Failed to check credential expiry:', err)
      }
    }

    return events
  }
}
