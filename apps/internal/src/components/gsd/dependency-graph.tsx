'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TaskNode } from './task-node'
import type { ParallelizationSuggestion } from '@/lib/parallelization-analyzer'

const nodeTypes = { taskNode: TaskNode }

interface DependencyGraphProps {
  commissionId: string
}

export function DependencyGraph({ commissionId }: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [criticalPath, setCriticalPath] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<ParallelizationSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch(`/api/gsd/${commissionId}/graph`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setNodes(data.nodes)
      setEdges(data.edges)
      setCriticalPath(data.criticalPath ?? [])
      setSuggestions(data.suggestions ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }, [commissionId, setNodes, setEdges])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-8 flex items-center justify-center h-[500px]">
        <p className="text-sm text-gray-400">Loading dependency graph...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-lg bg-red-50 p-4 text-sm text-red-700">
        Failed to load graph: {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 border border-blue-200 bg-blue-50 rounded-lg text-xs text-blue-800"
            >
              <span className="font-medium">Suggestion:</span>
              <span>{s.message}</span>
            </div>
          ))}
        </div>
      )}

      {criticalPath.length > 0 && (
        <div className="px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-xs text-gray-600">
          <span className="font-medium">Critical Path:</span>{' '}
          {criticalPath.join(' → ')}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden" style={{ height: 500 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <div className="flex gap-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Completed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> In Progress
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Waiting
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Failed
        </span>
      </div>
    </div>
  )
}
