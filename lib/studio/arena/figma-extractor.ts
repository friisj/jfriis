/**
 * Figma Node Extractor
 *
 * Deterministic extraction of design tokens from Figma node JSON.
 * Recursively walks node trees, collecting exact color, font, and spacing values.
 * No AI involved — pure data transformation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedColor {
  hex: string
  count: number
  nodeNames: string[]
  usage: 'fill' | 'stroke'
}

export interface ExtractedFont {
  family: string
  size: number
  weight: number
  count: number
  nodeNames: string[]
  lineHeightPx?: number
  letterSpacing?: number
}

export interface ExtractedSpacing {
  type: 'padding' | 'gap' | 'corner-radius'
  value: number
  count: number
}

export interface ExtractedShadow {
  type: 'drop' | 'inner'
  offsetX: number
  offsetY: number
  blurRadius: number
  spreadRadius: number
  color: string // hex
  count: number
}

export interface ExtractedTokens {
  colors: ExtractedColor[]
  fonts: ExtractedFont[]
  spacing: ExtractedSpacing[]
  shadows: ExtractedShadow[]
  frameNames: string[]
  /** Fill colors from the root-level frame nodes — strong signal for Background */
  rootBackgrounds: string[]
}

// ---------------------------------------------------------------------------
// Figma node type definitions (subset relevant to extraction)
// ---------------------------------------------------------------------------

interface FigmaColor {
  r: number // 0-1
  g: number // 0-1
  b: number // 0-1
  a: number // 0-1
}

interface FigmaPaint {
  type: string
  color?: FigmaColor
  visible?: boolean
}

interface FigmaEffect {
  type: string // 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR'
  visible?: boolean
  color?: FigmaColor
  offset?: { x: number; y: number }
  radius?: number
  spread?: number
}

interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  // Paint properties
  fills?: FigmaPaint[]
  strokes?: FigmaPaint[]
  // Effect properties
  effects?: FigmaEffect[]
  // Text properties
  style?: {
    fontFamily?: string
    fontSize?: number
    fontWeight?: number
    lineHeightPx?: number
    lineHeightPercent?: number
    lineHeightUnit?: string
    letterSpacing?: number
  }
  // Layout properties (auto-layout frames)
  layoutMode?: string // 'HORIZONTAL' | 'VERTICAL' | 'NONE'
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  itemSpacing?: number
  counterAxisSpacing?: number
  // Corner radius
  cornerRadius?: number
  rectangleCornerRadii?: [number, number, number, number]
}

import { oklabDistance } from './color-utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Figma RGBA (0-1) to hex string */
function rgbaToHex(color: FigmaColor): string {
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
}

