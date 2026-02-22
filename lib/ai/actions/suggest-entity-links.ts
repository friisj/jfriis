'use server'

/**
 * Suggest Entity Links Action
 *
 * Analyzes an entity's content against all other entities
 * and returns ranked suggestions for potential links.
 */

import { createClient } from '@/lib/supabase-server'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import type { LinkableEntityType, LinkType } from '@/lib/types/entity-relationships'
import { ENTITY_TYPE_TABLE_MAP } from '@/lib/types/entity-relationships'

export interface LinkSuggestion {
  targetType: LinkableEntityType
  targetId: string
  targetLabel: string
  linkType: LinkType
  confidence: number // 0-1
  rationale: string
}

interface SuggestEntityLinksInput {
  entityType: LinkableEntityType
  entityId: string
  /** Content fields to analyze */
  content: Record<string, string | null | undefined>
  /** Which target types to search across */
  targetTypes: Array<{
    type: LinkableEntityType
    linkType: LinkType
    displayField: string
  }>
}

export async function suggestEntityLinks(
  input: SuggestEntityLinksInput
): Promise<{ suggestions: LinkSuggestion[]; error?: string }> {
  try {
    const supabase = await createClient()

    // Load existing links to exclude already-linked entities
    const { data: existingLinks } = await supabase
      .from('entity_links')
      .select('target_type, target_id, source_type, source_id')
      .or(
        `and(source_type.eq.${input.entityType},source_id.eq.${input.entityId}),` +
        `and(target_type.eq.${input.entityType},target_id.eq.${input.entityId})`
      )

    const linkedIds = new Set(
      (existingLinks || []).flatMap(link => {
        if (link.source_type === input.entityType && link.source_id === input.entityId) {
          return [link.target_id]
        }
        return [link.source_id]
      })
    )

    // Load candidate entities for each target type
    const candidates: Array<{
      type: LinkableEntityType
      linkType: LinkType
      id: string
      label: string
      summary?: string
    }> = []

    await Promise.all(
      input.targetTypes.map(async ({ type, linkType, displayField }) => {
        const tableName = ENTITY_TYPE_TABLE_MAP[type]
        if (!tableName) return

        const summaryField = type === 'assumption' ? 'statement' : 'description'
        const selectFields = `id, ${displayField}` +
          (summaryField !== displayField ? `, ${summaryField}` : '')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from(tableName)
          .select(selectFields)
          .limit(50)

        if (error || !data) return

        for (const item of data as Record<string, unknown>[]) {
          const id = item.id as string
          if (linkedIds.has(id) || id === input.entityId) continue

          candidates.push({
            type,
            linkType,
            id,
            label: (item[displayField] as string) || id,
            summary: summaryField !== displayField
              ? (item[summaryField] as string)?.slice(0, 200)
              : undefined,
          })
        }
      })
    )

    if (candidates.length === 0) {
      return { suggestions: [] }
    }

    // Build entity description from content
    const entityDescription = Object.entries(input.content)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')

    // Build candidate list for the prompt
    const candidateList = candidates
      .map((c, i) => {
        const parts = [`${i + 1}. [${c.type}] "${c.label}" (id: ${c.id})`]
        if (c.summary) parts.push(`   ${c.summary}`)
        return parts.join('\n')
      })
      .join('\n')

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: `You are an entity relationship analyst. Given an entity's content and a list of candidate entities, identify which candidates should be linked and why. Return ONLY a JSON array of suggestions, no other text.

Each suggestion should be:
{
  "index": <1-based index from candidate list>,
  "confidence": <0.0-1.0>,
  "rationale": "<1-sentence reason>"
}

Rules:
- Only suggest links with confidence >= 0.5
- Maximum 10 suggestions
- Higher confidence = stronger semantic relationship
- Consider thematic overlap, shared concepts, causal relationships
- Don't suggest obvious non-relationships`,
      prompt: `## Entity being analyzed (${input.entityType})

${entityDescription}

## Candidate entities to consider

${candidateList}

Return a JSON array of suggested links:`,
    })

    // Parse AI response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { suggestions: [] }
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      index: number
      confidence: number
      rationale: string
    }>

    const suggestions: LinkSuggestion[] = parsed
      .filter(s => s.index >= 1 && s.index <= candidates.length && s.confidence >= 0.5)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
      .map(s => {
        const candidate = candidates[s.index - 1]
        return {
          targetType: candidate.type,
          targetId: candidate.id,
          targetLabel: candidate.label,
          linkType: candidate.linkType,
          confidence: s.confidence,
          rationale: s.rationale,
        }
      })

    return { suggestions }
  } catch (err) {
    console.error('Error suggesting entity links:', err)
    return {
      suggestions: [],
      error: err instanceof Error ? err.message : 'Failed to suggest links',
    }
  }
}
