'use server';

import { generateText } from 'ai';
import { getModel } from '../models';
import { searchAllSources } from '../stock-photo-search';
import type { StockPhotoResult } from '@/lib/types/cog';

export async function searchReferenceImages(input: {
  story: string;
  themes: string;
}): Promise<StockPhotoResult[]> {
  const { story, themes } = input;

  // Generate search queries from story + themes
  const result = await generateText({
    model: getModel('claude-haiku') as Parameters<typeof generateText>[0]['model'],
    prompt: `Generate 2-3 short visual search queries for stock photography based on this creative brief. Return ONLY the queries, one per line, no numbering or explanation.

Story: ${story}
${themes ? `Themes: ${themes}` : ''}

Focus on visual elements, compositions, moods, and settings — not abstract concepts.`,
    maxOutputTokens: 200,
    temperature: 0.7,
  });

  const queries = result.text
    .split('\n')
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (queries.length === 0) return [];

  return searchAllSources(queries);
}
