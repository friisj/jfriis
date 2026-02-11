/**
 * Multi-Stage Inference Pipeline Prompt Builders
 *
 * These 6 inference steps progressively refine a creative brief into a final
 * image generation prompt by combining perspectives from three config roles:
 *
 *   1. Photographer concept generation
 *   2. Director briefing synthesis
 *   3. Production constraint integration
 *   4. Core creative intent refinement (WITH THINKING)
 *   5. Reference image vision analysis
 *   6. Final director vision synthesis (WITH THINKING)
 *
 * Steps 4 and 6 are designed to run with thinking mode enabled for deeper reasoning.
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
  contextBriefing?: string;
}

// ============================================================================
// Inference Step 1: Photographer Concept Generation
// ============================================================================

/**
 * "What concept would [photographer] construct given [statement]?"
 *
 * Takes the photographer's style, techniques, and references and asks them
 * to envision a visual concept based on the creative brief.
 */
export function buildInference1Prompt(ctx: InferenceContext): string {
  const referencesText =
    ctx.photographerConfig.style_references.length > 0
      ? ctx.photographerConfig.style_references.join(', ')
      : 'None specified';

  return `You are ${ctx.photographerConfig.name}, a photographer with this style:
${ctx.photographerConfig.style_description}

Techniques: ${ctx.photographerConfig.techniques || 'Not specified'}
References: ${referencesText}
${ctx.photographerConfig.testbed_notes ? `\nExperimental notes: ${ctx.photographerConfig.testbed_notes}` : ''}

Given this creative brief: "${ctx.basePrompt}"
${ctx.themes && ctx.themes.length > 0 ? `\nThemes to explore: ${ctx.themes.join(', ')}` : ''}
${ctx.colors && ctx.colors.length > 0 ? `\nColor palette: ${ctx.colors.join(', ')}` : ''}

What visual concept would you construct? Describe the scene, composition, mood, and key visual elements you would capture. Think about your signature approach and how it applies to this brief.`;
}

// ============================================================================
// Inference Step 2: Director Briefing Synthesis
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
// Inference Step 3: Production Constraint Integration
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
// Inference Step 4: Core Creative Intent Refinement (WITH THINKING)
// ============================================================================

/**
 * "What is the essential creative intent, stripped of constraints?"
 *
 * This step uses thinking mode (extended reasoning) to deeply consider
 * the core character, mood, and story of the image. It distills the
 * production-constrained concept back to its essential creative intent,
 * then provides refinement feedback.
 */
export function buildInference4Prompt(
  ctx: InferenceContext,
  inference3Output: string
): string {
  return `Review the production-constrained concept below:

${inference3Output}

Step back and consider: what is the essential character, mood, and story at the core of this image?

Strip away specific production constraints and refocus on the fundamental creative intent. Consider:

1. What is the single most powerful visual idea here?
2. What emotion or reaction should the viewer have?
3. What makes this image unique and compelling?
4. Are there elements that dilute the core vision?

Provide a refined creative direction that:
- Preserves the strongest elements from the photographer's concept and director's guidance
- Removes anything that weakens the central idea
- Sharpens the visual and emotional focus
- Offers specific feedback on what to amplify and what to let go`;
}

// ============================================================================
// Inference Step 5: Reference Image Vision Analysis
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
// Inference Step 6: Final Director Vision Synthesis (WITH THINKING)
// ============================================================================

/**
 * "As [photographer], what is the finalized director vision with all inputs?"
 *
 * This step uses thinking mode (extended reasoning) to synthesize everything:
 * the refined creative intent from step 4, vision analysis from step 5,
 * plus color and theme inputs. The output is the final image generation prompt.
 */
export function buildInference6Prompt(
  ctx: InferenceContext,
  inference4Output: string,
  visionOutputs: string[]
): string {
  const visionSection =
    visionOutputs.length > 0
      ? `\nReference image analysis:\n${visionOutputs.map((output, i) => `--- Reference ${i + 1} ---\n${output}`).join('\n\n')}`
      : '\nNo reference images provided.';

  const colorsSection =
    ctx.colors && ctx.colors.length > 0
      ? `Colors to incorporate: ${ctx.colors.join(', ')}`
      : 'Colors: No specific palette specified';

  const themesSection =
    ctx.themes && ctx.themes.length > 0
      ? `Themes: ${ctx.themes.join(', ')}`
      : 'Themes: No specific themes specified';

  return `You are ${ctx.photographerConfig.name}, synthesizing the final creative vision.

Your photographic style:
${ctx.photographerConfig.style_description}

Core creative intent (refined):
${inference4Output}
${visionSection}

${colorsSection}
${themesSection}

Original brief: "${ctx.basePrompt}"

Synthesize all of the above into a final, detailed image generation prompt. This prompt should:
- Capture the refined creative vision from the intent refinement process
- Incorporate relevant insights from reference image analysis (if available)
- Reflect your photographic style and signature techniques
- Integrate the specified colors and themes naturally
- Be specific and actionable for image generation
- Describe the scene, subject, composition, lighting, mood, colors, and style concisely

Provide ONLY the final prompt text, no additional commentary or explanation.`;
}
