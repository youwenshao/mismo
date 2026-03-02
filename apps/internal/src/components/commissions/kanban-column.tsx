'use client'

import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { KanbanCard, type CommissionCardData } from './kanban-card'

interface KanbanColumnProps {
  id: string
  title: string
  commissions: CommissionCardData[]
}

export function KanbanColumn({ id, title, commissions }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[250px] w-[250px] rounded-lg transition-colors ${
        isOver ? 'bg-gray-100' : 'bg-gray-50'
      }`}
    >
      <div className="px-3 py-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </h3>
        <span className="text-[10px] font-mono text-gray-400">
          {commissions.length}
        </span>
      </div>

      <SortableContext
        items={commissions.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 px-2 pb-2 space-y-2 min-h-[100px]">
          {commissions.map((commission) => (
            <KanbanCard key={commission.id} commission={commission} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
