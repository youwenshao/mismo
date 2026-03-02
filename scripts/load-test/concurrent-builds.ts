#!/usr/bin/env tsx
/**
 * Concurrent Build Load Test
 *
 * Triggers 10 commissions simultaneously across different archetypes
 * and measures total wall-clock time, per-build duration, and system
 * health throughout the run.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... N8N_WEBHOOK_BASE=... tsx scripts/load-test/concurrent-builds.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'http://localhost:5678/webhook'
const POLL_INTERVAL_MS = 10_000
const MAX_WAIT_MS = 120 * 60_000 // 2 hours max

interface TestCommission {
  archetype: string
  pipeline: 'build-pipeline' | 'mobile-build-pipeline' | 'repo-surgery-pipeline'
  label: string
}

const TEST_MATRIX: TestCommission[] = [
  { archetype: 'web-app', pipeline: 'build-pipeline', label: 'web-1' },
  { archetype: 'web-app', pipeline: 'build-pipeline', label: 'web-2' },
  { archetype: 'web-app', pipeline: 'build-pipeline', label: 'web-3' },
  { archetype: 'automation', pipeline: 'build-pipeline', label: 'auto-1' },
  { archetype: 'automation', pipeline: 'build-pipeline', label: 'auto-2' },
  { archetype: 'automation', pipeline: 'build-pipeline', label: 'auto-3' },
  { archetype: 'mobile', pipeline: 'mobile-build-pipeline', label: 'mobile-1' },
  { archetype: 'mobile', pipeline: 'mobile-build-pipeline', label: 'mobile-2' },
  { archetype: 'mod', pipeline: 'repo-surgery-pipeline', label: 'mod-1' },
  { archetype: 'mod', pipeline: 'repo-surgery-pipeline', label: 'mod-2' },
]

interface BuildResult {
  label: string
  commissionId: string
  buildId: string
  status: string
  durationMs: number
  studioAssignment: string | null
}

function getMinimalPrd(archetype: string) {
  return {
    name: `load-test-${archetype}-${Date.now()}`,
    features: [{ id: 'f1', name: 'Feature 1', description: 'Test feature' }],
    dataContracts: [],
    dataBoundaries: [],
    apiContracts: [],
    designDna: {},
    contentJson: {},
    hostingConfig: { provider: 'vercel' },
    envRequirements: [],
    gsd_decomposition: {
      tasks: [
        { id: 'db-1', type: 'database', dependencies: [] },
        { id: 'be-1', type: 'backend', dependencies: ['db-1'] },
        { id: 'fe-1', type: 'frontend', dependencies: ['be-1'] },
      ],
    },
  }
}

async function createTestCommission(
  supabase: SupabaseClient,
  test: TestCommission,
): Promise<{ commissionId: string; buildId: string }> {
  const { data: commission, error: commErr } = await supabase
    .from('Commission')
    .insert({
      clientEmail: `loadtest+${test.label}@mismo.dev`,
      status: 'IN_PROGRESS',
      prdJson: getMinimalPrd(test.archetype),
      paymentState: 'FINAL',
      userId: 'load-test-system',
    })
    .select('id')
    .single()

  if (commErr || !commission) {
    throw new Error(`Failed to create commission for ${test.label}: ${commErr?.message}`)
  }

  const { data: build, error: buildErr } = await supabase
    .from('Build')
    .insert({
      commissionId: commission.id,
      status: 'PENDING',
      executionIds: [],
    })
    .select('id')
    .single()

  if (buildErr || !build) {
    throw new Error(`Failed to create build for ${test.label}: ${buildErr?.message}`)
  }

  return { commissionId: commission.id, buildId: build.id }
}

async function triggerPipeline(
  test: TestCommission,
  commissionId: string,
  buildId: string,
): Promise<void> {
  const url = `${N8N_WEBHOOK_BASE}/${test.pipeline}`
  const body = {
    buildId,
    commissionId,
    prdJson: getMinimalPrd(test.archetype),
    archetype: test.archetype,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Pipeline trigger failed for ${test.label} (${res.status}): ${text}`)
  }
}

async function pollBuilds(
  supabase: SupabaseClient,
  buildIds: string[],
): Promise<Map<string, { status: string; studioAssignment: string | null; updatedAt: string }>> {
  const { data, error } = await supabase
    .from('Build')
    .select('id, status, studioAssignment, updatedAt')
    .in('id', buildIds)

  if (error || !data) return new Map()

  const map = new Map<string, { status: string; studioAssignment: string | null; updatedAt: string }>()
  for (const row of data) {
    map.set(row.id, { status: row.status, studioAssignment: row.studioAssignment, updatedAt: row.updatedAt })
  }
  return map
}

function isTerminal(status: string): boolean {
  return status === 'SUCCESS' || status === 'FAILED'
}

async function cleanupTestData(supabase: SupabaseClient, commissionIds: string[]): Promise<void> {
  console.log('\n[cleanup] Removing test data...')
  for (const id of commissionIds) {
    await supabase.from('Build').delete().eq('commissionId', id)
    await supabase.from('Commission').delete().eq('id', id)
  }
  console.log('[cleanup] Done.')
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const startTime = Date.now()

  console.log('=== Concurrent Build Load Test ===')
  console.log(`Triggering ${TEST_MATRIX.length} builds concurrently`)
  console.log(`Archetypes: 3 web, 3 automation, 2 mobile, 2 mod`)
  console.log(`n8n webhook base: ${N8N_WEBHOOK_BASE}\n`)

  // Phase 1: Create all commissions and builds
  const entries: Array<{
    test: TestCommission
    commissionId: string
    buildId: string
    startedAt: number
  }> = []

  console.log('[setup] Creating test commissions...')
  for (const test of TEST_MATRIX) {
    const { commissionId, buildId } = await createTestCommission(supabase, test)
    entries.push({ test, commissionId, buildId, startedAt: 0 })
    console.log(`  ${test.label}: commission=${commissionId} build=${buildId}`)
  }

  const commissionIds = entries.map((e) => e.commissionId)

  // Phase 2: Fire all pipelines simultaneously
  console.log('\n[fire] Triggering all pipelines...')
  const fireStart = Date.now()

  const triggerResults = await Promise.allSettled(
    entries.map((e) => {
      e.startedAt = Date.now()
      return triggerPipeline(e.test, e.commissionId, e.buildId)
    }),
  )

  for (let i = 0; i < triggerResults.length; i++) {
    const r = triggerResults[i]
    const label = entries[i].test.label
    if (r.status === 'rejected') {
      console.error(`  FAIL ${label}: ${r.reason}`)
    } else {
      console.log(`  OK   ${label}`)
    }
  }

  console.log(`\n[poll] Waiting for builds to complete (polling every ${POLL_INTERVAL_MS / 1000}s)...`)

  // Phase 3: Poll until all builds reach terminal state
  const buildIds = entries.map((e) => e.buildId)
  const results: BuildResult[] = []
  const completed = new Set<string>()

  while (completed.size < buildIds.length) {
    if (Date.now() - fireStart > MAX_WAIT_MS) {
      console.error('\n[timeout] Max wait exceeded. Aborting.')
      break
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

    const statuses = await pollBuilds(supabase, buildIds)
    const elapsed = ((Date.now() - fireStart) / 1000).toFixed(0)
    const running = buildIds.filter((id) => !completed.has(id) && statuses.get(id)?.status === 'RUNNING').length
    const pending = buildIds.filter((id) => !completed.has(id) && statuses.get(id)?.status === 'PENDING').length

    process.stdout.write(`\r  [${elapsed}s] completed=${completed.size}/${buildIds.length} running=${running} pending=${pending}  `)

    for (const entry of entries) {
      if (completed.has(entry.buildId)) continue
      const st = statuses.get(entry.buildId)
      if (!st || !isTerminal(st.status)) continue

      completed.add(entry.buildId)
      const durationMs = Date.now() - entry.startedAt

      results.push({
        label: entry.test.label,
        commissionId: entry.commissionId,
        buildId: entry.buildId,
        status: st.status,
        durationMs,
        studioAssignment: st.studioAssignment,
      })
      console.log(`\n  DONE ${entry.test.label}: ${st.status} in ${(durationMs / 1000).toFixed(1)}s on ${st.studioAssignment || 'N/A'}`)
    }
  }

  // Phase 4: Report
  const totalElapsed = Date.now() - fireStart
  const successCount = results.filter((r) => r.status === 'SUCCESS').length
  const failCount = results.filter((r) => r.status === 'FAILED').length
  const avgDuration = results.length > 0 ? results.reduce((s, r) => s + r.durationMs, 0) / results.length : 0
  const sequentialEstimate = results.reduce((s, r) => s + r.durationMs, 0)

  console.log('\n\n=== RESULTS ===')
  console.log(`Total wall-clock time:    ${(totalElapsed / 1000).toFixed(1)}s`)
  console.log(`Sequential estimate:      ${(sequentialEstimate / 1000).toFixed(1)}s`)
  console.log(`Speedup factor:           ${(sequentialEstimate / totalElapsed).toFixed(2)}x`)
  console.log(`Builds succeeded:         ${successCount}/${results.length}`)
  console.log(`Builds failed:            ${failCount}/${results.length}`)
  console.log(`Avg build duration:       ${(avgDuration / 1000).toFixed(1)}s`)

  console.log('\n--- Per-Build Breakdown ---')
  console.log('Label       | Status  | Duration  | Studio')
  console.log('------------|---------|-----------|--------')
  for (const r of results.sort((a, b) => a.durationMs - b.durationMs)) {
    const dur = `${(r.durationMs / 1000).toFixed(1)}s`.padEnd(9)
    const st = r.status.padEnd(7)
    const lbl = r.label.padEnd(11)
    console.log(`${lbl} | ${st} | ${dur} | ${r.studioAssignment || 'N/A'}`)
  }

  // Pass/fail criteria
  console.log('\n--- Pass/Fail Criteria ---')
  const singleAvg = avgDuration
  const wallOk = totalElapsed < singleAvg * 2
  const successOk = successCount === TEST_MATRIX.length
  console.log(`Wall time < 2x avg:       ${wallOk ? 'PASS' : 'FAIL'} (${(totalElapsed / 1000).toFixed(1)}s vs ${(singleAvg * 2 / 1000).toFixed(1)}s)`)
  console.log(`100% success:             ${successOk ? 'PASS' : 'FAIL'} (${successCount}/${TEST_MATRIX.length})`)

  const overallPass = wallOk && successOk
  console.log(`\nOverall:                  ${overallPass ? 'PASS' : 'FAIL'}`)

  // Cleanup
  if (process.env.CLEANUP !== 'false') {
    await cleanupTestData(supabase, commissionIds)
  }

  process.exit(overallPass ? 0 : 1)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
