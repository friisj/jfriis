'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { SystemGraph } from './SystemGraph'
import { SystemSidebar } from './SystemSidebar'
import { usePrivateHeader } from '@/components/layout/private-header-context'
import type { SystemNode, SystemGraphData, SystemDomain } from '@/lib/admin/system/types'
import { DOMAIN_COLORS, DOMAIN_LABELS } from '@/lib/admin/system/types'
import { fetchSystemGraph } from '@/app/actions/admin/system'
import { Loader2 } from 'lucide-react'

type FilterState = {
  domains: Set<SystemDomain>
  kinds: Set<string>
}

export function SystemView() {
  const { setHardNavigation } = usePrivateHeader()
  const [graph, setGraph] = useState<SystemGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<SystemNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<SystemNode | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    domains: new Set(),
    kinds: new Set(),
  })

  // Mark as WebGL page for hard navigation
  useEffect(() => {
    setHardNavigation(true)
    return () => setHardNavigation(false)
  }, [setHardNavigation])

  // Fetch graph data
  useEffect(() => {
    let cancelled = false
    fetchSystemGraph()
      .then((data) => {
        if (!cancelled) {
          setGraph(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  // Filter the graph
  const filteredGraph = useMemo((): SystemGraphData | null => {
    if (!graph) return null
    if (filters.domains.size === 0 && filters.kinds.size === 0) return graph

    const filteredNodes = graph.nodes.filter((node) => {
      if (filters.domains.size > 0 && !filters.domains.has(node.domain)) return false
      if (filters.kinds.size > 0 && !filters.kinds.has(node.kind)) return false
      return true
    })

    const nodeIds = new Set(filteredNodes.map((n) => n.id))
    const filteredEdges = graph.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    )

    return { nodes: filteredNodes, edges: filteredEdges }
  }, [graph, filters])

  const handleSelectNode = useCallback((node: SystemNode | null) => {
    setSelectedNode(node)
  }, [])

  const handleHoverNode = useCallback((node: SystemNode | null) => {
    setHoveredNode(node)
  }, [])

  const handleNavigateToNode = useCallback(
    (nodeId: string) => {
      const node = graph?.nodes.find((n) => n.id === nodeId)
      if (node) setSelectedNode(node)
    },
    [graph]
  )

  const toggleDomainFilter = useCallback((domain: SystemDomain) => {
    setFilters((prev) => {
      const next = new Set(prev.domains)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return { ...prev, domains: next }
    })
  }, [])

  const toggleKindFilter = useCallback((kind: string) => {
    setFilters((prev) => {
      const next = new Set(prev.kinds)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return { ...prev, kinds: next }
    })
  }, [])

  // Stats
  const stats = useMemo(() => {
    if (!filteredGraph) return null
    return {
      nodes: filteredGraph.nodes.length,
      edges: filteredGraph.edges.length,
      orphans: filteredGraph.nodes.filter((n) => n.diagnostics?.isOrphan).length,
      critical: filteredGraph.nodes.filter((n) => n.diagnostics?.couplingLevel === 'critical').length,
    }
  }, [filteredGraph])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#050510]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading system graph...</span>
        </div>
      </div>
    )
  }

  if (error || !filteredGraph) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#050510]">
        <p className="text-sm text-red-400">Failed to load: {error ?? 'Unknown error'}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Graph canvas */}
      <div className="flex-1 relative">
        <SystemGraph
          graph={filteredGraph}
          selectedNode={selectedNode}
          hoveredNode={hoveredNode}
          onSelectNode={handleSelectNode}
          onHoverNode={handleHoverNode}
        />

        {/* Overlay: Stats bar */}
        {stats && (
          <div className="absolute top-3 left-3 flex items-center gap-4 bg-black/60 backdrop-blur-sm border border-white/10 rounded px-3 py-1.5">
            <Stat label="Nodes" value={stats.nodes} />
            <Stat label="Edges" value={stats.edges} />
            {stats.orphans > 0 && <Stat label="Orphans" value={stats.orphans} color="text-yellow-400" />}
            {stats.critical > 0 && <Stat label="Critical" value={stats.critical} color="text-red-400" />}
          </div>
        )}

        {/* Overlay: Domain legend / filters */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
            Domains
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(DOMAIN_LABELS) as [SystemDomain, string][]).map(([domain, label]) => {
              const active = filters.domains.size === 0 || filters.domains.has(domain)
              return (
                <button
                  key={domain}
                  onClick={() => toggleDomainFilter(domain)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] transition-opacity border"
                  style={{
                    opacity: active ? 1 : 0.3,
                    borderColor: `${DOMAIN_COLORS[domain]}40`,
                    backgroundColor: active ? `${DOMAIN_COLORS[domain]}15` : 'transparent',
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: DOMAIN_COLORS[domain] }}
                  />
                  {label}
                </button>
              )
            })}
          </div>

          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-3 mb-2 font-semibold">
            Types
          </div>
          <div className="flex gap-1.5">
            {[
              { kind: 'table', label: 'Tables', shape: '□' },
              { kind: 'app', label: 'Apps', shape: '●' },
              { kind: 'tool', label: 'Tools', shape: '●' },
              { kind: 'studio_project', label: 'Studio', shape: '●' },
            ].map(({ kind, label, shape }) => {
              const active = filters.kinds.size === 0 || filters.kinds.has(kind)
              return (
                <button
                  key={kind}
                  onClick={() => toggleKindFilter(kind)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] transition-opacity border border-white/10"
                  style={{ opacity: active ? 1 : 0.3 }}
                >
                  <span className="font-mono">{shape}</span>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Overlay: Hovered node tooltip */}
        {hoveredNode && !selectedNode && (
          <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded p-3 max-w-xs">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: DOMAIN_COLORS[hoveredNode.domain] }}
              />
              <span className="text-xs font-mono font-semibold">{hoveredNode.label}</span>
            </div>
            {hoveredNode.description && (
              <p className="text-[10px] text-muted-foreground">{hoveredNode.description}</p>
            )}
            {hoveredNode.diagnostics && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {hoveredNode.diagnostics.connectionCount} connections
                {hoveredNode.diagnostics.isOrphan && ' · orphan'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      {selectedNode && graph && (
        <SystemSidebar
          node={selectedNode}
          edges={graph.edges}
          allNodes={graph.nodes}
          onClose={() => setSelectedNode(null)}
          onNavigateToNode={handleNavigateToNode}
        />
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-mono font-bold ${color ?? 'text-white'}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}
