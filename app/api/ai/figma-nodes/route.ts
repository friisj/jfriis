/**
 * Figma Node Fetch API Route
 *
 * POST /api/ai/figma-nodes
 * Accepts Figma frame URLs, extracts file keys and node IDs,
 * fetches node data from the Figma REST API, and returns raw node JSON.
 *
 * Requires FIGMA_PAT environment variable (Personal Access Token).
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/ai/auth'

interface FigmaParsedUrl {
  url: string
  fileKey: string
  nodeId: string
}

/** Parse a Figma URL into fileKey and nodeId */
function parseFigmaUrl(url: string): FigmaParsedUrl | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('figma.com')) return null

    // URL format: https://www.figma.com/design/FILE_KEY/Name?node-id=123-456
    // or: https://www.figma.com/file/FILE_KEY/Name?node-id=123-456
    const pathMatch = parsed.pathname.match(/\/(design|file)\/([a-zA-Z0-9]+)/)
    if (!pathMatch) return null
    const fileKey = pathMatch[2]

    const nodeId = parsed.searchParams.get('node-id')
    if (!nodeId) return null

    return { url, fileKey, nodeId }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireAuth()
    if (!user || authError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const figmaPat = process.env.FIGMA_PAT
    if (!figmaPat) {
      return NextResponse.json(
        { error: 'FIGMA_PAT environment variable not configured' },
        { status: 500 }
      )
    }

    const { urls } = (await request.json()) as { urls: string[] }
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'urls array is required' },
        { status: 400 }
      )
    }

    if (urls.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 URLs per request' },
        { status: 400 }
      )
    }

    // Parse all URLs
    const parsed: FigmaParsedUrl[] = []
    const invalid: string[] = []
    for (const url of urls) {
      const result = parseFigmaUrl(url)
      if (result) {
        parsed.push(result)
      } else {
        invalid.push(url)
      }
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: `No valid Figma URLs found. Invalid: ${invalid.join(', ')}` },
        { status: 400 }
      )
    }

    // Group by fileKey for efficient API calls
    const byFile = new Map<string, FigmaParsedUrl[]>()
    for (const p of parsed) {
      const existing = byFile.get(p.fileKey) ?? []
      existing.push(p)
      byFile.set(p.fileKey, existing)
    }

    // Fetch nodes from Figma API (one call per file, comma-separated node IDs)
    const nodes: Array<{ url: string; name: string; data: object }> = []
    const errors: string[] = []

    const fetchPromises = Array.from(byFile.entries()).map(async ([fileKey, fileUrls]) => {
      const nodeIds = fileUrls.map(p => p.nodeId).join(',')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000)

      try {
        const res = await fetch(
          `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeIds)}`,
          {
            signal: controller.signal,
            headers: {
              'X-Figma-Token': figmaPat,
            },
          }
        )
        clearTimeout(timeout)

        if (!res.ok) {
          const body = await res.text()
          errors.push(`Figma API ${res.status} for file ${fileKey}: ${body.slice(0, 200)}`)
          return
        }

        const data = await res.json() as {
          nodes: Record<string, { document: { name: string } & Record<string, unknown> } | null>
        }

        for (const parsedUrl of fileUrls) {
          const nodeData = data.nodes[parsedUrl.nodeId]
          if (nodeData?.document) {
            nodes.push({
              url: parsedUrl.url,
              name: nodeData.document.name,
              data: nodeData.document,
            })
          } else {
            errors.push(`Node ${parsedUrl.nodeId} not found in file ${fileKey}`)
          }
        }
      } catch (err) {
        clearTimeout(timeout)
        if (err instanceof Error && err.name === 'AbortError') {
          errors.push(`Figma API timed out for file ${fileKey}`)
        } else {
          errors.push(`Figma API error for file ${fileKey}: ${err instanceof Error ? err.message : 'Unknown'}`)
        }
      }
    })

    await Promise.all(fetchPromises)

    return NextResponse.json({
      nodes,
      ...(invalid.length > 0 && { invalidUrls: invalid }),
      ...(errors.length > 0 && { errors }),
    })
  } catch (error) {
    console.error('[api:figma-nodes] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
