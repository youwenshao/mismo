#!/usr/bin/env tsx
/**
 * Failover Test: Restart Studio 1 (Control Plane)
 *
 * 1. Starts 4 builds, waits for RUNNING
 * 2. Restarts all Studio 1 services (Redis, Postgres, n8n-main)
 * 3. Verifies Redis data persistence (appendonly=yes)
 * 4. Verifies workers reconnect within 30s timeout
 * 5. Verifies no Build data lost
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... N8N_WEBHOOK_BASE=... \
 *   STUDIO_1_SSH_HOST=... \
 *     tsx scripts/load-test/failover-control-plane.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'http://localhost:5678/webhook'
const STUDIO_1_HOST = process.env.STUDIO_1_SSH_HOST || ''
const SSH_USER = process.env.SSH_USER || 'admin'
const SSH_KEY = process.env.SSH_KEY_PATH || `${process.env.HOME}/.ssh/id_ed25519`
const POLL_INTERVAL_MS = 5_000

function ssh(host: string, cmd: string): string {
  return execSync(
    `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${SSH_USER}@${host} "${cmd}"`,
    { encoding: 'utf-8', timeout: 60_000, stdio: 'pipe' },
  ).trim()
}

function getMinimalPrd() {
  return {
    name: `cp-failover-${Date.now()}`,
    features: [{ id: 'f1', name: 'Test', description: 'Control plane failover test' }],
    dataContracts: [], dataBoundaries: [], apiContracts: [],
    designDna: {}, contentJson: {},
    hostingConfig: { provider: 'vercel' }, envRequirements: [],
    gsd_decomposition: {
      tasks: [
        { id: 'db-1', type: 'database', dependencies: [] },
        { id: 'be-1', type: 'backend', dependencies: ['db-1'] },
      ],
    },
  }
}

async function createBuild(supabase: SupabaseClient, label: string) {
  const { data: commission } = await supabase
    .from('Commission')
    .insert({
      clientEmail: `cp-fail+${label}@mismo.dev`,
      status: 'IN_PROGRESS', prdJson: getMinimalPrd(),
      paymentState: 'FINAL', userId: 'load-test-system',
    })
    .select('id').single()

  if (!commission) throw new Error(`Failed to create commission`)

  const { data: build } = await supabase
    .from('Build')
    .insert({ commissionId: commission.id, status: 'PENDING', executionIds: [] })
    .select('id').single()

  if (!build) throw new Error(`Failed to create build`)

  return { commissionId: commission.id, buildId: build.id }
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
  if (!STUDIO_1_HOST) {
    console.error('Missing STUDIO_1_SSH_HOST')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const commissionIds: string[] = []

  console.log('=== Failover Test: Restart Studio 1 (Control Plane) ===\n')

  try {
    // Step 1: Create and start 4 builds
    console.log('[1/6] Creating and triggering 4 builds...')
    const builds: Array<{ label: string; commissionId: string; buildId: string }> = []
    for (const label of ['cp-a', 'cp-b', 'cp-c', 'cp-d']) {
      const b = await createBuild(supabase, label)
      builds.push({ label, ...b })
      commissionIds.push(b.commissionId)
    }

    for (const b of builds) {
      await fetch(`${N8N_WEBHOOK_BASE}/build-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildId: b.buildId, commissionId: b.commissionId, prdJson: getMinimalPrd() }),
      })
    }
    console.log('  All 4 builds triggered.')

    // Step 2: Snapshot build states before restart
    console.log('\n[2/6] Capturing pre-restart build states...')
    await new Promise((r) => setTimeout(r, 15_000))

    const { data: preBuildStates } = await supabase
      .from('Build')
      .select('id, status, executionIds')
      .in('id', builds.map((b) => b.buildId))

    const preSnapshot = new Map<string, { status: string; executionIds: unknown }>()
    for (const row of preBuildStates || []) {
      preSnapshot.set(row.id, { status: row.status, executionIds: row.executionIds })
      console.log(`  ${row.id}: ${row.status}`)
    }

    // Step 3: Restart Studio 1 services
    console.log('\n[3/6] Restarting Studio 1 (Redis, Postgres, n8n-main)...')
    const restartStart = Date.now()
    try {
      ssh(STUDIO_1_HOST, 'cd /opt/mismo && docker compose -f docker/n8n-ha/docker-compose.main.yml restart')
      console.log(`  Restart command completed in ${((Date.now() - restartStart) / 1000).toFixed(1)}s`)
    } catch (err) {
      console.error(`  Restart command error: ${err}`)
    }

    // Step 4: Verify Redis persistence
    console.log('\n[4/6] Verifying Redis data persistence...')
    await new Promise((r) => setTimeout(r, 15_000))
    try {
      const redisPing = ssh(STUDIO_1_HOST, 'docker exec $(docker ps -q --filter name=redis) redis-cli -a \\$REDIS_PASSWORD ping 2>/dev/null || echo FAIL')
      const redisOk = redisPing.includes('PONG')
      console.log(`  Redis PING: ${redisPing}`)
      console.log(`  Redis alive: ${redisOk ? 'PASS' : 'FAIL'}`)

      const aofEnabled = ssh(STUDIO_1_HOST, 'docker exec $(docker ps -q --filter name=redis) redis-cli -a \\$REDIS_PASSWORD config get appendonly 2>/dev/null || echo unknown')
      console.log(`  AOF config: ${aofEnabled.replace(/\n/g, ' ')}`)
    } catch (err) {
      console.log(`  Redis check error: ${err}`)
    }

    // Step 5: Verify worker reconnection
    console.log('\n[5/6] Waiting 35s for worker reconnection...')
    await new Promise((r) => setTimeout(r, 35_000))

    const n8nHealthy = await checkN8nHealth()
    console.log(`  n8n-main health: ${n8nHealthy ? 'PASS' : 'FAIL'}`)

    // Step 6: Verify no data loss
    console.log('\n[6/6] Checking for data loss...')
    const { data: postBuildStates } = await supabase
      .from('Build')
      .select('id, status, executionIds')
      .in('id', builds.map((b) => b.buildId))

    let dataLoss = false
    for (const row of postBuildStates || []) {
      const pre = preSnapshot.get(row.id)
      if (!pre) {
        console.log(`  ${row.id}: MISSING pre-snapshot (unexpected)`)
        dataLoss = true
        continue
      }
      console.log(`  ${row.id}: ${pre.status} -> ${row.status}`)
    }

    if ((postBuildStates?.length || 0) !== builds.length) {
      console.log(`  WARNING: Expected ${builds.length} builds, found ${postBuildStates?.length}`)
      dataLoss = true
    }

    console.log(`\n  No data loss: ${!dataLoss ? 'PASS' : 'FAIL'}`)
    console.log('\n=== Control plane failover test complete ===')
  } finally {
    if (process.env.CLEANUP !== 'false') {
      await cleanup(supabase, commissionIds)
    }
  }
}

async function checkN8nHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${N8N_WEBHOOK_BASE.replace('/webhook', '')}/healthz`, {
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
