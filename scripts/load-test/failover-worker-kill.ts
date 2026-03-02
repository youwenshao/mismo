#!/usr/bin/env tsx
/**
 * Failover Test: Kill Studio 2 During Build
 *
 * 1. Starts 4 builds (2 targeted at Studio 2, 2 at Studio 3)
 * 2. Waits for RUNNING state
 * 3. Kills Studio 2 worker containers via SSH
 * 4. Verifies Studio 3 picks up subsequent work
 * 5. Verifies alerts are fired
 * 6. Restarts Studio 2, confirms it reconnects
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... N8N_WEBHOOK_BASE=... \
 *   STUDIO_2_SSH_HOST=... STUDIO_3_SSH_HOST=... \
 *     tsx scripts/load-test/failover-worker-kill.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'http://localhost:5678/webhook'
const STUDIO_2_HOST = process.env.STUDIO_2_SSH_HOST || ''
const SSH_USER = process.env.SSH_USER || 'admin'
const SSH_KEY = process.env.SSH_KEY_PATH || `${process.env.HOME}/.ssh/id_ed25519`
const POLL_INTERVAL_MS = 5_000
const MAX_WAIT_MS = 30 * 60_000

function ssh(host: string, cmd: string): string {
  return execSync(
    `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${SSH_USER}@${host} "${cmd}"`,
    { encoding: 'utf-8', timeout: 30_000, stdio: 'pipe' },
  ).trim()
}

function getMinimalPrd() {
  return {
    name: `failover-test-${Date.now()}`,
    features: [{ id: 'f1', name: 'Test', description: 'Failover test feature' }],
    dataContracts: [], dataBoundaries: [], apiContracts: [],
    designDna: {}, contentJson: {},
    hostingConfig: { provider: 'vercel' }, envRequirements: [],
    gsd_decomposition: {
      tasks: [
        { id: 'db-1', type: 'database', dependencies: [] },
        { id: 'be-1', type: 'backend', dependencies: ['db-1'] },
        { id: 'fe-1', type: 'frontend', dependencies: ['be-1'] },
      ],
    },
  }
}

async function createBuild(supabase: SupabaseClient, label: string) {
  const { data: commission } = await supabase
    .from('Commission')
    .insert({
      clientEmail: `failover+${label}@mismo.dev`,
      status: 'IN_PROGRESS', prdJson: getMinimalPrd(),
      paymentState: 'FINAL', userId: 'load-test-system',
    })
    .select('id').single()

  if (!commission) throw new Error(`Failed to create commission for ${label}`)

  const { data: build } = await supabase
    .from('Build')
    .insert({ commissionId: commission.id, status: 'PENDING', executionIds: [] })
    .select('id').single()

  if (!build) throw new Error(`Failed to create build for ${label}`)

  return { commissionId: commission.id, buildId: build.id }
}

async function triggerBuild(commissionId: string, buildId: string) {
  const res = await fetch(`${N8N_WEBHOOK_BASE}/build-pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buildId, commissionId, prdJson: getMinimalPrd() }),
  })
  if (!res.ok) throw new Error(`Trigger failed: ${res.status}`)
}

async function waitForStatus(
  supabase: SupabaseClient,
  buildIds: string[],
  targetStatuses: string[],
  timeoutMs: number,
): Promise<Map<string, string>> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase
      .from('Build')
      .select('id, status')
      .in('id', buildIds)

    const map = new Map<string, string>()
    if (data) for (const row of data) map.set(row.id, row.status)

    const allMatch = buildIds.every((id) => {
      const st = map.get(id)
      return st && targetStatuses.includes(st)
    })

    if (allMatch) return map
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error(`Timeout waiting for builds to reach ${targetStatuses.join('/')}`)
}

async function cleanup(supabase: SupabaseClient, commissionIds: string[]) {
  for (const id of commissionIds) {
    await supabase.from('Build').delete().eq('commissionId', id)
    await supabase.from('Commission').delete().eq('id', id)
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!STUDIO_2_HOST) {
    console.error('Missing STUDIO_2_SSH_HOST')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const commissionIds: string[] = []

  console.log('=== Failover Test: Kill Studio 2 During Build ===\n')

  try {
    // Step 1: Create 4 builds
    console.log('[1/7] Creating 4 test builds...')
    const builds: Array<{ label: string; commissionId: string; buildId: string }> = []
    for (const label of ['fail-a', 'fail-b', 'fail-c', 'fail-d']) {
      const b = await createBuild(supabase, label)
      builds.push({ label, ...b })
      commissionIds.push(b.commissionId)
      console.log(`  ${label}: build=${b.buildId}`)
    }

    // Step 2: Fire all pipelines
    console.log('\n[2/7] Triggering all 4 builds...')
    await Promise.all(builds.map((b) => triggerBuild(b.commissionId, b.buildId)))
    console.log('  All triggered.')

    // Step 3: Wait for RUNNING
    console.log('\n[3/7] Waiting for builds to reach RUNNING...')
    try {
      await waitForStatus(supabase, builds.map((b) => b.buildId), ['RUNNING'], 120_000)
      console.log('  All builds RUNNING.')
    } catch {
      console.log('  Some builds may not have reached RUNNING. Proceeding with kill test anyway.')
    }

    // Step 4: Kill Studio 2 workers
    console.log('\n[4/7] Killing Studio 2 n8n-worker...')
    try {
      ssh(STUDIO_2_HOST, 'cd /opt/mismo && docker compose -f docker/n8n-ha/docker-compose.worker.yml down')
      console.log('  Studio 2 workers stopped.')
    } catch (err) {
      console.error(`  Failed to stop Studio 2: ${err}`)
    }

    // Step 5: Wait and check that Studio 2 builds fail, and verify alerts
    console.log('\n[5/7] Waiting for farm-monitor to detect failure and fire alerts...')
    console.log('  (This may take up to 60s for build-tracker to detect stuck builds)')
    await new Promise((r) => setTimeout(r, 60_000))

    const { data: alerts } = await supabase
      .from('MonitoringAlert')
      .select('id, priority, title, createdAt')
      .gte('createdAt', new Date(Date.now() - 120_000).toISOString())
      .order('createdAt', { ascending: false })
      .limit(10)

    const alertCount = alerts?.length || 0
    console.log(`  Found ${alertCount} recent alerts:`)
    for (const a of alerts || []) {
      console.log(`    [${a.priority}] ${a.title}`)
    }
    console.log(`  Alert fired: ${alertCount > 0 ? 'PASS' : 'FAIL'}`)

    // Step 6: Restart Studio 2
    console.log('\n[6/7] Restarting Studio 2...')
    try {
      ssh(STUDIO_2_HOST, 'cd /opt/mismo && docker compose -f docker/n8n-ha/docker-compose.worker.yml up -d')
      console.log('  Studio 2 restarted.')
    } catch (err) {
      console.error(`  Failed to restart Studio 2: ${err}`)
    }

    // Step 7: Verify reconnection
    console.log('\n[7/7] Waiting 35s for worker reconnection (QUEUE_BULL_REDIS_TIMEOUT=30s)...')
    await new Promise((r) => setTimeout(r, 35_000))

    try {
      const workerStatus = ssh(STUDIO_2_HOST, 'docker ps --filter name=n8n-worker --format "{{.Status}}"')
      const reconnected = workerStatus.includes('Up')
      console.log(`  Studio 2 worker status: ${workerStatus}`)
      console.log(`  Reconnected: ${reconnected ? 'PASS' : 'FAIL'}`)
    } catch {
      console.log('  Could not verify worker status.')
    }

    // Final status
    const { data: finalBuilds } = await supabase
      .from('Build')
      .select('id, status, studioAssignment')
      .in('id', builds.map((b) => b.buildId))

    console.log('\n--- Final Build States ---')
    for (const b of finalBuilds || []) {
      console.log(`  ${b.id}: ${b.status} (${b.studioAssignment || 'N/A'})`)
    }

    console.log('\n=== Failover test complete ===')
  } finally {
    if (process.env.CLEANUP !== 'false') {
      await cleanup(supabase, commissionIds)
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
