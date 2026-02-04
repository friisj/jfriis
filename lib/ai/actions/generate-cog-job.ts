'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../models';
import type { ShootParams } from '@/lib/types/cog';

// Schema for generated job steps (shots in a photo shoot)
const JobStepSchema = z.object({
  sequence: z.number(),
  step_type: z.enum(['llm', 'image_gen']),
  model: z.string(),
  prompt: z.string(),
  variation: z.string().optional().describe('What makes this shot unique within the shoot'),
});

const GeneratedJobSchema = z.object({
  title: z.string().describe('A descriptive title for this photo shoot'),
  steps: z.array(JobStepSchema).describe('The sequence of shots to capture'),
});

export type GeneratedJob = z.infer<typeof GeneratedJobSchema>;
export type GeneratedJobStep = z.infer<typeof JobStepSchema>;

interface ReferenceImageInfo {
  referenceId: number;
  context: string;
}

interface GenerateJobInput {
  basePrompt: string;
  imageCount: number;
  seriesContext?: {
    title: string;
    description?: string;
    tags?: string[];
  };
  referenceImages?: ReferenceImageInfo[];
  shootParams?: Partial<ShootParams>;
}

export async function generateCogJob(input: GenerateJobInput): Promise<GeneratedJob> {
  const { basePrompt, imageCount, seriesContext, referenceImages, shootParams } = input;

  const hasReferences = referenceImages && referenceImages.length > 0;
  const hasShootParams = shootParams && Object.values(shootParams).some(Boolean);

  // Build reference instructions - optimized for subject customization when refs available
  const referenceInstructions = hasReferences
    ? `
CRITICAL - Reference Images for Subject Customization:
The user has provided ${referenceImages.length} reference image(s) that define the SUBJECT to be generated.
You MUST incorporate these into every prompt using [1], [2], [3], or [4] notation.

Available subject references:
${referenceImages.map((ref) => `- [${ref.referenceId}]: ${ref.context}`).join('\n')}

IMPORTANT: The image model uses these references for SUBJECT CUSTOMIZATION - it will recreate
the subject from the reference images in new scenes and contexts. Your prompts should:
- Place the subject [1] in the scene (e.g., "[1] standing in a forest clearing")
- Describe what the subject is doing (e.g., "[1] reading a book under soft lamplight")
- Combine subjects if multiple (e.g., "[1] and [2] walking together through the city")

The reference image provides the WHO - your prompt provides the WHERE, WHAT, and HOW.
`
    : '';

  // Build shoot params instructions
  const shootParamsInstructions = hasShootParams
    ? `
PHOTO SHOOT SETUP - Apply these creative parameters to all shots:
${shootParams.scene ? `- Scene: ${shootParams.scene}` : ''}
${shootParams.art_direction ? `- Art Direction: ${shootParams.art_direction}` : ''}
${shootParams.styling ? `- Styling: ${shootParams.styling}` : ''}
${shootParams.camera ? `- Camera: ${shootParams.camera}` : ''}
${shootParams.framing ? `- Framing: ${shootParams.framing}` : ''}
${shootParams.lighting ? `- Lighting: ${shootParams.lighting}` : ''}

Each shot should incorporate these parameters while varying the specific pose, action, or moment captured.
`
    : '';

  const systemPrompt = `You are a creative director planning shots for a photo shoot.

Your task is to create ${imageCount} distinct shot(s) based on the series concept and shoot setup.

Each shot should be an image generation step (step_type: "image_gen") with model: "imagen-3".
Shots should be numbered sequentially starting from 1.

For each shot, write a complete, production-ready prompt that includes:
${hasReferences ? '- The subject reference(s) using [N] notation - this is REQUIRED' : '- A clear subject description'}
- Scene and environment details
- Pose, action, or moment being captured
- Mood and atmosphere
- Technical camera/lighting details
- Style and aesthetic direction

${hasShootParams ? 'IMPORTANT: All shots share the same shoot setup but vary in the specific moment, pose, or angle.' : 'Create distinct variations across the shots - different angles, moments, or compositions.'}

Write prompts that are ready for direct use with an image generation model - be specific and vivid.
${referenceInstructions}
${shootParamsInstructions}
${seriesContext ? `
Series Context:
- Title: ${seriesContext.title}
- Description: ${seriesContext.description || 'None'}
- Tags: ${seriesContext.tags?.join(', ') || 'None'}
` : ''}`;

  const model = getModel('gemini-flash');

  const result = await generateObject({
    model,
    schema: GeneratedJobSchema,
    system: systemPrompt,
    prompt: `Plan ${imageCount} shot(s) for this photo shoot:

Series: "${basePrompt}"

Generate ${imageCount} image_gen step(s), each capturing a unique moment or angle within the shoot concept.`,
  });

  return result.object;
}