/** Round to nearest integer for dedup */
function roundSpacing(value: number): number {
  return Math.round(value)
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

interface Accumulators {
  colors: Map<string, { hex: string; count: number; nodeNames: Set<string>; usage: 'fill' | 'stroke' }>
  fonts: Map<string, { family: string; size: number; weight: number; count: number; nodeNames: Set<string>; lineHeightPx?: number; letterSpacing?: number }>
  spacing: Map<string, { type: ExtractedSpacing['type']; value: number; count: number }>
  shadows: Map<string, ExtractedShadow>
  frameNames: Set<string>
  rootBackgrounds: string[]
}

function createAccumulators(): Accumulators {
  return {
    colors: new Map(),
    fonts: new Map(),
    spacing: new Map(),
    shadows: new Map(),
    frameNames: new Set(),
    rootBackgrounds: [],
  }
}

function extractPaints(
  paints: FigmaPaint[] | undefined,
  usage: 'fill' | 'stroke',
  nodeName: string,
  acc: Accumulators
) {
  if (!paints) return
  for (const paint of paints) {
    if (paint.visible === false) continue
    if (paint.type !== 'SOLID' || !paint.color) continue

    const hex = rgbaToHex(paint.color)
    // Skip near-transparent colors
    if (paint.color.a < 0.1) continue

    const key = `${hex}-${usage}`
    const existing = acc.colors.get(key)
    if (existing) {
      existing.count++
      existing.nodeNames.add(nodeName)
    } else {
      acc.colors.set(key, { hex, count: 1, nodeNames: new Set([nodeName]), usage })
    }
  }
}

function extractTextStyle(node: FigmaNode, acc: Accumulators) {
  if (node.type !== 'TEXT' || !node.style) return

  const { fontFamily, fontSize, fontWeight, lineHeightPx, letterSpacing } = node.style
  if (!fontFamily || !fontSize) return

  const weight = fontWeight ?? 400
  const key = `${fontFamily}-${fontSize}-${weight}`
  const existing = acc.fonts.get(key)
  if (existing) {
    existing.count++
    existing.nodeNames.add(node.name)
  } else {
    acc.fonts.set(key, {
      family: fontFamily,
      size: fontSize,
      weight,
      count: 1,
      nodeNames: new Set([node.name]),
      ...(lineHeightPx != null && lineHeightPx > 0 ? { lineHeightPx } : {}),
      ...(letterSpacing != null && letterSpacing !== 0 ? { letterSpacing } : {}),
    })
  }
}

function extractSpacing(node: FigmaNode, acc: Accumulators) {
  // Only extract from auto-layout frames
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    // Padding — collect the most common padding value from all sides
    const paddings = [
      node.paddingLeft,
      node.paddingRight,
      node.paddingTop,
      node.paddingBottom,
    ].filter((v): v is number => v != null && v > 0)

    for (const p of paddings) {
      const rounded = roundSpacing(p)
      const key = `padding-${rounded}`
      const existing = acc.spacing.get(key)
      if (existing) {
        existing.count++
      } else {
        acc.spacing.set(key, { type: 'padding', value: rounded, count: 1 })
      }
    }

    // Gap (itemSpacing)
    if (node.itemSpacing != null && node.itemSpacing > 0) {
      const rounded = roundSpacing(node.itemSpacing)
      const key = `gap-${rounded}`
      const existing = acc.spacing.get(key)
      if (existing) {
        existing.count++
      } else {
        acc.spacing.set(key, { type: 'gap', value: rounded, count: 1 })
      }
    }

    // Counter-axis spacing
    if (node.counterAxisSpacing != null && node.counterAxisSpacing > 0) {
      const rounded = roundSpacing(node.counterAxisSpacing)
      const key = `gap-${rounded}`
      const existing = acc.spacing.get(key)
      if (existing) {
        existing.count++
      } else {
        acc.spacing.set(key, { type: 'gap', value: rounded, count: 1 })
      }
    }
  }

  // Corner radius
  if (node.cornerRadius != null && node.cornerRadius > 0) {
    const rounded = roundSpacing(node.cornerRadius)
    const key = `corner-radius-${rounded}`
    const existing = acc.spacing.get(key)
    if (existing) {
      existing.count++
    } else {
      acc.spacing.set(key, { type: 'corner-radius', value: rounded, count: 1 })
    }
  } else if (node.rectangleCornerRadii) {
    // Individual corner radii — take the most common non-zero value
    for (const r of node.rectangleCornerRadii) {
      if (r > 0) {
        const rounded = roundSpacing(r)
        const key = `corner-radius-${rounded}`
        const existing = acc.spacing.get(key)
        if (existing) {
          existing.count++
        } else {
          acc.spacing.set(key, { type: 'corner-radius', value: rounded, count: 1 })
        }
      }
    }
  }
}

function extractShadows(node: FigmaNode, acc: Accumulators) {
  if (!node.effects) return
  for (const effect of node.effects) {
    if (effect.visible === false) continue
    const shadowType = effect.type === 'DROP_SHADOW' ? 'drop'
      : effect.type === 'INNER_SHADOW' ? 'inner'
      : null
    if (!shadowType) continue

    const offsetX = effect.offset?.x ?? 0
    const offsetY = effect.offset?.y ?? 0
    const blurRadius = effect.radius ?? 0
    const spreadRadius = effect.spread ?? 0
    const color = effect.color ? rgbaToHex(effect.color) : '#000000'

    const key = `${shadowType}-${offsetX}-${offsetY}-${blurRadius}-${spreadRadius}-${color}`
    const existing = acc.shadows.get(key)
    if (existing) {
      existing.count++
    } else {
      acc.shadows.set(key, { type: shadowType, offsetX, offsetY, blurRadius, spreadRadius, color, count: 1 })
    }
  }
}

