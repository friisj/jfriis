/**
 * Multi-Stage Inference Pipeline Prompt Builders
 *
 * These 7 inference steps progressively refine a creative brief into a final
 * image generation prompt by combining perspectives from three config roles:
 *
 *   1. Context translation (story + themes → accessible event-oriented briefing)
 *   2. Photographer concept generation
 *   3. Director briefing synthesis
 *   4. Production constraint integration
 *   5. Core creative intent refinement (WITH THINKING)
 *   6. Reference image vision analysis
 *   7. Final director vision synthesis (WITH THINKING)
 *
 * Steps 5 and 7 are designed to run with thinking mode enabled for deeper reasoning.
 */

import type {
  CogPhotographerConfig,
  CogDirectorConfig,
  CogProductionConfig,
} from '@/lib/types/cog';

// ============================================================================
// Context Interface
// ============================================================================

export interface InferenceContext {
  photographerConfig: CogPhotographerConfig;
  directorConfig: CogDirectorConfig;
  productionConfig: CogProductionConfig;
  basePrompt: string;
  referenceImages: string[]; // Image IDs
  colors?: string[];
  themes?: string[];
  /** Output of the context translation step — accessible, event-oriented briefing */
  contextBriefing?: string;
}

// ============================================================================
// Inference Step 1: Context Translation
// ============================================================================

/**
 * Translate the raw story into a brief, visual-ready summary for the photographer.
 *
 * The input is typically business/market news — company earnings, competitive
 * shifts, regulatory actions, trend impacts. The photographer doesn't need
 * financial detail; they need to see the *drama*: who's rising, who's falling,
 * what force is acting on whom.
 */
export function buildContextTranslationPrompt(ctx: InferenceContext): string {
  const themesSection =
    ctx.themes && ctx.themes.length > 0
      ? `\nThemes: ${ctx.themes.join(', ')}`
      : '';

  const colorsSection =
    ctx.colors && ctx.colors.length > 0
      ? `\nColor associations: ${ctx.colors.join(', ')}`
      : '';

  return `Translate this briefing into a short, concrete summary for a photographer. The subject matter is modern companies — how their value, power, and influence shift due to market forces, competition, regulation, technology, and global events.

Strip all financial jargon and quantitative detail. Instead, surface:
- Who is gaining or losing power, and why
- What force is acting on them (a competitor, a trend, a regulation, a cultural shift)
- The emotional register: dominance, vulnerability, momentum, stagnation, disruption

Be brief. A few sharp sentences, not paragraphs. The photographer needs to *see* a dynamic, not read a report.

"${ctx.basePrompt}"
${themesSection}
${colorsSection}`;
}

// ============================================================================
// Inference Step 2: Photographer Concept Generation
// ============================================================================

/**
 * "What concept would [photographer] construct given [statement]?"
 *
 * Takes the photographer's style, techniques, and references and asks them
 * to envision a visual concept based on the creative brief. When a context
 * briefing is available (from the translation step), it's included as an
 * accessible interpretation of the story.
 */
export function buildInference1Prompt(ctx: InferenceContext): string {
  const referencesText =
    ctx.photographerConfig.style_references.length > 0
      ? ctx.photographerConfig.style_references.join(', ')
      : 'None specified';

  const contextSection = ctx.contextBriefing
    ? `\nContext briefing (what this story is really about):\n${ctx.contextBriefing}\n`
    : '';

  return `You are ${ctx.photographerConfig.name}, a photographer with this style:
${ctx.photographerConfig.style_description}

Techniques: ${ctx.photographerConfig.techniques || 'Not specified'}
References: ${referencesText}
${ctx.photographerConfig.testbed_notes ? `\nExperimental notes: ${ctx.photographerConfig.testbed_notes}` : ''}

Given this creative brief: "${ctx.basePrompt}"
${contextSection}${ctx.themes && ctx.themes.length > 0 ? `\nThemes to explore: ${ctx.themes.join(', ')}` : ''}
${ctx.colors && ctx.colors.length > 0 ? `\nColor palette: ${ctx.colors.join(', ')}` : ''}

What visual concept would you construct? Describe the scene, composition, mood, and key visual elements you would capture. Think about your signature approach and how it applies to this brief.`;
}

// ============================================================================
// Inference Step 3: Director Briefing Synthesis
// ============================================================================

/**
 * "How would [director] brief [photographer]?"
 *
 * The creative director reviews the photographer's proposed concept and
 * provides guidance, constraints, and enhancements to align with the
 * overall creative vision.
 */
