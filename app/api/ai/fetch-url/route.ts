/**
 * URL Content Fetch API Route
 *
 * POST /api/ai/fetch-url
 * Fetches a URL, chases linked stylesheets, extracts design-relevant CSS
 * and a trimmed body HTML. Used by infer-style-spike to prepare URL inputs.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/ai/auth'

const MAX_CONTENT_LENGTH = 50_000 // ~50KB for context limits
const FETCH_TIMEOUT = 10_000
const CSS_FETCH_TIMEOUT = 5_000

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,text/css,*/*',
}

/**
 * Fetch a resource with timeout
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: FETCH_HEADERS,
    })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Resolve a potentially relative URL against a base
 */
function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

/**
 * Extract linked stylesheet URLs from HTML
 */
function extractStylesheetLinks(html: string, baseUrl: string): string[] {
  const links: string[] = []
  // Match <link> tags with rel="stylesheet"
  const linkRegex =
    /<link\s[^>]*?(?:rel\s*=\s*["']stylesheet["'][^>]*?href\s*=\s*["']([^"']+)["']|href\s*=\s*["']([^"']+)["'][^>]*?rel\s*=\s*["']stylesheet["'])[^>]*>/gi
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1] || match[2]
    if (href) {
      const resolved = resolveUrl(href, baseUrl)
      if (resolved) links.push(resolved)
    }
  }
  return [...new Set(links)]
}

/**
 * Extract design-relevant data from CSS:
 * - CSS custom properties (--var definitions)
 * - Unique hex/rgb/hsl colors
 * - Font family declarations
 * - Font size declarations
 * - Spacing-related values (padding, gap, border-radius)
 */
function extractDesignTokensFromCSS(css: string): string {
  const sections: string[] = []

  // CSS custom properties (design tokens)
  const varDefs = [
    ...css.matchAll(
      /--[a-zA-Z][\w-]*\s*:\s*(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\)|[0-9.]+(?:px|rem|em|%)|[\w-]+(?:\s*,\s*[\w-]+)*)/g
    ),
  ]
  // Filter to design-relevant vars (colors, fonts, spacing — skip Tailwind internals)
  const designVars = varDefs
    .map((m) => m[0].trim())
    .filter(
      (v) =>
        !v.startsWith('--tw-') &&
        !v.startsWith('--tw_')
    )
  if (designVars.length > 0) {
    sections.push(
      `/* Custom Properties (${designVars.length}) */\n${designVars.slice(0, 50).join(';\n')};`
    )
  }

  // Font families
  const fontFamilies = [
    ...new Set(
      [...css.matchAll(/font-family\s*:\s*([^;}{]+)/g)].map((m) =>
        m[1].trim()
      )
    ),
  ]
  if (fontFamilies.length > 0) {
    sections.push(
      `/* Font Families (${fontFamilies.length}) */\n${fontFamilies.map((f) => `font-family: ${f};`).join('\n')}`
    )
  }

  // Unique hex colors (deduplicated, lowercase)
  const hexColors = [
    ...new Set(
      [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) =>
        m[0].toLowerCase()
      )
    ),
  ].filter((h) => !['#fff', '#000', '#0000', '#ffffff', '#000000'].includes(h))
  if (hexColors.length > 0) {
    sections.push(
      `/* Hex Colors (${hexColors.length}) */\n${hexColors.slice(0, 40).join(', ')}`
    )
  }

  // Font sizes
  const fontSizes = [
    ...new Set(
      [...css.matchAll(/font-size\s*:\s*([^;}{]+)/g)].map((m) => m[1].trim())
    ),
  ]
  if (fontSizes.length > 0) {
    sections.push(
      `/* Font Sizes (${fontSizes.length}) */\n${fontSizes.slice(0, 20).join(', ')}`
    )
  }

  // Border radius values
  const radii = [
    ...new Set(
      [...css.matchAll(/border-radius\s*:\s*([^;}{]+)/g)].map((m) =>
        m[1].trim()
      )
    ),
  ]
  if (radii.length > 0) {
    sections.push(`/* Border Radius */\n${radii.slice(0, 15).join(', ')}`)
  }

  return sections.join('\n\n')
}

/**
 * Strip script tags, SVG content, and excessive whitespace from HTML body
 */
function cleanBodyHtml(body: string): string {
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '<svg/>')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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

    const { url } = (await request.json()) as { url: string }
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // 1. Fetch the HTML page
    let response: Response
    try {
      response = await fetchWithTimeout(parsedUrl.toString(), FETCH_TIMEOUT)
    } catch (fetchError) {
      const message =
        fetchError instanceof Error && fetchError.name === 'AbortError'
          ? 'Request timed out (10s)'
          : 'Failed to fetch URL'
      return NextResponse.json({ error: message }, { status: 502 })
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `URL returned ${response.status}` },
        { status: 502 }
      )
    }

    const html = await response.text()

    // 2. Extract inline <style> blocks
    const styleBlocks: string[] = []
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
    let styleMatch
    while ((styleMatch = styleRegex.exec(html)) !== null) {
      styleBlocks.push(styleMatch[1].trim())
    }

    // 3. Chase linked stylesheets
    const stylesheetUrls = extractStylesheetLinks(html, parsedUrl.toString())
    const externalCSS: string[] = []

    if (stylesheetUrls.length > 0) {
      const cssResults = await Promise.allSettled(
        stylesheetUrls.slice(0, 5).map(async (cssUrl) => {
          const res = await fetchWithTimeout(cssUrl, CSS_FETCH_TIMEOUT)
          if (!res.ok) return ''
          return res.text()
        })
      )
      for (const result of cssResults) {
        if (result.status === 'fulfilled' && result.value) {
          externalCSS.push(result.value)
        }
      }
    }

    // 4. Combine all CSS and extract design tokens
    const allCSS = [...styleBlocks, ...externalCSS].join('\n')
    const designTokenSummary = extractDesignTokensFromCSS(allCSS)

    // 5. Extract and clean body HTML
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyContent = cleanBodyHtml(bodyMatch?.[1] ?? html)

    // 6. Assemble content: design tokens first (most valuable), then HTML structure
    let content = ''

    if (designTokenSummary) {
      content += `/* === Design Tokens Extracted from CSS (${stylesheetUrls.length} external + ${styleBlocks.length} inline stylesheets) === */\n\n`
      content += designTokenSummary
      content += '\n\n'
    }

    // Determine how much budget remains for HTML
    const htmlBudget = MAX_CONTENT_LENGTH - content.length
    if (htmlBudget > 5000) {
      content += `<!-- === Body HTML (trimmed) === -->\n`
      content +=
        bodyContent.length > htmlBudget
          ? bodyContent.slice(0, htmlBudget) + '\n<!-- truncated -->'
          : bodyContent
    }

    return NextResponse.json({
      content,
      meta: {
        externalStylesheets: stylesheetUrls.length,
        inlineStyleBlocks: styleBlocks.length,
        totalCSSBytes: allCSS.length,
        bodyBytes: bodyContent.length,
        truncated: content.length >= MAX_CONTENT_LENGTH,
      },
    })
  } catch (error) {
    console.error('[api:fetch-url] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
