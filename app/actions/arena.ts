'use server'

import { revalidatePath } from 'next/cache'
import { upsertTheme } from '@/lib/studio/arena/queries'
import type { TokenMap } from '@/lib/studio/arena/types'

export async function saveTheme(input: {
  project_id?: string
  skill_id?: string
  is_template?: boolean
  dimension: string
  platform: string
  name: string
  tokens: TokenMap
  source: string
}) {
  await upsertTheme(input)
}

/**
 * Create independent template theme rows from Figma-extracted tokens.
 * No skill creation — themes are standalone catalog entries.
 */
export async function saveThemeFromFigma(input: {
  name: string
  themeTokens: Record<string, Record<string, string>>
  source?: string
}): Promise<{ name: string }> {
  const dimensions = Object.keys(input.themeTokens)

  for (const dim of dimensions) {
    const tokens = input.themeTokens[dim]
    if (!tokens || Object.keys(tokens).length === 0) continue

    await upsertTheme({
      project_id: undefined,
      skill_id: undefined,
      is_template: true,
      dimension: dim,
      platform: 'tailwind',
      name: input.name,
      tokens,
      source: input.source ?? 'figma',
    })
  }

  revalidatePath('/apps/arena')
  return { name: input.name }
}
