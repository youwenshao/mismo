'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'

export interface CommissionCardData {
  id: string
  clientEmail: string
  status: string
  paymentState: string
  archetypeName: string | null
  latestBuildStatus: string | null
  feasibilityScore: number | null
  createdAt: string
}

interface KanbanCardProps {
  commission: CommissionCardData
}

const paymentBadge: Record<string, string> = {
  UNPAID: 'bg-gray-100 text-gray-600',
  PARTIAL: 'bg-amber-50 text-amber-700 border border-amber-200',
  FINAL: 'bg-green-50 text-green-700 border border-green-200',
}

const buildStatusDot: Record<string, string> = {
  PENDING: 'bg-gray-300',
  RUNNING: 'bg-blue-500 animate-pulse',
  SUCCESS: 'bg-green-500',
  FAILED: 'bg-red-500',
}

export function KanbanCard({ commission }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: commission.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border border-gray-200 rounded-lg bg-white p-3 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {commission.feasibilityScore != null && commission.feasibilityScore < 80 && (
            <span
              className="flex-shrink-0 text-amber-500"
              title={`Feasibility: ${commission.feasibilityScore.toFixed(0)}`}
            >
              &#9888;
            </span>
          )}
          <Link
            href={`/commissions/${commission.id}`}
            className="text-xs font-medium hover:underline truncate max-w-[130px]"
            onClick={(e) => e.stopPropagation()}
          >
            {commission.clientEmail}
          </Link>
        </div>
        {commission.latestBuildStatus && (
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${buildStatusDot[commission.latestBuildStatus] ?? 'bg-gray-300'}`}
          />
        )}
      </div>

      {commission.archetypeName && (
        <p className="text-[10px] text-gray-400 mb-2">
          {commission.archetypeName}
        </p>
      )}

      <span
        className={`text-[10px] px-1.5 py-0.5 rounded ${paymentBadge[commission.paymentState] ?? 'bg-gray-100 text-gray-600'}`}
      >
        {commission.paymentState}
      </span>
    </div>
  )
}
