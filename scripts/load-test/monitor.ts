#!/usr/bin/env tsx
/**
 * System Monitor for Load Tests
 *
 * Runs alongside concurrent-builds.ts and samples Redis, DB connections,
 * Studio resources, and Kimi API health every 5 seconds. Writes a CSV
 * to stdout (pipe to file).
 *
 * Usage:
 *   REDIS_HOST=... REDIS_PASSWORD=... SUPABASE_URL=... \
 *     tsx scripts/load-test/monitor.ts > load-test-metrics.csv
 *
 *   Stop with Ctrl+C (outputs summary before exit).
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import * as net from 'net'

const SAMPLE_INTERVAL_MS = 5_000

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10)
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || ''

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const STUDIO_HOSTS = [
  { id: 'studio-1', host: process.env.STUDIO_1_SSH_HOST || '' },
  { id: 'studio-2', host: process.env.STUDIO_2_SSH_HOST || '' },
  { id: 'studio-3', host: process.env.STUDIO_3_SSH_HOST || '' },
]

const SSH_USER = process.env.SSH_USER || 'admin'
const SSH_KEY = process.env.SSH_KEY_PATH || `${process.env.HOME}/.ssh/id_ed25519`

interface Sample {
  timestamp: string
  elapsedMs: number
  redisConnectedClients: number
  redisUsedMemoryMb: number
  redisOpsPerSec: number
  redisQueueDepth: number
  dbActiveConnections: number
  kimiLatencyMs: number
  kimiStatus: string
  studio1Cpu: number
  studio1Ram: number
  studio2Cpu: number
  studio2Ram: number
  studio3Cpu: number
  studio3Ram: number
}

async function redisCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: REDIS_HOST, port: REDIS_PORT }, () => {
      if (REDIS_PASSWORD) {
        socket.write(`AUTH ${REDIS_PASSWORD}\r\n`)
      }
      socket.write(`${command}\r\n`)
      socket.write('QUIT\r\n')
    })

    let data = ''
    socket.on('data', (chunk) => { data += chunk.toString() })
    socket.on('end', () => resolve(data))
    socket.on('error', reject)
    socket.setTimeout(5000, () => {
      socket.destroy()
      reject(new Error('Redis timeout'))
    })
  })
}

function parseRedisInfo(raw: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of raw.split('\r\n')) {
    const idx = line.indexOf(':')
    if (idx > 0) {
      map[line.slice(0, idx)] = line.slice(idx + 1)
    }
  }
  return map
}

async function sampleRedis(): Promise<{
  connectedClients: number
  usedMemoryMb: number
  opsPerSec: number
  queueDepth: number
}> {
  try {
    const info = await redisCommand('INFO')
    const parsed = parseRedisInfo(info)

    let queueDepth = 0
    try {
      const llenRaw = await redisCommand('LLEN bull:n8n:wait')
      const match = llenRaw.match(/:(\d+)/)
      if (match) queueDepth = parseInt(match[1], 10)
    } catch { /* queue may not exist yet */ }

    return {
      connectedClients: parseInt(parsed.connected_clients || '0', 10),
      usedMemoryMb: Math.round(parseInt(parsed.used_memory || '0', 10) / 1024 / 1024),
      opsPerSec: parseInt(parsed.instantaneous_ops_per_sec || '0', 10),
      queueDepth,
    }
  } catch {
    return { connectedClients: -1, usedMemoryMb: -1, opsPerSec: -1, queueDepth: -1 }
  }
}

async function sampleDbConnections(): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return -1
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data } = await supabase.rpc('pg_stat_activity_count').single()
    return typeof data === 'number' ? data : -1
  } catch {
    return -1
  }
}

async function sampleKimi(): Promise<{ latencyMs: number; status: string }> {
  const apiKey = process.env.KIMI_API_KEY
  if (!apiKey) return { latencyMs: -1, status: 'no-key' }

  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch('https://api.moonshot.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const latencyMs = Date.now() - start

    if (!res.ok) return { latencyMs, status: `error-${res.status}` }
    if (latencyMs > 3000) return { latencyMs, status: 'degraded' }
    return { latencyMs, status: 'healthy' }
  } catch {
    return { latencyMs: Date.now() - start, status: 'down' }
  }
}

