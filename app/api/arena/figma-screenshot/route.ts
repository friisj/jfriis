/**
 * Figma Screenshot API Route
 *
 * POST /api/arena/figma-screenshot
 * Accepts a Figma URL, fetches the node name and a rendered screenshot
 * via the Figma REST API. Returns the CDN image URL and node name.
 *
 * Keeps the Figma PAT server-side (never exposed to client).
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/ai/auth'

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('figma.com')) return null

    const pathMatch = parsed.pathname.match(/\/(design|file)\/([a-zA-Z0-9]+)/)
    if (!pathMatch) return null
    const fileKey = pathMatch[2]

    const nodeId = parsed.searchParams.get('node-id')
    if (!nodeId) return null

    return { fileKey, nodeId: nodeId.replace(/-/g, ':') }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireAuth()
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const figmaPat = process.env.FIGMA_PAT
    if (!figmaPat) {
      return NextResponse.json({ error: 'FIGMA_PAT not configured' }, { status: 500 })
    }

    const { url } = (await request.json()) as { url: string }
    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const parsed = parseFigmaUrl(url)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid Figma URL' }, { status: 400 })
    }

    const headers = { 'X-Figma-Token': figmaPat }

    // Fetch node name and screenshot in parallel
    const [nodesRes, imagesRes] = await Promise.all([
      fetch(
        `https://api.figma.com/v1/files/${parsed.fileKey}/nodes?ids=${encodeURIComponent(parsed.nodeId)}`,
        { headers, signal: AbortSignal.timeout(15_000) }
      ),
      fetch(
        `https://api.figma.com/v1/images/${parsed.fileKey}?ids=${encodeURIComponent(parsed.nodeId)}&format=png&scale=2`,
        { headers, signal: AbortSignal.timeout(15_000) }
      ),
    ])

    if (!nodesRes.ok) {
      const body = await nodesRes.text()
      return NextResponse.json({ error: `Figma nodes API ${nodesRes.status}: ${body.slice(0, 200)}` }, { status: 502 })
    }

    if (!imagesRes.ok) {
      const body = await imagesRes.text()
      return NextResponse.json({ error: `Figma images API ${imagesRes.status}: ${body.slice(0, 200)}` }, { status: 502 })
    }

    const nodesData = await nodesRes.json() as {
      nodes: Record<string, { document: { name: string } } | null>
    }
    const imagesData = await imagesRes.json() as {
      images: Record<string, string | null>
    }

    const nodeEntry = nodesData.nodes[parsed.nodeId]
    const nodeName = nodeEntry?.document?.name ?? 'Unknown'
    const imageUrl = imagesData.images[parsed.nodeId] ?? null

    if (!imageUrl) {
      return NextResponse.json({ error: 'Figma returned no image for this node' }, { status: 502 })
    }

    return NextResponse.json({ imageUrl, nodeName })
  } catch (error) {
    console.error('[api:figma-screenshot] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
