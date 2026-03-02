'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeEvent {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

interface RealtimeContextValue {
  lastEvent: RealtimeEvent | null
  subscribe: (table: string, callback: (event: RealtimeEvent) => void) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue>({
  lastEvent: null,
  subscribe: () => () => {},
})

export function useRealtime() {
  return useContext(RealtimeContext)
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const [listeners] = useState(
    () => new Map<string, Set<(event: RealtimeEvent) => void>>()
  )
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel('mission-control')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Build' },
        (payload) => {
          const evt: RealtimeEvent = {
            table: 'Build',
            eventType: payload.eventType as RealtimeEvent['eventType'],
            new: (payload.new ?? {}) as Record<string, unknown>,
            old: (payload.old ?? {}) as Record<string, unknown>,
          }
          setLastEvent(evt)
          listeners.get('Build')?.forEach((cb) => cb(evt))
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Commission' },
        (payload) => {
          const evt: RealtimeEvent = {
            table: 'Commission',
            eventType: payload.eventType as RealtimeEvent['eventType'],
            new: (payload.new ?? {}) as Record<string, unknown>,
            old: (payload.old ?? {}) as Record<string, unknown>,
          }
          setLastEvent(evt)
          listeners.get('Commission')?.forEach((cb) => cb(evt))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'StudioMetrics' },
        (payload) => {
          const evt: RealtimeEvent = {
            table: 'StudioMetrics',
            eventType: 'INSERT',
            new: (payload.new ?? {}) as Record<string, unknown>,
            old: {},
          }
          setLastEvent(evt)
          listeners.get('StudioMetrics')?.forEach((cb) => cb(evt))
        }
      )
      .subscribe()

    setChannel(ch)

    return () => {
      ch.unsubscribe()
    }
  }, [listeners])

  const subscribe = useCallback(
    (table: string, callback: (event: RealtimeEvent) => void) => {
      if (!listeners.has(table)) {
        listeners.set(table, new Set())
      }
      listeners.get(table)!.add(callback)
      return () => {
        listeners.get(table)?.delete(callback)
      }
    },
    [listeners]
  )

  return (
    <RealtimeContext.Provider value={{ lastEvent, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  )
}
