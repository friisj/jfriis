'use client'

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import type { SystemNode, SystemEdge, SystemGraphData, SystemDomain } from '@/lib/admin/system/types'
import { DOMAIN_COLORS } from '@/lib/admin/system/types'
import { getDomainCenter } from '@/lib/admin/system/static-registry'

// ─── Force simulation types ──────────────────────────────────────────

interface SimNode extends SimulationNodeDatum {
  id: string
  domain: SystemDomain
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string
}

// ─── Force simulation hook ───────────────────────────────────────────

function useForceSimulation(graph: SystemGraphData) {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null)

  useEffect(() => {
    const simNodes: SimNode[] = graph.nodes.map((node) => {
      const center = getDomainCenter(node.domain)
      return {
        id: node.id,
        domain: node.domain,
        x: center.x + (Math.random() - 0.5) * 60,
        y: center.z + (Math.random() - 0.5) * 60,
      }
    })

    const nodeById = new Map(simNodes.map((n) => [n.id, n]))
    const simLinks: SimLink[] = graph.edges
      .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }))

    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(30)
          .strength(0.3)
      )
      .force('charge', forceManyBody().strength(-80))
      .force(
        'x',
        forceX<SimNode>((d) => getDomainCenter(d.domain).x).strength(0.15)
      )
      .force(
        'y',
        forceY<SimNode>((d) => getDomainCenter(d.domain).z).strength(0.15)
      )
      .alphaDecay(0.02)
      .on('tick', () => {
        const next = new Map<string, { x: number; y: number }>()
        for (const node of simNodes) {
          next.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 })
        }
        setPositions(new Map(next))
      })

    simRef.current = sim

    return () => {
      sim.stop()
    }
  }, [graph])

  return positions
}

// ─── Node component ──────────────────────────────────────────────────

interface NodeMeshProps {
  node: SystemNode
  position: [number, number, number]
  isSelected: boolean
  isHovered: boolean
  isConnected: boolean
  onSelect: (node: SystemNode) => void
  onHover: (node: SystemNode | null) => void
}

function NodeMesh({ node, position, isSelected, isHovered, isConnected, onSelect, onHover }: NodeMeshProps) {
  const meshRef = useRef<import('three').Mesh>(null)
  const color = DOMAIN_COLORS[node.domain]

  // Size based on kind + connection count
  const baseSize = node.kind === 'table' ? 1.5 : 3
  const connectionBonus = Math.min((node.diagnostics?.connectionCount ?? 0) * 0.15, 2)
  const size = baseSize + connectionBonus

  // Opacity based on diagnostic state
  const opacity = node.diagnostics?.isOrphan ? 0.4 : 1

  // Emissive intensity for selection/hover
  const emissiveIntensity = isSelected ? 0.8 : isHovered ? 0.5 : isConnected ? 0.3 : 0

  // Shape: spheres for entities, boxes for tables
  const geometry = node.kind === 'table' ? 'box' : 'sphere'

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(node)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(node)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          onHover(null)
          document.body.style.cursor = 'default'
        }}
      >
        {geometry === 'sphere' ? (
          <sphereGeometry args={[size, 16, 16]} />
        ) : (
          <boxGeometry args={[size * 1.2, size * 1.2, size * 1.2]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent={opacity < 1}
          opacity={opacity}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Label — show on hover, selection, or for non-table nodes */}
      {(isSelected || isHovered || node.kind !== 'table') && (
        <Html
          center
          distanceFactor={300}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            className="whitespace-nowrap text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              color: 'white',
              backgroundColor: `${color}cc`,
              border: `1px solid ${color}`,
            }}
          >
            {node.label}
          </div>
        </Html>
      )}
    </group>
  )
}

// ─── Edge component ──────────────────────────────────────────────────

interface EdgeLineProps {
  from: [number, number, number]
  to: [number, number, number]
  type: SystemEdge['type']
  isHighlighted: boolean
}

function EdgeLine({ from, to, type, isHighlighted }: EdgeLineProps) {
  const points = useMemo(() => [from, to] as [number, number, number][], [from, to])

  const colorMap: Record<SystemEdge['type'], string> = {
    foreign_key: '#64748b',
    entity_link: '#06b6d4',
    ownership: '#a855f7',
    structural: '#94a3b8',
  }

  const opacity = isHighlighted ? 0.8 : 0.15

  return (
    <Line
      points={points}
      color={colorMap[type]}
      transparent
      opacity={opacity}
      lineWidth={1}
    />
  )
}

// ─── Domain label ────────────────────────────────────────────────────

