/**
 * Sub-Prompt — Parser
 *
 * Stack-based parser that extracts sub-prompt expressions from a prompt string.
 * Supports multiple notation styles and optional nesting.
 */

import type { SubPromptExpression, NotationStyle } from './types'

/** Delimiter definitions per notation style */
const DELIMITERS: Record<NotationStyle, { open: string; close: string }> = {
  'bracket': { open: '[', close: ']' },
  'double-curly': { open: '{{', close: '}}' },
  'at-resolve': { open: '@resolve(', close: ')' },
  'xml-sub': { open: '<sub>', close: '</sub>' },
}

/**
 * Parse a prompt string, extracting sub-prompt expressions.
 * Uses stack-based scanning for correct bracket matching.
 */
export function parseSubPrompts(
  prompt: string,
  notation: NotationStyle = 'bracket',
  allowNesting = false,
): SubPromptExpression[] {
  const { open, close } = DELIMITERS[notation]
  const expressions: SubPromptExpression[] = []
  let idCounter = 0

  if (!allowNesting) {
    // Flat parse: find top-level expressions only
    let i = 0
    while (i < prompt.length) {
      const openIdx = prompt.indexOf(open, i)
      if (openIdx === -1) break

      // Find matching close, handling depth for bracket notation
      let depth = 1
      let j = openIdx + open.length
      while (j < prompt.length && depth > 0) {
        if (prompt.startsWith(close, j)) {
          depth--
          if (depth === 0) break
          j += close.length
        } else if (prompt.startsWith(open, j)) {
          depth++
          j += open.length
        } else {
          j++
        }
      }

      if (depth === 0) {
        const raw = prompt.slice(openIdx, j + close.length)
        const inner = prompt.slice(openIdx + open.length, j)
        const { modelRoute, cleanQuery } = extractModelRoute(inner)

        expressions.push({
          id: `sp-${idCounter++}`,
          raw,
          query: cleanQuery,
          modelRoute,
          startIndex: openIdx,
          endIndex: j + close.length,
          notation,
        })
        i = j + close.length
      } else {
        // Unmatched open bracket — skip it
        i = openIdx + open.length
      }
    }
  } else {
    // Nested parse: recursively parse inner content
    const parseNested = (text: string, offset: number): SubPromptExpression[] => {
      const result: SubPromptExpression[] = []
      let i = 0
      while (i < text.length) {
        const openIdx = text.indexOf(open, i)
        if (openIdx === -1) break

        let depth = 1
        let j = openIdx + open.length
        while (j < text.length && depth > 0) {
          if (text.startsWith(close, j)) {
            depth--
            if (depth === 0) break
            j += close.length
          } else if (text.startsWith(open, j)) {
            depth++
            j += open.length
          } else {
            j++
          }
        }

        if (depth === 0) {
          const raw = text.slice(openIdx, j + close.length)
          const inner = text.slice(openIdx + open.length, j)
          const { modelRoute, cleanQuery } = extractModelRoute(inner)
          const children = parseNested(inner, offset + openIdx + open.length)

          result.push({
            id: `sp-${idCounter++}`,
            raw,
            query: cleanQuery,
            modelRoute,
            startIndex: offset + openIdx,
            endIndex: offset + j + close.length,
            notation,
            children: children.length > 0 ? children : undefined,
          })
          i = j + close.length
        } else {
          i = openIdx + open.length
        }
      }
      return result
    }
    expressions.push(...parseNested(prompt, 0))
  }

  return expressions
}

/**
 * Extract model route from query text.
 * Detects "@slug: query" pattern at the start of the inner text.
 */
export function extractModelRoute(query: string): { modelRoute?: string; cleanQuery: string } {
  const match = query.match(/^@([\w-]+):\s*([\s\S]+)$/)
  if (match) {
    return { modelRoute: match[1], cleanQuery: match[2].trim() }
  }
  return { cleanQuery: query.trim() }
}

/**
 * Replace resolved expressions back into the original prompt.
 * Processes from end to start to preserve indices.
 */
export function replaceExpressions(
  original: string,
  expressions: SubPromptExpression[],
  resolutions: Map<string, string>,
): string {
  // Sort by startIndex descending so replacements don't shift indices
  const sorted = [...expressions].sort((a, b) => b.startIndex - a.startIndex)
  let result = original
  for (const expr of sorted) {
    const resolved = resolutions.get(expr.id)
    if (resolved !== undefined) {
      result = result.slice(0, expr.startIndex) + resolved + result.slice(expr.endIndex)
    }
  }
  return result
}

/**
 * Compute per-character nesting depth for syntax highlighting.
 * Returns an array of depth values (0 = outside, 1+ = nesting level).
 */
export function getDepthMap(prompt: string, notation: NotationStyle = 'bracket'): number[] {
  const { open, close } = DELIMITERS[notation]
  const depths = new Array<number>(prompt.length).fill(0)
  let depth = 0

  let i = 0
  while (i < prompt.length) {
    if (prompt.startsWith(open, i)) {
      depth++
      for (let k = 0; k < open.length; k++) {
        depths[i + k] = depth
      }
      i += open.length
    } else if (prompt.startsWith(close, i) && depth > 0) {
      for (let k = 0; k < close.length; k++) {
        depths[i + k] = depth
      }
      depth--
      i += close.length
    } else {
      depths[i] = depth
      i++
    }
  }

  return depths
}

/** Get delimiter strings for a notation style */
export function getDelimiters(notation: NotationStyle) {
  return DELIMITERS[notation]
}
