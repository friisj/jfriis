'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../models';

// --- Photographer ---

const PhotographerSeedSchema = z.object({
  name: z.string().describe('Descriptive name, e.g. "Mario Testino - Commercial"'),
  description: z.string().describe('One-line description of this photographer persona'),
  style_description: z.string().describe('Detailed visual style, aesthetic, signature look — specific enough for AI image generation'),
  style_references: z.array(z.string()).describe('3-5 reference touchpoints: photographers, movements, publications, or visual benchmarks'),
  techniques: z.string().describe('Lighting, lens choices, post-processing, color grading, and technical signature'),
  testbed_notes: z.string().describe('Prompt engineering notes: what works well with this style, common pitfalls, key phrases'),
});

export async function generatePhotographerSeed(seed: string) {
  const result = await generateObject({
    model: getModel('gemini-flash'),
    schema: PhotographerSeedSchema,
    system: `You are an expert photography historian and creative director. Generate a comprehensive photographer config that captures the essence of a photographic style for AI image generation. Be specific and actionable — every field should contain information useful for crafting image generation prompts.`,
    prompt: `Generate a photographer config from this seed: "${seed}"`,
  });
  return result.object;
}

// --- Director ---

const DirectorSeedSchema = z.object({
  name: z.string().describe('Descriptive name, e.g. "Wes Anderson - Symmetrical Whimsy"'),
  description: z.string().describe('One-line description of this creative director persona'),
  approach_description: z.string().describe('Editorial vision, narrative style, how they conceive and plan shoots'),
  methods: z.string().describe('How they brief photographers, select talent, build mood boards, manage creative flow'),
});

export async function generateDirectorSeed(seed: string) {
  const result = await generateObject({
    model: getModel('gemini-flash'),
    schema: DirectorSeedSchema,
    system: `You are an expert in creative direction and editorial photography. Generate a comprehensive creative director config that captures a distinct editorial vision and working methodology. Be specific about how this director approaches image creation — their methods should be actionable for AI image generation workflows.`,
    prompt: `Generate a creative director config from this seed: "${seed}"`,
  });
  return result.object;
}

// --- Production ---

const ProductionSeedSchema = z.object({
  name: z.string().describe('Descriptive name, e.g. "Luxury Fashion Editorial"'),
  description: z.string().describe('One-line description of this production style'),
  shoot_details: z.string().describe('Studio vs location, set design, equipment, practical logistics'),
  editorial_notes: z.string().describe('Retouching philosophy, color grading approach, compositing style'),
  costume_notes: z.string().describe('Wardrobe direction, makeup, hair, accessories, overall styling'),
  conceptual_notes: z.string().describe('Themes, symbolism, mood, narrative arc, emotional tone'),
});

export async function generateProductionSeed(seed: string) {
  const result = await generateObject({
    model: getModel('gemini-flash'),
    schema: ProductionSeedSchema,
    system: `You are an expert production designer and fashion stylist. Generate a comprehensive production config that defines the practical and conceptual aspects of a photo production. Be specific — every field should contain information useful for crafting detailed image generation prompts.`,
    prompt: `Generate a production config from this seed: "${seed}"`,
  });
  return result.object;
}

// --- Eval Profile ---

const EvalCriterionSchema = z.object({
  key: z.string().describe('Snake_case key for this criterion, e.g. "brand_alignment"'),
  label: z.string().describe('Human-readable label, e.g. "Brand Alignment"'),
  description: z.string().describe('What to evaluate: a clear instruction for the vision model'),
  weight: z.number().min(0).max(1).describe('Weight from 0.0 to 1.0, all criteria should sum to 1.0'),
});

const EvalSeedSchema = z.object({
  name: z.string().describe('Descriptive name, e.g. "Brand-First Art Director"'),
  description: z.string().describe('One-line description of this eval perspective'),
  system_prompt: z.string().describe('The art director persona: voice, priorities, what they care about most when evaluating images. Written in second person ("You are...")'),
  criteria: z.array(EvalCriterionSchema).min(2).max(8).describe('3-6 evaluation criteria with weights summing to 1.0'),
  selection_threshold: z.number().min(1).max(10).describe('Minimum overall score to accept an image (typically 6-8)'),
});

export async function generateEvalSeed(seed: string) {
  const result = await generateObject({
    model: getModel('gemini-flash'),
    schema: EvalSeedSchema,
    system: `You are an expert in creative direction and image evaluation. Generate a comprehensive eval profile that represents a specific art director's perspective on what makes a good photograph for a given brief. The criteria should be specific and actionable for AI vision evaluation. Ensure criteria weights sum to 1.0.`,
    prompt: `Generate an eval profile from this seed: "${seed}"`,
  });
  return result.object;
}
