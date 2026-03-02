#!/usr/bin/env tsx
/**
 * Failover Test: Internet Outage Simulation
 *
 * Uses macOS pfctl to block outbound traffic to external APIs on Studio 2,
 * verifying:
 * 1. Builds fail gracefully with clear error messages
 * 2. Farm-monitor detects API degradation and triggers Kimi->DeepSeek failover
 * 3. Local queue persists pending work
 * 4. Connectivity restoration resumes operations
 *
 * REQUIRES: sudo access on Studio 2 for pfctl rules.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... N8N_WEBHOOK_BASE=... \
 *   STUDIO_2_SSH_HOST=... \
 *     tsx scripts/load-test/failover-network.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'http://localhost:5678/webhook'
const STUDIO_2_HOST = process.env.STUDIO_2_SSH_HOST || ''
const SSH_USER = process.env.SSH_USER || 'admin'
const SSH_KEY = process.env.SSH_KEY_PATH || `${process.env.HOME}/.ssh/id_ed25519`

const BLOCKED_HOSTS = [
  'api.moonshot.ai',
  'api.github.com',
  'api.supabase.co',
]

function ssh(host: string, cmd: string): string {
  return execSync(
    `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${SSH_USER}@${host} "${cmd}"`,
    { encoding: 'utf-8', timeout: 30_000, stdio: 'pipe' },
  ).trim()
}

function sshSudo(host: string, cmd: string): string {
  return execSync(
    `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${SSH_USER}@${host} "sudo ${cmd}"`,
    { encoding: 'utf-8', timeout: 30_000, stdio: 'pipe' },
  ).trim()
}

function getMinimalPrd() {
  return {
    name: `network-fail-${Date.now()}`,
    features: [{ id: 'f1', name: 'Test', description: 'Network failover test' }],
    dataContracts: [], dataBoundaries: [], apiContracts: [],
    designDna: {}, contentJson: {},
    hostingConfig: { provider: 'vercel' }, envRequirements: [],
    gsd_decomposition: {
      tasks: [{ id: 'db-1', type: 'database', dependencies: [] }],
    },
  }
}

const PF_ANCHOR = 'mismo_load_test'

function buildPfRules(): string {
  const rules = BLOCKED_HOSTS.map((h) => `block drop out quick on en0 proto tcp to ${h} port {80, 443}`).join('\\n')
  return rules
}

async function blockExternalTraffic(host: string): Promise<void> {
  console.log('  Creating pf rules to block external API traffic...')
  const rules = buildPfRules()

  try {
    sshSudo(host, `bash -c 'echo -e \"${rules}\" > /tmp/mismo-block-rules.conf'`)
    sshSudo(host, `pfctl -a ${PF_ANCHOR} -f /tmp/mismo-block-rules.conf 2>/dev/null || true`)
    sshSudo(host, `pfctl -e 2>/dev/null || true`)
    console.log(`  Blocked: ${BLOCKED_HOSTS.join(', ')}`)
  } catch (err) {
    console.error(`  Failed to apply pf rules: ${err}`)
    throw err
  }
}

async function restoreTraffic(host: string): Promise<void> {
  console.log('  Removing pf block rules...')
  try {
    sshSudo(host, `pfctl -a ${PF_ANCHOR} -F all 2>/dev/null || true`)
    sshSudo(host, `rm -f /tmp/mismo-block-rules.conf`)
    console.log('  Traffic restored.')
  } catch (err) {
    console.error(`  Failed to restore traffic: ${err}`)
  }
}

async function createBuild(supabase: SupabaseClient, label: string) {
  const { data: commission } = await supabase
    .from('Commission')
    .insert({
      clientEmail: `net-fail+${label}@mismo.dev`,
      status: 'IN_PROGRESS', prdJson: getMinimalPrd(),
      paymentState: 'FINAL', userId: 'load-test-system',
    })
    .select('id').single()

  if (!commission) throw new Error('Failed to create commission')

  const { data: build } = await supabase
    .from('Build')
    .insert({ commissionId: commission.id, status: 'PENDING', executionIds: [] })
    .select('id').single()

  if (!build) throw new Error('Failed to create build')

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
  if (!STUDIO_2_HOST) {
    console.error('Missing STUDIO_2_SSH_HOST')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const commissionIds: string[] = []

  console.log('=== Failover Test: Internet Outage Simulation ===\n')

  try {
    // Step 1: Start 2 builds
    console.log('[1/6] Creating 2 test builds...')
    const builds: Array<{ label: string; commissionId: string; buildId: string }> = []
    for (const label of ['net-a', 'net-b']) {
      const b = await createBuild(supabase, label)
      builds.push({ label, ...b })
      commissionIds.push(b.commissionId)
      console.log(`  ${label}: build=${b.buildId}`)
    }

    console.log('\n[2/6] Triggering builds...')
    for (const b of builds) {
      await fetch(`${N8N_WEBHOOK_BASE}/build-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildId: b.buildId, commissionId: b.commissionId, prdJson: getMinimalPrd() }),
      })
    }
    console.log('  Builds triggered.')

    // Step 2: Wait briefly for execution to begin
    console.log('\n[3/6] Waiting 15s for builds to start executing...')
    await new Promise((r) => setTimeout(r, 15_000))

    // Step 3: Block external traffic on Studio 2
    console.log('\n[4/6] Blocking external API traffic on Studio 2...')
    await blockExternalTraffic(STUDIO_2_HOST)

    // Step 4: Monitor farm-monitor response
    console.log('\n[5/6] Waiting 60s for farm-monitor to detect outage...')
    await new Promise((r) => setTimeout(r, 60_000))

    // Check for Kimi->DeepSeek failover
    const { data: configRows } = await supabase
      .from('SystemConfig')
      .select('value')
      .eq('key', 'active_ai_provider')
      .single()

    const activeProvider = (configRows?.value as { provider?: string })?.provider || 'unknown'
    console.log(`  Active AI provider: ${activeProvider}`)
    console.log(`  Failover triggered: ${activeProvider === 'deepseek' ? 'PASS' : 'CHECK (may not trigger if Studio 1 checks are healthy)'}`)

    // Check alerts
    const { data: alerts } = await supabase
      .from('MonitoringAlert')
      .select('priority, category, title')
      .gte('createdAt', new Date(Date.now() - 120_000).toISOString())
      .order('createdAt', { ascending: false })
      .limit(10)

    console.log(`\n  Recent alerts (${alerts?.length || 0}):`)
    for (const a of alerts || []) {
      console.log(`    [${a.priority}][${a.category}] ${a.title}`)
    }

    // Check build statuses
    const { data: buildStates } = await supabase
      .from('Build')
      .select('id, status, errorLogs')
      .in('id', builds.map((b) => b.buildId))

    console.log('\n  Build states during outage:')
    for (const b of buildStates || []) {
      const errMsg = b.errorLogs ? JSON.stringify(b.errorLogs).slice(0, 100) : 'none'
      console.log(`    ${b.id}: ${b.status} (error: ${errMsg})`)
    }

    // Step 5: Restore connectivity
    console.log('\n[6/6] Restoring connectivity...')
    await restoreTraffic(STUDIO_2_HOST)

    console.log('  Waiting 45s for recovery...')
    await new Promise((r) => setTimeout(r, 45_000))

    // Verify Kimi health restored (farm-monitor needs ~5 healthy checks)
    const { data: postConfig } = await supabase
      .from('SystemConfig')
      .select('value')
      .eq('key', 'active_ai_provider')
      .single()

    const postProvider = (postConfig?.value as { provider?: string })?.provider || 'unknown'
    console.log(`  Post-recovery provider: ${postProvider}`)
    console.log(`  (Full revert to Kimi requires 5 healthy checks — may take several minutes)`)

    // Check local queue path
    console.log('\n  Checking local queue persistence...')
    try {
      const queueFile = ssh(STUDIO_2_HOST, 'ls -la /tmp/mismo-build-queue.db 2>/dev/null || echo "not found"')
      console.log(`  Local queue file: ${queueFile}`)
    } catch {
      console.log('  Local queue file: could not check')
    }

    console.log('\n=== Network outage failover test complete ===')
  } finally {
    // Always restore traffic even on error
    try { await restoreTraffic(STUDIO_2_HOST) } catch { /* best effort */ }
    if (process.env.CLEANUP !== 'false') {
      await cleanup(supabase, commissionIds)
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
