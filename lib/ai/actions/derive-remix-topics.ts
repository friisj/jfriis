'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../models';

const DerivedTopicsSchema = z.object({
  topics: z.array(z.string()).min(3).max(8).describe(
    '3-8 concise topic keywords extracted from the story. Focus on visual themes, moods, and conceptual angles — not literal objects. Think about what a photo researcher would search for.'
  ),
});

export async function deriveTopicsFromStory(story: string): Promise<string[]> {
  const result = await generateObject({
    model: getModel('gemini-flash'),
    schema: DerivedTopicsSchema,
    system: `You are a creative photo researcher. Extract visual search topics from a creative brief. Focus on:
- Atmospheric and emotional themes (tension, solitude, warmth)
- Visual metaphors and conceptual angles (not literal objects)
- Moods and tones that a photographer would understand
- Abstract qualities that translate to compelling imagery

Avoid literal/obvious terms. For "monetary policy", suggest "tension", "institutional power", "quiet authority" — NOT "money", "dollar", "bank".`,
    prompt: `Extract 3-8 visual search topics from this story:\n\n"${story}"`,
  });
  return result.object.topics;
}
