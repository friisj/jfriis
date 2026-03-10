/**
 * Gemini Vision Analysis
 *
 * Uses Gemini's superior vision capabilities to analyze images,
 * returning structured text descriptions. Used as a pre-processing
 * step before passing images to Claude for conversation/reasoning.
 */

import { generateText } from 'ai';
import { getModel } from './models';

interface AnalyzeImageOptions {
  base64: string;
  mediaType: string;
  prompt: string;
  modelKey?: string;
  maxTokens?: number;
}

/**
 * Analyze a single image using Gemini vision.
 * Returns a text analysis. On failure, returns null (caller should degrade gracefully).
 */
export async function analyzeImageWithGemini({
  base64,
  mediaType,
  prompt,
  modelKey = 'gemini-flash',
  maxTokens = 800,
}: AnalyzeImageOptions): Promise<string | null> {
  try {
    const result = await generateText({
      model: getModel(modelKey),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: Buffer.from(base64, 'base64'),
              mediaType,
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
      maxTokens,
    });
    return result.text;
  } catch (err) {
    console.error('[gemini-vision] Analysis failed:', err);
    return null;
  }
}

/**
 * Build a chassis-aware vision prompt for review image analysis.
 */
export function buildChassisVisionPrompt(
  chassisParams: Record<string, unknown>
): string {
  return `Analyze this image of a person/character in detail. Describe:
1. Physical features: face shape, eye color/shape, skin tone, hair color/style/length/texture
2. Expression and pose
3. Clothing and styling
4. Lighting conditions and how they affect apparent colors
5. Any notable or distinctive details

Then compare against these target parameters:
${JSON.stringify(chassisParams, null, 2)}

Note specific alignments and discrepancies. Pay close attention to:
- Hair color under different lighting (warm light can shift cool tones warmer)
- Subtle tonal variations (rose-gold vs strawberry blonde vs copper)
- Whether apparent mismatches might be lighting artifacts vs actual differences`;
}

/**
 * Build a general vision prompt for chat image uploads.
 */
export function buildGeneralVisionPrompt(): string {
  return `Describe this image in detail. Include:
1. Subject and composition
2. Colors, lighting, and atmosphere
3. Notable details, textures, and quality
4. If this depicts a person: face shape, eye color, skin tone, hair color/style, expression, clothing
5. Any text visible in the image

Be precise about colors — distinguish between similar shades (e.g. "warm copper-gold" vs "light brown").`;
}
