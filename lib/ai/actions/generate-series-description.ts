'use server';

import { generateText } from 'ai';
import { getModel } from '../models';

interface GenerateSeriesDescriptionInput {
  prompt: string;
  title?: string;
  existingDescription?: string;
  existingTags?: string[];
}

interface GenerateSeriesDescriptionOutput {
  description: string;
  tags: string[];
}

/**
 * Generate a markdown description and tags for a Cog series based on a prompt.
 */
export async function generateSeriesDescription(
  input: GenerateSeriesDescriptionInput
): Promise<GenerateSeriesDescriptionOutput> {
  const { prompt, title, existingDescription, existingTags } = input;

  const model = getModel('gemini-flash');

  const systemPrompt = `You are helping describe an image generation series (called "Cog").
A series is a collection of generated images around a theme, style, or concept.

Your task is to generate:
1. A markdown description (2-4 paragraphs) that explains:
   - What this series is about
   - The visual style or aesthetic
   - Themes or concepts being explored
   - Any technical approach or generation techniques

2. A list of 3-7 relevant tags (single words or short phrases, lowercase, no spaces - use hyphens)

Format your response EXACTLY as:
---DESCRIPTION---
[Your markdown description here]
---TAGS---
[comma-separated tags]

Be creative but concise. The description should help someone understand what to expect from images in this series.`;

  let userPrompt = `Generate a description and tags for this image series.\n\nUser's prompt: ${prompt}`;

  if (title) {
    userPrompt += `\n\nSeries title: ${title}`;
  }

  if (existingDescription) {
    userPrompt += `\n\nExisting description to improve/expand:\n${existingDescription}`;
  }

  if (existingTags && existingTags.length > 0) {
    userPrompt += `\n\nExisting tags to consider: ${existingTags.join(', ')}`;
  }

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
  });

  // Parse the response
  const text = result.text;

  const descMatch = text.match(/---DESCRIPTION---\s*([\s\S]*?)\s*---TAGS---/);
  const tagsMatch = text.match(/---TAGS---\s*([\s\S]*?)$/);

  const description = descMatch?.[1]?.trim() || text;
  const tagsStr = tagsMatch?.[1]?.trim() || '';

  const tags = tagsStr
    .split(',')
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean);

  return { description, tags };
}
