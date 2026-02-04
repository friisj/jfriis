'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../models';

// Schema for generated job steps
// Note: context field omitted from generation schema - Gemini doesn't allow empty object schemas
const JobStepSchema = z.object({
  sequence: z.number(),
  step_type: z.enum(['llm', 'image_gen']),
  model: z.string(),
  prompt: z.string(),
});

const GeneratedJobSchema = z.object({
  title: z.string().describe('A descriptive title for this job'),
  steps: z.array(JobStepSchema).describe('The sequence of steps to execute'),
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
}

export async function generateCogJob(input: GenerateJobInput): Promise<GeneratedJob> {
  const { basePrompt, imageCount, seriesContext, referenceImages } = input;

  const hasReferences = referenceImages && referenceImages.length > 0;

  const referenceInstructions = hasReferences
    ? `
IMPORTANT - Reference Images Available:
The user has provided ${referenceImages.length} reference image(s) that will be available during generation.
These MUST be referenced in your prompts using the notation [1], [2], [3], or [4].

Available references:
${referenceImages.map((ref) => `- [${ref.referenceId}]: ${ref.context}`).join('\n')}

When writing prompts, you MUST include explicit references like:
- "in the style of [1]"
- "featuring the subject from [1]"
- "use [1] as the primary style reference"
- "combine the style of [1] with the composition of [2]"

The image generation model will receive these reference images and use them to guide generation.
Without explicit [N] references in your prompts, the reference images will not be effectively used.
`
    : '';

  const systemPrompt = `You are an AI assistant that designs image generation pipelines.

Your task is to create ${imageCount} image generation step(s) based on the user's prompt.

Each step should be an image generation step (step_type: "image_gen") with model: "imagen-3".
Steps should be numbered sequentially starting from 1.

For each step, write a detailed, refined prompt that includes:
- The core concept from the user's prompt
- Specific artistic direction (style, mood, lighting, composition)
- Technical details (perspective, framing, detail level)
- If generating multiple images, make each prompt distinct with variations

Write prompts that are ready for direct use with an image generation model - be specific and descriptive.
${referenceInstructions}
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
    prompt: `Create a job to generate ${imageCount} image(s) based on this prompt:

"${basePrompt}"

Generate ${imageCount} image_gen step(s), each with a detailed, refined prompt ready for the image model.`,
  });

  return result.object;
}
