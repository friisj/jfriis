/**
 * URL Content Fetch API Route
 *
 * POST /api/ai/fetch-url
 * Fetches a URL, extracts <style> blocks and <body> HTML, truncates for context limits.
 * Used by the infer-style-spike to prepare URL inputs before sending to the AI action.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/ai/auth'

const MAX_CONTENT_LENGTH = 40_000 // ~40KB for context limits

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireAuth()
    if (!user || authError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { url } = (await request.json()) as { url: string }
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      )
    }

    // Fetch with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    let response: Response
    try {
      response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JFriisBot/1.0)',
          Accept: 'text/html',
        },
      })
    } catch (fetchError) {
      clearTimeout(timeout)
      const message =
        fetchError instanceof Error && fetchError.name === 'AbortError'
          ? 'Request timed out (10s)'
          : 'Failed to fetch URL'
      return NextResponse.json({ error: message }, { status: 502 })
    }
    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(
        { error: `URL returned ${response.status}` },
        { status: 502 }
      )
    }

    const html = await response.text()

    // Extract <style> blocks
    const styleBlocks: string[] = []
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
    let styleMatch
    while ((styleMatch = styleRegex.exec(html)) !== null) {
      styleBlocks.push(styleMatch[1].trim())
    }

    // Extract <body> content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyContent = bodyMatch?.[1]?.trim() ?? html

    // Combine styles + body, truncate
    let content = ''
    if (styleBlocks.length > 0) {
      content += `/* Extracted CSS */\n${styleBlocks.join('\n\n')}\n\n`
    }
    content += `<!-- Body HTML -->\n${bodyContent}`

    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.slice(0, MAX_CONTENT_LENGTH) + '\n\n<!-- truncated -->'
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('[api:fetch-url] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
