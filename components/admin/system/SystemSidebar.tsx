'use client'

import type { SystemNode, SystemEdge } from '@/lib/admin/system/types'
import { DOMAIN_COLORS, DOMAIN_LABELS } from '@/lib/admin/system/types'
import { X, ExternalLink, AlertTriangle, Info, AlertCircle } from 'lucide-react'

interface SystemSidebarProps {
  node: SystemNode
  edges: SystemEdge[]
  allNodes: SystemNode[]
  onClose: () => void
  onNavigateToNode: (nodeId: string) => void
}

export function SystemSidebar({ node, edges, allNodes, onClose, onNavigateToNode }: SystemSidebarProps) {
  const domainColor = DOMAIN_COLORS[node.domain]

  // Find connected edges
  const connectedEdges = edges.filter((e) => e.source === node.id || e.target === node.id)

  // Group by edge type
  const edgesByType = connectedEdges.reduce(
    (acc, edge) => {
      const type = edge.type
      if (!acc[type]) acc[type] = []
      acc[type].push(edge)
      return acc
    },
    {} as Record<string, SystemEdge[]>
  )

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]))

  const kindLabel = {
    table: 'Database Table',
    app: 'Application',
    tool: 'Tool',
    studio_project: 'Studio Project',
  }[node.kind]

  const severityIcon = {
    info: <Info className="w-3.5 h-3.5 text-blue-400" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />,
    error: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  }

  const edgeTypeLabel: Record<string, string> = {
    foreign_key: 'Foreign Keys',
    entity_link: 'Entity Links',
    ownership: 'Ownership',
    structural: 'Structural',
  }

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: domainColor }}
              />
              <span className="text-xs text-muted-foreground">{kindLabel}</span>
            </div>
            <h3 className="font-mono text-sm font-semibold truncate">{node.label}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {node.description && (
          <p className="text-xs text-muted-foreground mt-2">{node.description}</p>
        )}

        {node.href && (
          <a
            href={node.href}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
          >
            Open in admin <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Diagnostics */}
      {node.diagnostics && (
        <div className="p-4 border-b border-border flex-shrink-0">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Diagnostics
          </h4>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-lg font-mono font-bold">{node.diagnostics.connectionCount}</div>
              <div className="text-[10px] text-muted-foreground">Connections</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold">{node.diagnostics.inDegree}</div>
              <div className="text-[10px] text-muted-foreground">In</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold">{node.diagnostics.outDegree}</div>
              <div className="text-[10px] text-muted-foreground">Out</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Coupling:</span>
            <CouplingBadge level={node.diagnostics.couplingLevel} />
          </div>

          {node.diagnostics.signals.length > 0 && (
            <div className="space-y-1.5 mt-3">
              {node.diagnostics.signals.map((signal, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {severityIcon[signal.severity]}
                  <span className="text-muted-foreground">{signal.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Connections */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Connections ({connectedEdges.length})
        </h4>

        {Object.entries(edgesByType).map(([type, typeEdges]) => (
          <div key={type} className="mb-4">
            <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {edgeTypeLabel[type] ?? type} ({typeEdges.length})
            </h5>
            <div className="space-y-1">
              {typeEdges.map((edge) => {
                const otherId = edge.source === node.id ? edge.target : edge.source
                const otherNode = nodeMap.get(otherId)
                if (!otherNode) return null

                const direction = edge.source === node.id ? '→' : '←'

                return (
                  <button
                    key={edge.id}
                    onClick={() => onNavigateToNode(otherId)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-muted transition-colors"
                  >
                    <span className="text-muted-foreground font-mono">{direction}</span>
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DOMAIN_COLORS[otherNode.domain] }}
                    />
                    <span className="font-mono truncate">{otherNode.label}</span>
                    {edge.label && (
                      <span className="text-muted-foreground ml-auto flex-shrink-0">
                        {edge.label}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {connectedEdges.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No connections found</p>
        )}
      </div>

      {/* Domain info */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: domainColor }}
          />
          <span className="text-xs text-muted-foreground">
            {DOMAIN_LABELS[node.domain]} domain
          </span>
        </div>
      </div>
    </div>
  )
}

function CouplingBadge({ level }: { level: string }) {
  const config = {
    low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  }[level] ?? { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' }

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${config.bg} ${config.text} ${config.border}`}>
      {level}
    </span>
  )
}
