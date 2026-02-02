import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Extract markdown content from a JSONB content field.
 * Handles both formats:
 * - { markdown: "..." } - standard format from the UI
 * - "..." - raw string (e.g., from MCP)
 */
export function extractMarkdown(content: unknown): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (typeof content === 'object' && content !== null && 'markdown' in content) {
    return (content as { markdown: string }).markdown || ''
  }
  return ''
}
