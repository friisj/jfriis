import { z } from 'zod'

/**
 * Schema for markdown content fields that normalizes input.
 *
 * Accepts both formats:
 * - Raw string: "# Hello" → { markdown: "# Hello" }
 * - Object: { markdown: "# Hello" } → { markdown: "# Hello" }
 *
 * This ensures consistent storage format regardless of whether
 * content is written via UI (object format) or MCP (typically raw string).
 *
 * Supports specimen embedding: <Specimen id="..." /> tags in markdown
 * are preserved and rendered by MdxRenderer.
 */
export const markdownContentSchema = z
  .union([
    z.string(),
    z.object({ markdown: z.string() }),
    z.null(),
  ])
  .optional()
  .nullable()
  .transform((val) => {
    if (val === null || val === undefined) return null
    if (typeof val === 'string') {
      return val.trim() ? { markdown: val } : null
    }
    if (typeof val === 'object' && 'markdown' in val) {
      return val.markdown?.trim() ? val : null
    }
    return null
  })

export type MarkdownContent = z.infer<typeof markdownContentSchema>
