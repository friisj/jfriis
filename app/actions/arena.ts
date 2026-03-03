'use server'

import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { upsertTheme } from '@/lib/studio/arena/queries'
import type { SkillState, TokenMap } from '@/lib/studio/arena/types'
import { extractTokensFromDimension } from '@/lib/studio/arena/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function arenaClient(): Promise<SupabaseClient<any, 'public', any>> {
  return await createClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function saveTheme(input: {
  project_id?: string
  skill_id?: string
  dimension: string
  platform: string
  name: string
  tokens: TokenMap
  source: string
}) {
  await upsertTheme(input)
}

/**
 * Create a standalone theme from Figma-extracted tokens.
 * Creates template-tier skills (one per dimension) and associated theme rows.
 * No project assembly — themes are standalone and appear in the themes list.
 */
export async function saveThemeFromFigma(input: {
  name: string
  state: SkillState
}): Promise<{ name: string }> {
  const supabase = await arenaClient()
  const dimensions = Object.keys(input.state)

  for (const dim of dimensions) {
    const dimState = input.state[dim]

    // Strip token values from decisions — they go into the theme layer
    const strippedDecisions = dimState.decisions.map(d => {
      const { value: _value, ...rest } = d
      return rest
    })

    // Create template-tier skill for this dimension
    const { data: skill, error: skillErr } = await supabase
      .from('arena_skills')
      .insert({
        name: `${input.name} — ${dim}`,
        state: { decisions: strippedDecisions, rules: dimState.rules } as unknown as Record<string, unknown>,
        tier: 'template',
        dimension: dim,
        project_id: null,
        parent_skill_id: null,
        is_template: true,
        template_description: `Figma-imported ${dim} decisions for theme "${input.name}".`,
      })
      .select()
      .single()
    if (skillErr) throw skillErr

    // Create theme row with token values, linked to the template skill
    const tokens = extractTokensFromDimension(dimState)
    if (Object.keys(tokens).length > 0) {
      const { error: themeErr } = await supabase
        .from('arena_themes')
        .insert({
          skill_id: skill.id,
          project_id: null,
          dimension: dim,
          platform: 'tailwind',
          name: input.name,
          tokens,
          source: 'figma',
        })
      if (themeErr) throw themeErr
    }
  }

  revalidatePath('/apps/arena')
  return { name: input.name }
}
