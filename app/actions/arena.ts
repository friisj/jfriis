'use server'

import { upsertTheme } from '@/lib/studio/arena/queries'
import type { TokenMap } from '@/lib/studio/arena/types'

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