export function buildInference2Prompt(
  ctx: InferenceContext,
  inference1Output: string
): string {
  return `As a Creative Director with this approach:
${ctx.directorConfig.approach_description}

Methods: ${ctx.directorConfig.methods || 'Not specified'}
${ctx.directorConfig.interview_mapping ? `\nInterview framework: ${JSON.stringify(ctx.directorConfig.interview_mapping)}` : ''}

You need to brief ${ctx.photographerConfig.name} on this project.

Original creative brief: "${ctx.basePrompt}"

The photographer has proposed this concept:
${inference1Output}

How would you brief the photographer to align with the creative vision? What guidance, constraints, or enhancements would you provide? Consider the overall narrative, emotional tone, and visual storytelling objectives.`;
}

// ============================================================================
// Inference Step 4: Production Constraint Integration
// ============================================================================

/**
 * "How would the concept work within production constraints?"
 *
 * Integrates real-world production details -- shoot logistics, editorial
 * direction, costuming, and conceptual notes -- to ground the creative
 * vision in practical reality.
 */
export function buildInference3Prompt(
  ctx: InferenceContext,
  inference1Output: string,
  inference2Output: string
): string {
  return `Given these production constraints:
- Shoot details: ${ctx.productionConfig.shoot_details || 'Not specified'}
- Editorial: ${ctx.productionConfig.editorial_notes || 'Not specified'}
- Costume: ${ctx.productionConfig.costume_notes || 'Not specified'}
- Conceptual: ${ctx.productionConfig.conceptual_notes || 'Not specified'}

Initial photographer concept:
${inference1Output}

Director's briefing:
${inference2Output}

How would you adapt this concept to work within these production constraints while maintaining the creative vision? Identify any tensions between the creative ambition and production realities, and propose solutions that honor both.`;
}

// ============================================================================
// Inference Step 5: Creative Synthesis & Refinement (WITH THINKING)
// ============================================================================

/**
 * "Synthesize the strongest vision, preserving technical and directorial specifics."
 *
 * This step uses thinking mode (extended reasoning) to identify the most
 * powerful creative elements and sharpen the concept while retaining the
 * concrete photographic techniques, directorial methods, and production
 * details that make the image specific and executable.
 */
export function buildInference4Prompt(
  ctx: InferenceContext,
  inference3Output: string
): string {
  const referencesText =
    ctx.photographerConfig.style_references.length > 0
      ? ctx.photographerConfig.style_references.join(', ')
      : 'None specified';

  return `You are refining a creative concept into a sharp, executable vision.

PHOTOGRAPHER PROFILE — ${ctx.photographerConfig.name}:
- Style: ${ctx.photographerConfig.style_description}
- Techniques: ${ctx.photographerConfig.techniques || 'Not specified'}
- References: ${referencesText}
${ctx.photographerConfig.testbed_notes ? `- Experimental notes: ${ctx.photographerConfig.testbed_notes}` : ''}

DIRECTOR PROFILE:
- Approach: ${ctx.directorConfig.approach_description}
- Methods: ${ctx.directorConfig.methods || 'Not specified'}

PRODUCTION CONTEXT:
- Shoot: ${ctx.productionConfig.shoot_details || 'Not specified'}
- Editorial: ${ctx.productionConfig.editorial_notes || 'Not specified'}
- Costume: ${ctx.productionConfig.costume_notes || 'Not specified'}
- Conceptual: ${ctx.productionConfig.conceptual_notes || 'Not specified'}

CURRENT CONCEPT (from collaboration so far):
${inference3Output}

Your task: Identify the single most powerful visual idea in this concept and sharpen it. Consider:

1. What is the core emotional and visual impact?
2. Which specific photographer techniques and directorial methods should be front and center?
3. Are there production details (costume, setting, editorial tone) that strengthen the image?
4. What is generic or vague that should be made more specific?

Provide a refined creative direction that:
- PRESERVES specific techniques, methods, and production details — these are not constraints to strip, they are the substance of the image
- Removes only elements that genuinely dilute the central idea
- Sharpens any vague descriptions into concrete visual specifics (lighting direction, composition type, color temperature, texture, material)
- Names the photographer's techniques that should be visible in the final image`;
}

// ============================================================================
// Inference Step 6: Reference Image Vision Analysis
// ============================================================================

/**
 * "What is this reference image?"
 *
 * Analyzes a reference image using vision capabilities to extract style,
 * composition, lighting, color, and technical details that can inform
 * the final prompt synthesis.
 *
 * This prompt is sent alongside the image data to a vision-capable model.
 * If there are no reference images, this step is skipped entirely.
 */
