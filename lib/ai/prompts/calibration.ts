/**
 * Calibration Prompt Builders
 *
 * Distillation: Compress photographer config fields into a dense prompt fragment
 * optimized for image generation (not a summary — a directive).
 *
 * Refinement: Iterate the distilled prompt based on rated benchmark images.
 */

import type {
  CogPhotographerConfig,
  CogPhotographerType,
  CogBenchmarkImage,
} from '@/lib/types/cog';

// ============================================================================
// Seed Subjects — one per photographer type
// ============================================================================

export const SEED_SUBJECTS: Record<CogPhotographerType, string> = {
  portrait:
    'Close-up portrait of a woman with auburn hair, neutral expression, soft directional light, clean background',
  fashion:
    'Full-body fashion photograph of a model in a tailored black coat, editorial pose, studio setting',
  editorial:
    'Editorial photograph of a CEO standing in a glass-walled corner office, city skyline behind, late afternoon light',
  street:
    'Street photograph of a musician playing saxophone on a rain-wet sidewalk at dusk, neon reflections',
  landscape:
    'Dramatic landscape of coastal cliffs at golden hour, waves crashing below, clouds streaked with light',
  fine_art:
    'Fine art photograph of a dancer mid-leap in an empty white gallery, motion blur on extremities, sharp torso',
  commercial:
    'Commercial product photograph of a luxury watch on a dark slate surface, single hard light source, precise reflections',
};

// ============================================================================
// Distillation Prompt
// ============================================================================

export function buildDistillationPrompt(config: CogPhotographerConfig): string {
  const refs = config.style_references.length > 0
    ? `\nStyle References: ${config.style_references.join(', ')}`
    : '';

  return `You are a prompt engineering specialist for AI image generation. Your task is to distill a photographer configuration into a dense, directive prompt fragment (100-200 words) that can be prepended to any subject to reproduce this photographer's signature look.

This is NOT a summary or biography. It is a technical directive for an image generation model. Every word must earn its place. Focus on:
- Lighting direction, quality, and color temperature
- Color palette and tonal treatment (shadows, highlights, mid-tones)
- Texture and grain characteristics
- Composition principles and framing tendencies
- Depth of field and focus behavior
- Mood and atmospheric qualities
- Post-processing signature (contrast curves, color grading, film stock emulation)

Do NOT include the subject itself — the fragment must be subject-agnostic so it can wrap around any seed subject.

Output ONLY the prompt fragment, no preamble or explanation.

---

Name: ${config.name}
${config.description ? `Description: ${config.description}` : ''}
Style: ${config.style_description}${refs}
Techniques: ${config.techniques}
Testbed Notes: ${config.testbed_notes}`;
}

// ============================================================================
// Refinement Prompt
// ============================================================================

export function buildRefinementPrompt(
  config: CogPhotographerConfig,
  previousPrompt: string,
  imageRatings: CogBenchmarkImage[],
): string {
  const ratingLines = imageRatings
    .map((img) => {
      const status = img.rating ?? 'unrated';
      const fb = img.feedback ? ` — "${img.feedback}"` : '';
      return `  Image ${img.image_index + 1}: ${status}${fb}`;
    })
    .join('\n');

  return `You are a prompt engineering specialist for AI image generation. You previously distilled a photographer config into a prompt fragment. Benchmark images were generated and rated. Your task is to improve the prompt fragment based on the feedback.

Rules:
- Keep the output to 100-200 words
- Remain subject-agnostic (no specific subject references)
- Strengthen elements that produced approved images
- Correct or replace elements that produced rejected images
- Incorporate specific feedback where given
- Maintain the photographer's core visual identity

Output ONLY the improved prompt fragment, no preamble or explanation.

---

Photographer: ${config.name}
Style: ${config.style_description}
Techniques: ${config.techniques}

Previous Prompt Fragment:
${previousPrompt}

Benchmark Results:
${ratingLines}`;
}
