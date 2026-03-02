'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

interface TaskNodeData {
  label: string
  taskId: string
  taskType: string
  status: string
  color: string
  [key: string]: unknown
}

export function TaskNode({ data }: NodeProps) {
  const nodeData = data as TaskNodeData

  const statusLabel: Record<string, string> = {
    completed: 'Done',
    in_progress: 'Running',
    waiting: 'Waiting',
    failed: 'Failed',
  }

  return (
    <div
      className="rounded-lg border-2 bg-white px-4 py-3 min-w-[140px] shadow-sm"
      style={{ borderColor: nodeData.color }}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-300" />

      <div className="text-xs font-semibold mb-1">{nodeData.label}</div>
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: nodeData.color }}
        />
        <span className="text-[10px] text-gray-500">
          {statusLabel[nodeData.status] ?? nodeData.status}
        </span>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-gray-300" />
    </div>
  )
}
