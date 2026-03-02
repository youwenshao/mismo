import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface DashboardConfig {
  url: string
  serviceRoleKey: string
}

export interface AlertRecord {
  id: string
  priority: string
  category: string
  studio: string | null
  title: string
  details: Record<string, unknown> | null
  resolvedAt: string | null
  createdAt: string
}

export class DashboardStore {
  private supabase: SupabaseClient

  constructor(config: DashboardConfig) {
    this.supabase = createClient(config.url, config.serviceRoleKey)
  }

  async getRecentAlerts(limit = 50, filters?: {
    priority?: string
    category?: string
    unresolved?: boolean
  }): Promise<AlertRecord[]> {
    let query = this.supabase
      .from('MonitoringAlert')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit)

    if (filters?.priority) query = query.eq('priority', filters.priority)
    if (filters?.category) query = query.eq('category', filters.category)
    if (filters?.unresolved) query = query.is('resolvedAt', null)

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async getFarmStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical'
    unresolvedP0: number
    unresolvedP1: number
    lastAlertAt: string | null
  }> {
    const { data: alerts } = await this.supabase
      .from('MonitoringAlert')
      .select('priority, createdAt')
      .is('resolvedAt', null)
      .order('createdAt', { ascending: false })

    const unresolvedP0 = (alerts || []).filter(a => a.priority === 'P0').length
    const unresolvedP1 = (alerts || []).filter(a => a.priority === 'P1').length
    const lastAlertAt = alerts?.[0]?.createdAt || null

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (unresolvedP0 > 0) overall = 'critical'
    else if (unresolvedP1 > 0) overall = 'degraded'

    return { overall, unresolvedP0, unresolvedP1, lastAlertAt }
  }

  async resolveAlert(id: string): Promise<void> {
    await this.supabase
      .from('MonitoringAlert')
      .update({ resolvedAt: new Date().toISOString() })
      .eq('id', id)
  }
}