function sampleStudioResources(host: string): { cpu: number; ram: number } {
  if (!host) return { cpu: -1, ram: -1 }
  try {
    const raw = execSync(
      `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${SSH_USER}@${host} "top -l 1 -s 0 | head -12"`,
      { encoding: 'utf-8', timeout: 10_000, stdio: 'pipe' },
    )
    const cpuMatch = raw.match(/CPU usage:\s+([\d.]+)%\s+user,\s+([\d.]+)%\s+sys/)
    const memMatch = raw.match(/PhysMem:\s+(\d+)[MG]\s+used/)

    const cpu = cpuMatch ? parseFloat(cpuMatch[1]) + parseFloat(cpuMatch[2]) : -1

    let ramUsedMb = -1
    if (memMatch) {
      const val = parseInt(memMatch[1], 10)
      ramUsedMb = raw.includes('G used') ? val * 1024 : val
    }

    // M2 Ultra: 192GB, M4 Max: 128GB — approximate ram %
    const totalRam = host === (process.env.STUDIO_1_SSH_HOST || '') ? 128 * 1024 : 192 * 1024
    const ram = ramUsedMb > 0 ? Math.round((ramUsedMb / totalRam) * 100) : -1

    return { cpu, ram }
  } catch {
    return { cpu: -1, ram: -1 }
  }
}

const CSV_HEADER = [
  'timestamp', 'elapsed_ms',
  'redis_clients', 'redis_mem_mb', 'redis_ops_sec', 'redis_queue_depth',
  'db_connections',
  'kimi_latency_ms', 'kimi_status',
  'studio1_cpu', 'studio1_ram',
  'studio2_cpu', 'studio2_ram',
  'studio3_cpu', 'studio3_ram',
].join(',')

let maxQueueDepth = 0
let maxRedisClients = 0
let maxDbConnections = 0
let sampleCount = 0

async function takeSample(startTime: number): Promise<void> {
  const [redis, dbConns, kimi] = await Promise.all([
    sampleRedis(),
    sampleDbConnections(),
    sampleKimi(),
  ])

  const studios = STUDIO_HOSTS.map((s) => sampleStudioResources(s.host))

  const sample: Sample = {
    timestamp: new Date().toISOString(),
    elapsedMs: Date.now() - startTime,
    redisConnectedClients: redis.connectedClients,
    redisUsedMemoryMb: redis.usedMemoryMb,
    redisOpsPerSec: redis.opsPerSec,
    redisQueueDepth: redis.queueDepth,
    dbActiveConnections: dbConns,
    kimiLatencyMs: kimi.latencyMs,
    kimiStatus: kimi.status,
    studio1Cpu: studios[0].cpu,
    studio1Ram: studios[0].ram,
    studio2Cpu: studios[1].cpu,
    studio2Ram: studios[1].ram,
    studio3Cpu: studios[2].cpu,
    studio3Ram: studios[2].ram,
  }

  maxQueueDepth = Math.max(maxQueueDepth, sample.redisQueueDepth)
  maxRedisClients = Math.max(maxRedisClients, sample.redisConnectedClients)
  maxDbConnections = Math.max(maxDbConnections, sample.dbActiveConnections)
  sampleCount++

  const row = [
    sample.timestamp, sample.elapsedMs,
    sample.redisConnectedClients, sample.redisUsedMemoryMb, sample.redisOpsPerSec, sample.redisQueueDepth,
    sample.dbActiveConnections,
    sample.kimiLatencyMs, sample.kimiStatus,
    sample.studio1Cpu, sample.studio1Ram,
    sample.studio2Cpu, sample.studio2Ram,
    sample.studio3Cpu, sample.studio3Ram,
  ].join(',')

  console.log(row)
}

function printSummary() {
  process.stderr.write('\n--- Monitor Summary ---\n')
  process.stderr.write(`Samples taken:            ${sampleCount}\n`)
  process.stderr.write(`Max Redis queue depth:    ${maxQueueDepth}\n`)
  process.stderr.write(`Max Redis clients:        ${maxRedisClients}\n`)
  process.stderr.write(`Max DB connections:       ${maxDbConnections}\n`)
  process.stderr.write(`Queue depth < 50:         ${maxQueueDepth < 50 ? 'PASS' : 'FAIL'}\n`)
}

async function main() {
  console.log(CSV_HEADER)

  const startTime = Date.now()
  process.stderr.write(`[monitor] Sampling every ${SAMPLE_INTERVAL_MS / 1000}s. Press Ctrl+C to stop.\n`)

  const interval = setInterval(() => takeSample(startTime), SAMPLE_INTERVAL_MS)

  process.on('SIGINT', () => {
    clearInterval(interval)
    printSummary()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    clearInterval(interval)
    printSummary()
    process.exit(0)
  })

  // Take first sample immediately
  await takeSample(startTime)
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`)
  process.exit(1)
})