function DomainLabel({ domain }: { domain: SystemDomain }) {
  const center = getDomainCenter(domain)
  const color = DOMAIN_COLORS[domain]

  return (
    <Html
      position={[center.x, 8, center.z]}
      center
      distanceFactor={600}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-sm"
        style={{ color, borderBottom: `2px solid ${color}`, opacity: 0.7 }}
      >
        {domain}
      </div>
    </Html>
  )
}

// ─── Graph scene (inside Canvas) ─────────────────────────────────────

interface GraphSceneProps {
  graph: SystemGraphData
  positions: Map<string, { x: number; y: number }>
  selectedNode: SystemNode | null
  hoveredNode: SystemNode | null
  onSelectNode: (node: SystemNode | null) => void
  onHoverNode: (node: SystemNode | null) => void
}

function GraphScene({
  graph,
  positions,
  selectedNode,
  hoveredNode,
  onSelectNode,
  onHoverNode,
}: GraphSceneProps) {
  // Track which nodes are connected to the hovered/selected node
  const connectedNodeIds = useMemo(() => {
    const focusId = hoveredNode?.id ?? selectedNode?.id
    if (!focusId) return new Set<string>()
    const connected = new Set<string>()
    for (const edge of graph.edges) {
      if (edge.source === focusId) connected.add(edge.target)
      if (edge.target === focusId) connected.add(edge.source)
    }
    return connected
  }, [hoveredNode, selectedNode, graph.edges])

  const focusId = hoveredNode?.id ?? selectedNode?.id

  // Get all unique domains for labels
  const domains = useMemo(() => {
    const set = new Set<SystemDomain>()
    for (const node of graph.nodes) set.add(node.domain)
    return Array.from(set)
  }, [graph.nodes])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 200, 100]} intensity={0.8} />
      <pointLight position={[-100, 100, -100]} intensity={0.3} color="#06b6d4" />

      {/* Ground reference plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial color="#0a0a0f" transparent opacity={0.3} />
      </mesh>

      {/* Domain labels */}
      {domains.map((d) => (
        <DomainLabel key={d} domain={d} />
      ))}

      {/* Edges */}
      {graph.edges.map((edge) => {
        const fromPos = positions.get(edge.source)
        const toPos = positions.get(edge.target)
        if (!fromPos || !toPos) return null

        const isHighlighted =
          focusId === edge.source ||
          focusId === edge.target

        return (
          <EdgeLine
            key={edge.id}
            from={[fromPos.x, 0, fromPos.y]}
            to={[toPos.x, 0, toPos.y]}
            type={edge.type}
            isHighlighted={isHighlighted}
          />
        )
      })}

      {/* Nodes */}
      {graph.nodes.map((node) => {
        const pos = positions.get(node.id)
        if (!pos) return null

        return (
          <NodeMesh
            key={node.id}
            node={node}
            position={[pos.x, 0, pos.y]}
            isSelected={selectedNode?.id === node.id}
            isHovered={hoveredNode?.id === node.id}
            isConnected={connectedNodeIds.has(node.id)}
            onSelect={onSelectNode}
            onHover={onHoverNode}
          />
        )
      })}

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={50}
        maxDistance={600}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}

// ─── Camera auto-fit ─────────────────────────────────────────────────

function CameraSetup() {
  const { camera } = useThree()
  const initialized = useRef(false)

  useFrame(() => {
    if (!initialized.current) {
      camera.position.set(0, 300, 300)
      camera.lookAt(0, 0, 0)
      initialized.current = true
    }
  })

  return null
}

// ─── Exported component ──────────────────────────────────────────────

interface SystemGraphProps {
  graph: SystemGraphData
  selectedNode: SystemNode | null
  hoveredNode: SystemNode | null
  onSelectNode: (node: SystemNode | null) => void
  onHoverNode: (node: SystemNode | null) => void
}

export function SystemGraph({
  graph,
  selectedNode,
  hoveredNode,
  onSelectNode,
  onHoverNode,
}: SystemGraphProps) {
  const positions = useForceSimulation(graph)

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking the canvas background (not a node)
      if ((e.target as HTMLElement).tagName === 'CANVAS') {
        onSelectNode(null)
      }
    },
    [onSelectNode]
  )

  return (
    <div className="w-full h-full" onClick={handleCanvasClick}>
      <Canvas
        camera={{ fov: 60, near: 1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#050510' }}
      >
        <CameraSetup />
        <fog attach="fog" args={['#050510', 400, 800]} />
        <GraphScene
          graph={graph}
          positions={positions}
          selectedNode={selectedNode}
          hoveredNode={hoveredNode}
          onSelectNode={onSelectNode}
          onHoverNode={onHoverNode}
        />
      </Canvas>
    </div>
  )
}
