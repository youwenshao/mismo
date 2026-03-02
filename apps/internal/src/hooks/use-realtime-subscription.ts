'use client'

import { useEffect } from 'react'
import { useRealtime } from '@/components/shared/realtime-provider'

export function useRealtimeSubscription(
  table: string,
  callback: (event: {
    table: string
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: Record<string, unknown>
    old: Record<string, unknown>
  }) => void
) {
  const { subscribe } = useRealtime()

  useEffect(() => {
    return subscribe(table, callback)
  }, [table, callback, subscribe])
}
