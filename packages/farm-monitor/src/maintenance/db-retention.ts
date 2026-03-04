import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface SupabaseConfig {
  url: string
  serviceRoleKey: string
}

const RETENTION = {
  STUDIO_METRICS_DAYS: 30,
  API_HEALTH_SNAPSHOT_DAYS: 30,
  MONITORING_ALERTS_DAYS: 90,
}

const BATCH_SIZE = 500

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

export class DbRetention {
  private supabase: SupabaseClient | null = null

  constructor(private config: SupabaseConfig) {}

  private getClient(): SupabaseClient {
    if (!this.config.url) {
      throw new Error('SUPABASE_URL is not configured for DB retention.')
    }
    if (!this.supabase) {
      this.supabase = createClient(this.config.url, this.config.serviceRoleKey)
    }
    return this.supabase
  }

  private async deleteOldRows(
    table: string,
    cutoff: string,
    dateColumn = 'createdAt',
  ): Promise<number> {
    const client = this.getClient()
    let totalDeleted = 0
    let deleted: number

    do {
      const { data, error: selectError } = await client
        .from(table)
        .select('id')
        .lt(dateColumn, cutoff)
        .limit(BATCH_SIZE)

      if (selectError) {
        console.error(`[db-retention] Failed to query ${table}:`, selectError)
        break
      }
      if (!data || data.length === 0) break

      const ids = data.map((r: { id: string }) => r.id)
      const { error: deleteError, count } = await client
        .from(table)
        .delete({ count: 'exact' })
        .in('id', ids)

      if (deleteError) {
        console.error(`[db-retention] Failed to delete from ${table}:`, deleteError)
        break
      }

      deleted = count ?? ids.length
      totalDeleted += deleted
    } while (deleted === BATCH_SIZE)

    return totalDeleted
  }

  async run(): Promise<void> {
    const startTime = Date.now()
    const results: Record<string, number> = {}

    results.studioMetrics = await this.deleteOldRows(
      'StudioMetrics',
      daysAgo(RETENTION.STUDIO_METRICS_DAYS),
    )

    results.apiHealthSnapshots = await this.deleteOldRows(
      'ApiHealthSnapshot',
      daysAgo(RETENTION.API_HEALTH_SNAPSHOT_DAYS),
    )

    const alertCutoff = daysAgo(RETENTION.MONITORING_ALERTS_DAYS)
    const client = this.getClient()
    let alertsDeleted = 0
    let deleted: number
    do {
      const { data, error: selectError } = await client
        .from('MonitoringAlert')
        .select('id')
        .not('resolvedAt', 'is', null)
        .lt('createdAt', alertCutoff)
        .limit(BATCH_SIZE)

      if (selectError || !data || data.length === 0) break

      const ids = data.map((r: { id: string }) => r.id)
      const { error: deleteError, count } = await client
        .from('MonitoringAlert')
        .delete({ count: 'exact' })
        .in('id', ids)

      if (deleteError) break

      deleted = count ?? ids.length
      alertsDeleted += deleted
    } while (deleted === BATCH_SIZE)
    results.monitoringAlerts = alertsDeleted

    const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0)
    const durationMs = Date.now() - startTime

    if (totalDeleted > 0) {
      console.log(
        `[db-retention] Cleaned up ${totalDeleted} rows in ${(durationMs / 1000).toFixed(1)}s`,
      )
      for (const [table, count] of Object.entries(results)) {
        if (count > 0) console.log(`[db-retention]   ${table}: ${count} deleted`)
      }
    } else {
      console.log(`[db-retention] No rows to clean up (${(durationMs / 1000).toFixed(1)}s)`)
    }
  }
}
