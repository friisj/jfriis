/**
 * Thinking Job Prompt Builders
 *
 * Three prompts for the thinking pipeline:
 * 1. Subject Translation: story -> concrete photographable subject
 * 2. Creative Direction: photographer + subject + publication -> detailed shot description
 * 3. Image Generation: creative direction -> image gen prompt
 */

// ============================================================================
// Step 1: Subject Translation
// ============================================================================

export function buildSubjectTranslationPrompt(story: string): {
  system: string;
  prompt: string;
} {
  return {
    system: `You are translating a creative brief into a concrete, photographable subject. Your job is to distill narrative and conceptual language into a 1-2 sentence description of what the camera would actually see. Be specific and visual — not abstract.

Examples:
- "The hidden cost of cheap electronics" -> "A vast e-waste processing facility in Ghana, workers sorting through mountains of discarded circuit boards under harsh fluorescent light"
- "How monetary policy shapes everyday life" -> "A grandmother counting coins at a kitchen table, supermarket receipts spread around her"
- "The loneliness of remote work" -> "A single lit apartment window in a darkened office tower at 2am"`,
    prompt: `Creative brief: "${story}"

Translate this into a concrete, photographable subject. Describe what the camera would see — the scene, the subjects, the environment. Be specific and visual. Output only the subject description, nothing else.`,
  };
}

// ============================================================================
// Step 2: Creative Direction
// ============================================================================

export function buildCreativeDirectionPrompt(input: {
  subject: string;
  photographer: string;
  publication: string;
  styleHints?: string | null;
}): {
  system: string;
  prompt: string;
} {
  const { subject, photographer, publication, styleHints } = input;

  const styleSection = styleHints
    ? `\n\nAdditional style guidance: ${styleHints}`
    : '';

  return {
    system: `You are a photo editor commissioning a shoot. You deeply understand photographic styles, editorial aesthetics, and how different photographers approach their subjects. Your job is to describe exactly how a specific photographer would shoot a given subject for a specific publication — in enough detail that an image generator could recreate the shot.`,
    prompt: `How would ${photographer} shoot "${subject}" for ${publication}?

Describe the shot in rich detail:
- **Composition**: framing, perspective, what's in the foreground/background, rule of thirds, leading lines
- **Lighting**: natural/artificial, direction, quality (hard/soft), color temperature, time of day
- **Mood**: emotional tone, atmosphere, tension
- **Color palette**: dominant colors, grade, saturation
- **What's in frame**: specific elements, props, environment details
- **What's NOT in frame**: what to exclude, what to leave to imagination
- **Technical**: lens choice, depth of field, grain/texture, format feel${styleSection}

Write this as a cohesive creative direction — a paragraph or two that reads like an art director's brief. Be specific enough that someone could recreate this exact shot.`,
  };
}

// ============================================================================
// Step 3: Image Generation Prompt
// ============================================================================

export function buildImageGenerationPrompt(
  creativeDirection: string,
): string {
  return `Generate a photorealistic image based on this creative direction:

${creativeDirection}

The image should look like an authentic photograph — not AI-generated, not stock photography. Capture the specific mood, lighting, and composition described above. Professional editorial quality.`;
}
