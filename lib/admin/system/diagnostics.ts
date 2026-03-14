import type { SystemGraphData, SystemNode, NodeDiagnostics, HealthSignal } from './types'

export function computeDiagnostics(graph: SystemGraphData): SystemGraphData {
  const inDegree = new Map<string, number>()
  const outDegree = new Map<string, number>()

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0)
    outDegree.set(node.id, 0)
  }

  for (const edge of graph.edges) {
    outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  const nodes = graph.nodes.map((node): SystemNode => {
    const inc = inDegree.get(node.id) ?? 0
    const out = outDegree.get(node.id) ?? 0
    const total = inc + out
    const signals: HealthSignal[] = []

    // Orphan detection
    const isOrphan = total === 0

    if (isOrphan && node.kind === 'table') {
      signals.push({ severity: 'warning', message: 'Isolated table — no foreign keys or entity links' })
    }

    // Coupling level
    let couplingLevel: NodeDiagnostics['couplingLevel'] = 'low'
    if (total > 15) {
      couplingLevel = 'critical'
      signals.push({ severity: 'info', message: `High coupling: ${total} connections` })
    } else if (total > 8) {
      couplingLevel = 'high'
    } else if (total > 3) {
      couplingLevel = 'medium'
    }

    // Junction table pattern (high in + high out, table kind)
    if (node.kind === 'table' && inc > 0 && out > 0 && total > 4) {
      signals.push({ severity: 'info', message: 'Junction/bridge table — connects multiple domains' })
    }

    // Leaf node (only has incoming, no outgoing FK)
    if (node.kind === 'table' && inc === 0 && out > 0) {
      // Root table in its domain
      signals.push({ severity: 'info', message: 'Root table — no parent dependencies' })
    }

    // App/tool with no owned tables
    if ((node.kind === 'app' || node.kind === 'tool') && (node.tableCount ?? 0) === 0) {
      signals.push({ severity: 'info', message: 'No dedicated database tables' })
    }

    return {
      ...node,
      diagnostics: {
        connectionCount: total,
        inDegree: inc,
        outDegree: out,
        isOrphan,
        couplingLevel,
        signals,
      },
    }
  })

  return { nodes, edges: graph.edges }
}
