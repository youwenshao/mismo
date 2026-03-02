'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { KanbanColumn } from './kanban-column'
import { KanbanCard, type CommissionCardData } from './kanban-card'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'

const COLUMNS = [
  { id: 'interview', title: 'Interview', statuses: ['DRAFT', 'DISCOVERY'] },
  { id: 'queued', title: 'Queued', statuses: ['IN_PROGRESS'] },
  { id: 'building', title: 'Building', statuses: [] },
  { id: 'testing', title: 'Testing', statuses: ['ESCALATED'] },
  { id: 'delivered', title: 'Delivered', statuses: ['COMPLETED'] },
] as const

const STATUS_MAP: Record<string, string> = {
  interview: 'DISCOVERY',
  queued: 'IN_PROGRESS',
  building: 'IN_PROGRESS',
  testing: 'ESCALATED',
  delivered: 'COMPLETED',
}

interface KanbanBoardProps {
  initialCommissions: CommissionCardData[]
}

export function KanbanBoard({ initialCommissions }: KanbanBoardProps) {
  const [commissions, setCommissions] =
    useState<CommissionCardData[]>(initialCommissions)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  useRealtimeSubscription(
    'Commission',
    useCallback(
      (event) => {
        if (event.eventType === 'UPDATE' && event.new.id) {
          setCommissions((prev) =>
            prev.map((c) =>
              c.id === event.new.id
                ? { ...c, status: event.new.status as string }
                : c
            )
          )
        }
      },
      []
    )
  )

  function getColumnCommissions(columnId: string): CommissionCardData[] {
    const col = COLUMNS.find((c) => c.id === columnId)
    if (!col) return []

    if (columnId === 'building') {
      return commissions.filter(
        (c) =>
          c.status === 'IN_PROGRESS' &&
          c.latestBuildStatus &&
          ['RUNNING', 'PENDING'].includes(c.latestBuildStatus)
      )
    }

    return commissions.filter(
      (c) =>
        (col.statuses as readonly string[]).includes(c.status) &&
        (columnId !== 'queued' ||
          !c.latestBuildStatus ||
          !['RUNNING', 'PENDING'].includes(c.latestBuildStatus))
    )
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const commissionId = active.id as string
    const targetColumn = COLUMNS.find((col) => col.id === over.id)?.id ?? over.id
    const newStatus = STATUS_MAP[targetColumn as string]
    if (!newStatus) return

    const commission = commissions.find((c) => c.id === commissionId)
    if (!commission || commission.status === newStatus) return

    setUpdating(commissionId)
    setCommissions((prev) =>
      prev.map((c) => (c.id === commissionId ? { ...c, status: newStatus } : c))
    )

    try {
      const res = await fetch(`/api/commissions/${commissionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        setCommissions((prev) =>
          prev.map((c) =>
            c.id === commissionId ? { ...c, status: commission.status } : c
          )
        )
      }
    } catch {
      setCommissions((prev) =>
        prev.map((c) =>
          c.id === commissionId ? { ...c, status: commission.status } : c
        )
      )
    } finally {
      setUpdating(null)
    }
  }

  const activeCommission = activeId
    ? commissions.find((c) => c.id === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            commissions={getColumnCommissions(col.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCommission ? (
          <div className="opacity-80 rotate-2">
            <KanbanCard commission={activeCommission} />
          </div>
        ) : null}
      </DragOverlay>

      {updating && (
        <div className="fixed bottom-4 right-4 bg-black text-white text-xs px-3 py-1.5 rounded-full">
          Updating...
        </div>
      )}
    </DndContext>
  )
}
