#!/usr/bin/env tsx
/**
 * Sequential Build Baseline
 *
 * Runs 10 builds one at a time to establish a baseline for comparison
 * with the concurrent load test.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... N8N_WEBHOOK_BASE=... tsx scripts/load-test/sequential-baseline.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'http://localhost:5678/webhook'
const POLL_INTERVAL_MS = 5_000
const MAX_BUILD_WAIT_MS = 30 * 60_000

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

function getMinimalPrd(archetype: string) {
  return {
    name: `baseline-${archetype}-${Date.now()}`,
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

interface BuildResult {
  label: string
  status: string
  durationMs: number
  studioAssignment: string | null
}

async function runSingleBuild(
  supabase: SupabaseClient,
  test: TestCommission,
): Promise<BuildResult> {
  const { data: commission, error: commErr } = await supabase
    .from('Commission')
    .insert({
      clientEmail: `baseline+${test.label}@mismo.dev`,
      status: 'IN_PROGRESS',
      prdJson: getMinimalPrd(test.archetype),
      paymentState: 'FINAL',
      userId: 'load-test-system',
    })
    .select('id')
    .single()

  if (commErr || !commission) throw new Error(`Commission create failed: ${commErr?.message}`)

  const { data: build, error: buildErr } = await supabase
    .from('Build')
    .insert({ commissionId: commission.id, status: 'PENDING', executionIds: [] })
    .select('id')
    .single()

  if (buildErr || !build) throw new Error(`Build create failed: ${buildErr?.message}`)

  const url = `${N8N_WEBHOOK_BASE}/${test.pipeline}`
  const startedAt = Date.now()

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buildId: build.id,
      commissionId: commission.id,
      prdJson: getMinimalPrd(test.archetype),
      archetype: test.archetype,
    }),
  })

  if (!res.ok) throw new Error(`Trigger failed: ${res.status}`)

  while (Date.now() - startedAt < MAX_BUILD_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const { data } = await supabase
      .from('Build')
      .select('status, studioAssignment')
      .eq('id', build.id)
      .single()

    if (data && (data.status === 'SUCCESS' || data.status === 'FAILED')) {
      const durationMs = Date.now() - startedAt

      // Cleanup
      await supabase.from('Build').delete().eq('id', build.id)
      await supabase.from('Commission').delete().eq('id', commission.id)

      return {
        label: test.label,
        status: data.status,
        durationMs,
        studioAssignment: data.studioAssignment,
      }
    }
  }

  // Cleanup on timeout
  await supabase.from('Build').delete().eq('commissionId', commission.id)
  await supabase.from('Commission').delete().eq('id', commission.id)

  return { label: test.label, status: 'TIMEOUT', durationMs: MAX_BUILD_WAIT_MS, studioAssignment: null }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  console.log('=== Sequential Build Baseline ===')
  console.log(`Running ${TEST_MATRIX.length} builds one at a time\n`)

  const results: BuildResult[] = []
  const overallStart = Date.now()

  for (let i = 0; i < TEST_MATRIX.length; i++) {
    const test = TEST_MATRIX[i]
    console.log(`[${i + 1}/${TEST_MATRIX.length}] Running ${test.label} (${test.archetype})...`)

    try {
      const result = await runSingleBuild(supabase, test)
      results.push(result)
      console.log(`  ${result.status} in ${(result.durationMs / 1000).toFixed(1)}s on ${result.studioAssignment || 'N/A'}`)
    } catch (err) {
      console.error(`  ERROR: ${err}`)
      results.push({ label: test.label, status: 'ERROR', durationMs: 0, studioAssignment: null })
    }
  }

  const totalElapsed = Date.now() - overallStart
  const totalSum = results.reduce((s, r) => s + r.durationMs, 0)
  const avgDuration = results.length > 0 ? totalSum / results.length : 0
  const successCount = results.filter((r) => r.status === 'SUCCESS').length

  console.log('\n=== BASELINE RESULTS ===')
  console.log(`Total sequential time:    ${(totalElapsed / 1000).toFixed(1)}s`)
  console.log(`Sum of build durations:   ${(totalSum / 1000).toFixed(1)}s`)
  console.log(`Avg build duration:       ${(avgDuration / 1000).toFixed(1)}s`)
  console.log(`Builds succeeded:         ${successCount}/${results.length}`)

  console.log('\n--- Per-Build Breakdown ---')
  console.log('Label       | Status  | Duration  | Studio')
  console.log('------------|---------|-----------|--------')
  for (const r of results) {
    const dur = `${(r.durationMs / 1000).toFixed(1)}s`.padEnd(9)
    const st = r.status.padEnd(7)
    const lbl = r.label.padEnd(11)
    console.log(`${lbl} | ${st} | ${dur} | ${r.studioAssignment || 'N/A'}`)
  }

  console.log('\nUse these numbers to compare with concurrent-builds.ts results.')
  process.exit(successCount === results.length ? 0 : 1)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
