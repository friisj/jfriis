'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../models';

const DerivedTopicsSchema = z.object({
  topics: z.array(z.string()).min(3).max(8).describe(
    '3-8 tradeable themes and investment-grade visual topics. Think like an equity analyst meets photo editor: specific sectors, technologies, and macro forces — not generic moods.'
  ),
});

export async function deriveTopicsFromStory(story: string): Promise<string[]> {
  const result = await generateObject({
    model: getModel('gemini-flash'),
    schema: DerivedTopicsSchema,
    system: `You are a thematic research analyst who sources visual imagery for investment narratives. Extract tradeable themes and specific sector/technology topics from a creative brief.

Your topics should be:
- SPECIFIC and tradeable: "data centers", "fibre optics", "glp-1", "ev supply chain", "supersonic travel", "mrna therapeutics", "hospitality tech", "grid-scale storage"
- SECTOR-AWARE: name the actual industries, technologies, supply chains, and macro forces at play
- VISUALLY SEARCHABLE: each topic should return relevant results on a stock photo platform
- MULTI-ANGLE: cover the theme from different vantage points (the technology, the human impact, the infrastructure, the end user)

NEVER include:
- Company names (no "Nvidia", "Tesla", "Novo Nordisk", "SpaceX" — use the sector/technology instead)
- Generic abstract terms like "innovation", "growth", "disruption", "transformation"
- Pure moods/emotions as standalone topics ("tension", "optimism")
- Overly broad categories ("technology", "finance", "healthcare")

Examples:
- Story about AI infrastructure → "data centers", "gpu clusters", "cooling systems", "fibre optic cables", "server racks", "power grid"
- Story about obesity drugs → "glp-1 injection", "pharmaceutical manufacturing", "clinical trials", "metabolic health", "bariatric medicine"
- Story about electrification → "ev charging stations", "lithium mining", "battery recycling", "grid modernization", "copper wiring"`,
    prompt: `Extract 3-8 tradeable, sector-specific visual topics from this story:\n\n"${story}"`,
  });
  return result.object.topics;
}
