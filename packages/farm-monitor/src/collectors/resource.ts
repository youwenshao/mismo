import { NodeSSH } from 'node-ssh'
import * as net from 'net'

interface StudioConfig {
  id: string
  host: string
  role: 'control-plane' | 'worker'
  workerConcurrency: number
}

interface FarmConfig {
  ssh: { user: string; keyPath: string; passphrase?: string }
}

export interface ResourceMetrics {
  cpuPercent: number
  ramPercent: number
  diskPercent: number
  containerCount: number
  n8nWorkerRunning: boolean
  workerRestartCount: number
}

export class ResourceCollector {
  private config: FarmConfig

  constructor(config: FarmConfig) {
    this.config = config
  }

  async collect(studio: StudioConfig): Promise<ResourceMetrics | null> {
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
      console.error(`[resource-collector] Host ${studio.host} is unreachable on port 22`)
      return null
    }

    const ssh = new NodeSSH()
    const start = Date.now()
    try {
      console.log(`[resource-collector] Connecting to ${studio.id} (${studio.host})...`)
      await ssh.connect({
        host: studio.host,
        username: this.config.ssh.user,
        privateKeyPath: this.config.ssh.keyPath,
        passphrase: this.config.ssh.passphrase,
        readyTimeout: 30_000,
      })
      console.log(`[resource-collector] Connected to ${studio.id} in ${Date.now() - start}ms`)

      const [cpuResult, ramResult, diskResult, dockerResult] = await Promise.all([
        ssh.execCommand('top -l 1 -n 0 | awk \'/CPU usage/ { gsub(/%/,""); printf "%d", $3+$5 }\''),
        ssh.execCommand(
          'vm_stat | awk \'/Pages active/ {a=$NF+0} /Pages wired/ {w=$NF+0} /Pages speculative/ {s=$NF+0} /Pages occupied by compressor/ {c=$NF+0} /Pages free/ {f=$NF+0} /Pages inactive/ {i=$NF+0} END { u=a+w+s+c; t=u+f+i; if(t>0) printf "%d",u*100/t; else print 0}\'',
        ),
        ssh.execCommand('df / | awk \'NR==2 { gsub(/%/,"",$5); print $5 }\''),
        ssh.execCommand(
          "export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin; docker ps --format '{{.Names}}' | wc -l | tr -d ' '; WORKER_NAME=$(docker ps --filter name=n8n-worker --format '{{.Names}}' | head -1); echo ${WORKER_NAME:-none}; if [ -n \"$WORKER_NAME\" ]; then docker inspect \"$WORKER_NAME\" --format '{{.RestartCount}}' 2>/dev/null || echo 0; else echo 0; fi",
        ),
      ])

      if (dockerResult.stderr) {
        console.warn(
          `[resource-collector] Docker stderr on ${studio.id}: ${dockerResult.stderr.trim()}`,
        )
      }

      const dockerLines = dockerResult.stdout
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)

      return {
        cpuPercent: parseInt(cpuResult.stdout.trim()) || 0,
        ramPercent: parseInt(ramResult.stdout.trim()) || 0,
        diskPercent: parseInt(diskResult.stdout.trim()) || 0,
        containerCount: parseInt(dockerLines[0]) || 0,
        n8nWorkerRunning: (dockerLines[1] || '').includes('n8n'),
        workerRestartCount: parseInt(dockerLines[2]) || 0,
      }
    } catch (err) {
      console.error(`[resource-collector] Failed to collect from ${studio.id}:`, err)
      return null
    } finally {
      ssh.dispose()
    }
  }
}
