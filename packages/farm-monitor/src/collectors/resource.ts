import { NodeSSH } from 'node-ssh'

interface StudioConfig {
  id: string
  host: string
  role: 'control-plane' | 'worker'
}

interface FarmConfig {
  ssh: { user: string; keyPath: string }
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
    const ssh = new NodeSSH()
    try {
      await ssh.connect({
        host: studio.host,
        username: this.config.ssh.user,
        privateKeyPath: this.config.ssh.keyPath,
        readyTimeout: 10_000,
      })

      const [cpuResult, ramResult, diskResult, dockerResult] = await Promise.all([
        ssh.execCommand("top -l 1 -n 0 | awk '/CPU usage/ { gsub(/%/,\"\"); printf \"%d\", $3+$5 }'"),
        ssh.execCommand("vm_stat | awk '/Pages active/ {a=$NF+0} /Pages wired/ {w=$NF+0} /Pages speculative/ {s=$NF+0} /Pages occupied by compressor/ {c=$NF+0} /Pages free/ {f=$NF+0} /Pages inactive/ {i=$NF+0} END { u=a+w+s+c; t=u+f+i; if(t>0) printf \"%d\",u*100/t; else print 0}'"),
        ssh.execCommand("df / | awk 'NR==2 { gsub(/%/,\"\",$5); print $5 }'"),
        ssh.execCommand("docker ps --format '{{.Names}}' 2>/dev/null | wc -l; docker ps --filter name=n8n-worker --format '{{.Names}}' 2>/dev/null | head -1; docker inspect n8n-worker --format '{{.RestartCount}}' 2>/dev/null || echo 0"),
      ])

      const dockerLines = dockerResult.stdout.trim().split('\n')

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
