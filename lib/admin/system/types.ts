// System Graph types — the data model for /admin/system visualization

export type SystemDomain =
  | 'core'
  | 'studio'
  | 'apps'
  | 'tools'
  | 'validation'
  | 'journeys'
  | 'blueprints'
  | 'story-maps'
  | 'distribution'
  | 'auth'

export type SystemNodeKind =
  | 'table'
  | 'app'
  | 'tool'
  | 'studio_project'

export interface SystemNode {
  id: string
  label: string
  kind: SystemNodeKind
  domain: SystemDomain
  href?: string
  description?: string
  tableCount?: number // for app/tool nodes: how many tables they own

  // Force simulation positions (set on client)
  x?: number
  y?: number
  z?: number
  // Velocity (used by simulation)
  vx?: number
  vy?: number
  vz?: number

  // Diagnostics (computed on client)
  diagnostics?: NodeDiagnostics
}

export type SystemEdgeType =
  | 'foreign_key'
  | 'entity_link'
  | 'ownership' // app/tool owns tables
  | 'structural' // e.g., studio_project -> hypotheses -> experiments chain

export interface SystemEdge {
  id: string
  source: string // node id
  target: string // node id
  type: SystemEdgeType
  label?: string
}

export interface NodeDiagnostics {
  connectionCount: number
  inDegree: number
  outDegree: number
  isOrphan: boolean
  couplingLevel: 'low' | 'medium' | 'high' | 'critical'
  signals: HealthSignal[]
}

export interface HealthSignal {
  severity: 'info' | 'warning' | 'error'
  message: string
}

export interface SystemGraphData {
  nodes: SystemNode[]
  edges: SystemEdge[]
}

// Domain visual config
export const DOMAIN_COLORS: Record<SystemDomain, string> = {
  core: '#3b82f6',        // blue
  studio: '#a855f7',      // purple
  apps: '#22c55e',        // green
  tools: '#f97316',       // orange
  validation: '#06b6d4',  // cyan
  journeys: '#14b8a6',    // teal
  blueprints: '#6366f1',  // indigo
  'story-maps': '#ec4899', // pink
  distribution: '#eab308', // yellow
  auth: '#ef4444',         // red
}

export const DOMAIN_LABELS: Record<SystemDomain, string> = {
  core: 'Core',
  studio: 'Studio',
  apps: 'Apps',
  tools: 'Tools',
  validation: 'Validation',
  journeys: 'Journeys',
  blueprints: 'Blueprints',
  'story-maps': 'Story Maps',
  distribution: 'Distribution',
  auth: 'Auth',
}