function walkNode(node: FigmaNode, acc: Accumulators) {
  // Track top-level frame names
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    acc.frameNames.add(node.name)
  }

  extractPaints(node.fills, 'fill', node.name, acc)
  extractPaints(node.strokes, 'stroke', node.name, acc)
  extractTextStyle(node, acc)
  extractSpacing(node, acc)
  extractShadows(node, acc)

  if (node.children) {
    for (const child of node.children) {
      walkNode(child, acc)
    }
  }
}

// ---------------------------------------------------------------------------
// Color clustering
// ---------------------------------------------------------------------------

/**
 * Cluster near-duplicate colors in Oklab perceptual space.
 * Greedy: sorted by count desc, merge if within threshold AND same usage.
 * Merged entries sum counts and union nodeNames.
 */
export function clusterColors(
  colors: ExtractedColor[],
  threshold = 0.03,
): ExtractedColor[] {
  const sorted = [...colors].sort((a, b) => b.count - a.count)
  const clusters: ExtractedColor[] = []

  for (const color of sorted) {
    let merged = false
    for (const cluster of clusters) {
      if (cluster.usage !== color.usage) continue
      if (oklabDistance(cluster.hex, color.hex) < threshold) {
        cluster.count += color.count
        for (const name of color.nodeNames) {
          if (!cluster.nodeNames.includes(name)) {
            cluster.nodeNames.push(name)
          }
        }
        merged = true
        break
      }
    }
    if (!merged) {
      clusters.push({ ...color, nodeNames: [...color.nodeNames] })
    }
  }

  return clusters
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract design tokens from Figma node JSON.
 * Accepts one or more node documents (from the Figma API nodes endpoint).
 * Returns deduplicated, frequency-sorted tokens.
 */
export function extractTokens(nodes: Array<{ data: object }>): ExtractedTokens {
  const acc = createAccumulators()

  for (const node of nodes) {
    const figmaNode = node.data as FigmaNode
    // Capture root frame backgrounds as a strong signal for the Background color
    if (figmaNode.fills) {
      for (const paint of figmaNode.fills) {
        if (paint.visible === false) continue
        if (paint.type === 'SOLID' && paint.color && paint.color.a >= 0.5) {
          acc.rootBackgrounds.push(rgbaToHex(paint.color))
        }
      }
    }
    walkNode(figmaNode, acc)
  }

  // Convert maps to sorted arrays
  const colors: ExtractedColor[] = Array.from(acc.colors.values())
    .map(c => ({ hex: c.hex, count: c.count, nodeNames: Array.from(c.nodeNames), usage: c.usage }))
    .sort((a, b) => b.count - a.count)

  const fonts: ExtractedFont[] = Array.from(acc.fonts.values())
    .map(f => ({
      family: f.family, size: f.size, weight: f.weight, count: f.count,
      nodeNames: Array.from(f.nodeNames),
      ...(f.lineHeightPx != null ? { lineHeightPx: f.lineHeightPx } : {}),
      ...(f.letterSpacing != null ? { letterSpacing: f.letterSpacing } : {}),
    }))
    .sort((a, b) => b.count - a.count)

  const spacing: ExtractedSpacing[] = Array.from(acc.spacing.values())
    .sort((a, b) => b.count - a.count)

  const shadows: ExtractedShadow[] = Array.from(acc.shadows.values())
    .sort((a, b) => b.count - a.count)

  const frameNames = Array.from(acc.frameNames)
  // Deduplicate root backgrounds preserving order
  const rootBackgrounds = [...new Set(acc.rootBackgrounds)]

  return { colors, fonts, spacing, shadows, frameNames, rootBackgrounds }
}
