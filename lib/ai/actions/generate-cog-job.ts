'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../models';

// Schema for generated job steps
const JobStepSchema = z.object({
  sequence: z.number(),
  step_type: z.enum(['llm', 'image_gen']),
  model: z.string(),
  prompt: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
});

const GeneratedJobSchema = z.object({
  title: z.string().describe('A descriptive title for this job'),
  steps: z.array(JobStepSchema).describe('The sequence of steps to execute'),
});

export type GeneratedJob = z.infer<typeof GeneratedJobSchema>;
export type GeneratedJobStep = z.infer<typeof JobStepSchema>;

interface GenerateJobInput {
  basePrompt: string;
  imageCount: number;
  seriesContext?: {
    title: string;
    description?: string;
    tags?: string[];
  };
}

export async function generateCogJob(input: GenerateJobInput): Promise<GeneratedJob> {
  const { basePrompt, imageCount, seriesContext } = input;

  const systemPrompt = `You are an AI assistant that designs image generation pipelines.

Your task is to create a sequence of steps that will generate ${imageCount} image(s) based on the user's prompt.

Each image should be produced by a pair of steps:
1. An LLM step (step_type: "llm") that analyzes and refines the prompt, adding specific details, style guidance, and composition notes
2. An image generation step (step_type: "image_gen") that uses the refined prompt to generate the image

For LLM steps, use model: "gemini-2.0-flash"
For image generation steps, use model: "imagen-3"

The steps should be numbered sequentially starting from 1.
For each image, the LLM step should have an even sequence number and the image_gen step should have the next odd number.
Example for 2 images: LLM(1), IMG(2), LLM(3), IMG(4)

Each LLM step prompt should:
- Reference the base concept
- Add specific artistic direction (style, mood, lighting, composition)
- Include technical parameters (aspect ratio suggestions, detail level)
- Make each image distinct if generating multiple

Each image_gen step prompt should be the refined, detailed prompt ready for the image model.

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

Generate the step sequence with LLM analysis followed by image generation for each image.`,
  });

  return result.object;
}