export function buildVisionPrompt(): string {
  return `Analyze this reference image in detail. Describe:

1. Visual style and aesthetic: What artistic style, period, or movement does this evoke?
2. Composition and framing: How is the image structured? What draws the eye?
3. Lighting and mood: What is the quality, direction, and emotional effect of the lighting?
4. Color palette: What are the dominant and accent colors? What is the overall color temperature?
5. Subject matter and context: What is depicted and what story does it tell?
6. Technical approach: What photographic or artistic techniques are apparent?

Provide a comprehensive description that could inform a new image generation, focusing on the elements that make this image distinctive and effective.`;
}

// ============================================================================
// Inference Step 7: Final Technical Prompt Synthesis (WITH THINKING)
// ============================================================================

/**
 * "Write the final image generation prompt as shot notes."
 *
 * This step uses thinking mode to synthesize all prior inference into a
 * concrete, technical image generation prompt. It receives the full config
 * data so nothing is lost in the chain of summarization. The output should
 * read like a photographer's shot notes — specific enough for an image
 * model to produce a distinctive result.
 */
export function buildInference6Prompt(
  ctx: InferenceContext,
  inference4Output: string,
  visionOutputs: string[]
): string {
  const referencesText =
    ctx.photographerConfig.style_references.length > 0
      ? ctx.photographerConfig.style_references.join(', ')
      : 'None';

  const visionSection =
    visionOutputs.length > 0
      ? `\nREFERENCE IMAGE ANALYSIS:\n${visionOutputs.map((output, i) => `--- Reference ${i + 1} ---\n${output}`).join('\n\n')}`
      : '';

  const colorsSection =
    ctx.colors && ctx.colors.length > 0
      ? `\nCOLOR PALETTE: ${ctx.colors.join(', ')}`
      : '';

  const themesSection =
    ctx.themes && ctx.themes.length > 0
      ? `\nTHEMES: ${ctx.themes.join(', ')}`
      : '';

  return `Write a detailed image generation prompt. You have all the context below — your job is to turn it into a single, dense, technical prompt that an image generation model (like Gemini or Flux) will use to create the image.

=== PHOTOGRAPHER: ${ctx.photographerConfig.name} ===
Style: ${ctx.photographerConfig.style_description}
Techniques: ${ctx.photographerConfig.techniques || 'Not specified'}
References: ${referencesText}
${ctx.photographerConfig.testbed_notes ? `Experimental notes: ${ctx.photographerConfig.testbed_notes}` : ''}

=== DIRECTOR ===
Approach: ${ctx.directorConfig.approach_description}
Methods: ${ctx.directorConfig.methods || 'Not specified'}

=== PRODUCTION ===
Shoot details: ${ctx.productionConfig.shoot_details || 'Not specified'}
Editorial direction: ${ctx.productionConfig.editorial_notes || 'Not specified'}
Costume/styling: ${ctx.productionConfig.costume_notes || 'Not specified'}
Conceptual framework: ${ctx.productionConfig.conceptual_notes || 'Not specified'}

=== REFINED CREATIVE DIRECTION (from prior synthesis) ===
${inference4Output}
${visionSection}
${colorsSection}
${themesSection}

=== ORIGINAL BRIEF ===
"${ctx.basePrompt}"

=== YOUR TASK ===
Write the final image generation prompt. It should read like a photographer's detailed shot notes — not a creative brief, not a mood board description. Be concrete and technical:

- SUBJECT: Who/what is in frame, their pose, expression, placement
- COMPOSITION: Framing (close-up, medium, wide), rule of thirds, leading lines, depth
- LIGHTING: Direction, quality (hard/soft), color temperature, key/fill/rim setup, time of day
- COLOR: Specific color palette, grading style, saturation, contrast
- TEXTURE & MATERIAL: Surface qualities, fabric, skin, environment materials
- MOOD & ATMOSPHERE: Emotional register, energy level, tension/calm
- TECHNIQUE: The photographer's specific techniques that should be visible (${ctx.photographerConfig.techniques || 'their signature approach'})
- STYLE REFERENCE: Visual language drawn from ${referencesText}

The prompt must be a single continuous paragraph of descriptive text — no bullet points, no headers, no labels. Just the image description as you would speak it to an image model. Be specific, not generic. Every adjective should earn its place.

Provide ONLY the prompt text, nothing else.`;
}
