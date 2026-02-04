'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../models';
import type { ShootParams } from '@/lib/types/cog';

const ShootParamsSchema = z.object({
  scene: z.string().describe('The environment, setting, or backdrop for the shots'),
  art_direction: z.string().describe('Overall visual style, artistic approach, and aesthetic'),
  styling: z.string().describe('Props, wardrobe, colors, textures, and decorative elements'),
  camera: z.string().describe('Camera type, lens, focal length, depth of field settings'),
  framing: z.string().describe('Composition, angle, perspective, and shot type'),
  lighting: z.string().describe('Light quality, direction, mood, and setup'),
});

interface GenerateShootParamsInput {
  seriesTitle: string;
  seriesDescription?: string;
  seriesTags?: string[];
  referenceCount?: number;
}

/**
 * Generate photo shoot parameters from series context.
 * These parameters define the creative direction for a batch of images.
 */
export async function generateShootParams(
  input: GenerateShootParamsInput
): Promise<ShootParams> {
  const { seriesTitle, seriesDescription, seriesTags, referenceCount = 0 } = input;

  const hasReferences = referenceCount > 0;

  const systemPrompt = `You are a creative director helping plan a photo shoot for image generation.

Your task is to define the creative parameters for generating images based on a series concept.

Each parameter should be specific and actionable:
- scene: Describe the environment (e.g., "minimalist white studio", "lush forest clearing at golden hour", "urban rooftop at dusk")
- art_direction: Define the visual style (e.g., "cinematic film photography with muted tones", "bold pop art with vibrant colors", "soft ethereal dreamscape")
- styling: Specify props and styling (e.g., "vintage furniture and dried flowers", "geometric shapes and metallic accents", "natural textures and earth tones")
- camera: Technical camera settings (e.g., "medium format, 80mm lens, shallow depth of field", "wide angle 24mm, everything in focus", "macro lens, extreme close-up")
- framing: Composition approach (e.g., "centered subject with negative space", "rule of thirds, dynamic diagonal", "overhead flat lay")
- lighting: Light setup (e.g., "soft diffused natural light from large window", "dramatic side lighting with deep shadows", "warm golden hour backlight with lens flare")

Be specific but concise. Each parameter should be 1-2 sentences max.
${hasReferences ? `\nNote: The user has ${referenceCount} reference image(s) that will guide the subject/style. Focus on complementary scene and technical setup.` : ''}`;

  const userPrompt = `Generate photo shoot parameters for this image series:

Title: ${seriesTitle}
${seriesDescription ? `Description: ${seriesDescription}` : ''}
${seriesTags?.length ? `Tags: ${seriesTags.join(', ')}` : ''}`;

  const model = getModel('gemini-flash');

  const result = await generateObject({
    model,
    schema: ShootParamsSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return result.object;
}
