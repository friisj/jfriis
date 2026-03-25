/**
 * Chassis Study Pipeline
 *
 * Orchestrates a multi-step image generation workflow:
 * 1. Gather chassis module parameters + canonical reference images
 * 2. Gemini thinking subagent generates a structured brief
 * 3. Brief is refined into a generation prompt
 * 4. Prompt + reference images passed to Gemini image gen
 * 5. Results stored in study record
 */

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  getChassisModulesBySlugsServer,
  getCanonicalImagesForModulesServer,
  createStudyServer,
  updateStudyServer,
} from './luv-chassis-server';
import { resolveImageAsBase64, resolveImagePublicUrl } from './luv-image-utils';
import { createLuvCogImageServer } from './luv/cog-integration-server';
import type { StudyBrief, LuvChassisStudy } from './types/luv-chassis';

const COG_IMAGES_BUCKET = 'cog-images';

// Gemini thinking model for brief generation
const BRIEF_MODEL = 'gemini-2.5-flash-preview-05-20';
// Image gen model IDs
const IMAGE_MODEL_IDS = {
  'nano-banana-2': 'gemini-3.1-flash-image-preview',
  'nano-banana-pro': 'gemini-3-pro-image-preview',
} as const;

type ImageModelAlias = keyof typeof IMAGE_MODEL_IDS;

export interface ChassisStudyInput {
  /** Natural language prompt from user — primary input */
  userPrompt: string;
  /** Specific goal for the study */
  goal?: string;
  /** Visual style direction */
  style?: string;
  /** Chassis module slugs to focus on (e.g. ["eyes", "hair"]) */
  moduleSlugs?: string[];
  /** Dynamic qualities (e.g. "wind in hair", "subtle smile") */
  dynamics?: string;
  /** Focus area description */
  focusArea?: string;
  /** Aspect ratio for generation */
  aspectRatio?: string;
  /** Output resolution */
  imageSize?: '1K' | '2K' | '4K';
  /** Model alias */
  model?: ImageModelAlias;
  /** Additional reference images from chat (base64) */
  chatReferenceImages?: { base64: string; mimeType: string }[];
}

export interface ChassisStudyResult {
  study: LuvChassisStudy;
  imageUrl: string;
  brief: StudyBrief;
  durationMs: number;
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Generate a study slug from title.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Step 1: Generate a structured brief using Gemini thinking.
 * The brief shapes the generation prompt by grounding it in chassis parameters.
 */
async function generateBrief(
  input: ChassisStudyInput,
  moduleParams: Record<string, Record<string, unknown>>,
  referenceDescriptions: string[],
): Promise<{ brief: StudyBrief; durationMs: number; tokensIn?: number; tokensOut?: number }> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');

  const startTime = Date.now();

  // Build the module parameters context
  const moduleContext = Object.entries(moduleParams)
    .map(([slug, params]) => {
      const paramLines = Object.entries(params)
        .map(([k, v]) => `  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('\n');
      return `[${slug}]\n${paramLines}`;
    })
    .join('\n\n');

  const refContext = referenceDescriptions.length > 0
    ? `\nReference Image Analysis:\n${referenceDescriptions.join('\n\n')}\n`
    : '';

  const briefPrompt = `You are an expert art director and character designer creating a brief for an AI image generation study of a character called Luv. Your job is to translate character specifications and creative direction into a precise, actionable generation brief.

## Character Chassis Parameters
${moduleContext}

${refContext}
## Study Request
User prompt: "${input.userPrompt}"
${input.goal ? `Goal: ${input.goal}` : ''}
${input.style ? `Style direction: ${input.style}` : ''}
${input.dynamics ? `Dynamic qualities: ${input.dynamics}` : ''}
${input.focusArea ? `Focus area: ${input.focusArea}` : ''}
Modules in focus: ${input.moduleSlugs?.join(', ') || 'all visible'}

## Task
Create a structured brief that translates the above into specific visual direction. Your brief must:

1. Ground every visual detail in the actual chassis parameter values (don't invent features not in the parameters)
2. Describe how each relevant parameter should manifest visually in this specific context
3. Include technical photography/rendering notes appropriate to the style
4. Be specific enough that the image generation model produces a consistent result

Respond with ONLY a JSON object (no markdown fences) with this shape:
{
  "description": "2-3 sentence overall description of what to generate",
  "visual_elements": ["element 1", "element 2", ...],
  "technical_notes": "photography/rendering technical direction",
  "parameter_mapping": { "module.parameter": "how it should appear", ... }
}`;

  const requestBody = {
    contents: [{ parts: [{ text: briefPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1200,
      responseMimeType: 'application/json',
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${BRIEF_MODEL}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[chassis-study] Brief generation failed:', errorText.slice(0, 300));
    throw new Error(`Brief generation failed: ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  const usage = result.usageMetadata;

  if (!text) throw new Error('No brief text returned from Gemini');

  const parsed = JSON.parse(text) as Omit<StudyBrief, 'model'>;
  const brief: StudyBrief = { ...parsed, model: BRIEF_MODEL };

  return {
    brief,
    durationMs: Date.now() - startTime,
    tokensIn: usage?.promptTokenCount,
    tokensOut: usage?.candidatesTokenCount,
  };
}

/**
 * Step 2: Shape the brief into a generation prompt.
 * Uses Gemini thinking to transform structured brief + parameters into a
 * single cohesive prompt optimized for the image gen model.
 */
async function shapeGenerationPrompt(
  brief: StudyBrief,
  input: ChassisStudyInput,
  referenceImageCount: number,
): Promise<{ prompt: string; durationMs: number }> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');

  const startTime = Date.now();

  const shapingPrompt = `You are converting a structured character study brief into a single, highly detailed image generation prompt. The prompt must be optimized for Gemini's image generation model.

## Brief
Description: ${brief.description}
Visual elements: ${brief.visual_elements.join('; ')}
Technical notes: ${brief.technical_notes}
Parameter mapping:
${Object.entries(brief.parameter_mapping).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Style Direction
${input.style || 'Not specified — use your best judgement based on the brief'}
${input.dynamics ? `Dynamic qualities: ${input.dynamics}` : ''}

## Requirements
- The prompt must be a single continuous description (no JSON, no headers)
- Include specific technical details: lighting, camera, lens, atmosphere
- Every chassis parameter from the mapping must appear as a concrete visual detail
- Keep under 400 words but be maximally descriptive
- If ${referenceImageCount} reference images are available, start with markers: ${Array.from({ length: referenceImageCount }, (_, i) => `[${i + 1}]`).join(' ')}
- Include "maintaining exact likeness and character features from reference" when references exist

Output ONLY the prompt text, nothing else.`;

  const requestBody = {
    contents: [{ parts: [{ text: shapingPrompt }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 800,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${BRIEF_MODEL}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[chassis-study] Prompt shaping failed:', errorText.slice(0, 300));
    // Fall back to brief description
    return { prompt: brief.description, durationMs: Date.now() - startTime };
  }

  const result = await response.json();
  const prompt = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  return {
    prompt: prompt || brief.description,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Step 3: Generate the image using the honed prompt and reference images.
 */
async function generateStudyImage(
  prompt: string,
  referenceImages: { base64: string; mimeType: string }[],
  aspectRatio: string,
  imageSize: string,
  model: ImageModelAlias,
): Promise<{ base64: string; mimeType: string; durationMs: number }> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');

  const startTime = Date.now();
  const modelId = IMAGE_MODEL_IDS[model];

  // Build content parts: reference images first, then prompt
  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  > = [];

  for (const img of referenceImages) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  // Ensure reference markers present
  let finalPrompt = prompt;
  if (referenceImages.length > 0 && !/\[\d+\]/.test(prompt)) {
    const markers = referenceImages.map((_, i) => `[${i + 1}]`).join(' ');
    finalPrompt = `${markers} ${prompt}`;
  }

  parts.push({ text: finalPrompt });

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { aspectRatio, imageSize },
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  console.log('[chassis-study] Image gen request:', {
    model: modelId,
    referenceCount: referenceImages.length,
    aspectRatio,
    imageSize,
    promptPreview: finalPrompt.slice(0, 120),
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[chassis-study] Image gen failed:', { status: response.status, body: errorText.slice(0, 300) });
    throw new Error(`Image generation failed: ${response.status} - ${errorText.slice(0, 200)}`);
  }

  const result = await response.json();
  const contentParts = result.candidates?.[0]?.content?.parts;

  if (!contentParts || !Array.isArray(contentParts)) {
    throw new Error('No content parts in image generation response');
  }

  const imagePart = contentParts.find(
    (part: { inlineData?: { mimeType: string; data: string } }) =>
      part.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData) {
    const textPart = contentParts.find((p: { text?: string }) => p.text);
    throw new Error(`No image generated: ${textPart?.text || 'Unknown reason'}`);
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Run the full chassis study pipeline.
 */
export async function runChassisStudyPipeline(
  input: ChassisStudyInput
): Promise<ChassisStudyResult> {
  const totalStart = Date.now();

  // Determine module slugs — default to all if none specified
  let moduleSlugs = input.moduleSlugs ?? [];
  if (moduleSlugs.length === 0) {
    // If user prompt mentions module names, try to extract
    // Otherwise default to a reasonable set for the focus
    moduleSlugs = ['eyes', 'skin', 'hair', 'mouth', 'nose', 'skeletal', 'body-proportions'];
  }

  // Step 0: Create study record in "briefing" state
  const title = input.goal
    ? `Study: ${input.goal}`
    : `Study: ${input.userPrompt.slice(0, 60)}`;

  const study = await createStudyServer({
    title,
    slug: `${slugify(title)}-${Date.now().toString(36)}`,
    module_slugs: moduleSlugs,
    focus_area: input.focusArea ?? '',
    goal: input.goal,
    style: input.style,
    dynamics: input.dynamics,
    user_prompt: input.userPrompt,
    aspect_ratio: input.aspectRatio ?? '3:4',
    image_size: input.imageSize ?? '2K',
    model: input.model ?? 'nano-banana-pro',
    status: 'briefing',
  });

  try {
    // Step 1: Load chassis module parameters
    const modules = await getChassisModulesBySlugsServer(moduleSlugs);
    const moduleParams: Record<string, Record<string, unknown>> = {};
    for (const mod of modules) {
      moduleParams[mod.slug] = mod.parameters;
    }

    // Step 2: Fetch canonical reference images for these modules
    const canonicalImages = await getCanonicalImagesForModulesServer(moduleSlugs);
    const referenceImagePaths = canonicalImages.map((img) => img.storagePath);

    // Resolve canonical images to base64 (cap at 4)
    const resolvedRefs: { base64: string; mimeType: string }[] = [];
    for (const img of canonicalImages.slice(0, 4)) {
      try {
        const resolved = await resolveImageAsBase64(img.storagePath);
        resolvedRefs.push({ base64: resolved.base64, mimeType: resolved.mediaType });
      } catch (err) {
        console.warn('[chassis-study] Failed to resolve reference image:', img.storagePath, err);
      }
    }

    // Add chat reference images if provided (after canonical, cap total at 6)
    const chatRefs = input.chatReferenceImages ?? [];
    const allRefImages = [...resolvedRefs, ...chatRefs].slice(0, 6);

    // Step 3: Analyze reference images for the brief (if any)
    let referenceDescriptions: string[] = [];
    if (allRefImages.length > 0) {
      const { analyzeReferenceImages } = await import('./ai/gemini-multimodal');
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
      const analysis = await analyzeReferenceImages(
        allRefImages.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
        apiKey
      );
      referenceDescriptions = analysis.descriptions;
    }

    // Step 4: Generate structured brief
    const briefResult = await generateBrief(input, moduleParams, referenceDescriptions);

    await updateStudyServer(study.id, {
      brief: briefResult.brief,
      reference_image_paths: referenceImagePaths,
      status: 'generating',
    });

    // Step 5: Shape the generation prompt
    const { prompt: generationPrompt, durationMs: shapeDuration } =
      await shapeGenerationPrompt(briefResult.brief, input, allRefImages.length);

    await updateStudyServer(study.id, { generation_prompt: generationPrompt });

    // Step 6: Generate the image
    const imageResult = await generateStudyImage(
      generationPrompt,
      allRefImages,
      input.aspectRatio ?? '3:4',
      input.imageSize ?? '2K',
      (input.model ?? 'nano-banana-pro') as ImageModelAlias,
    );

    // Step 7: Upload to storage
    const ext = imageResult.mimeType === 'image/png' ? 'png' : 'jpg';
    const storagePath = `luv/studies/${Date.now()}-${randomUUID()}.${ext}`;
    const buffer = Buffer.from(imageResult.base64, 'base64');
    const client = serviceClient();

    const { error: uploadError } = await client.storage
      .from(COG_IMAGES_BUCKET)
      .upload(storagePath, buffer, { contentType: imageResult.mimeType, upsert: false });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Step 8: Record in cog_images
    let cogImageId: string | null = null;
    try {
      const cogImage = await createLuvCogImageServer({
        seriesKey: 'studies',
        storagePath,
        filename: `study-${Date.now()}.${ext}`,
        mimeType: imageResult.mimeType,
        source: 'generated',
        prompt: generationPrompt,
        metadata: {
          studyId: study.id,
          moduleSlugs,
          model: IMAGE_MODEL_IDS[(input.model ?? 'nano-banana-pro') as ImageModelAlias],
          aspectRatio: input.aspectRatio ?? '3:4',
          imageSize: input.imageSize ?? '2K',
        },
      });
      cogImageId = cogImage.id;
    } catch (err) {
      console.error('[chassis-study] cog_images insert failed:', err);
    }

    // Step 9: Finalize study record
    const totalDurationMs = Date.now() - totalStart;
    const metadata = {
      briefDurationMs: briefResult.durationMs,
      briefTokensIn: briefResult.tokensIn,
      briefTokensOut: briefResult.tokensOut,
      promptShapeDurationMs: shapeDuration,
      imageDurationMs: imageResult.durationMs,
      totalDurationMs,
      referenceImageCount: allRefImages.length,
      chatReferenceCount: chatRefs.length,
      canonicalReferenceCount: resolvedRefs.length,
    };

    const updatedStudy = await updateStudyServer(study.id, {
      generated_image_path: storagePath,
      cog_image_id: cogImageId ?? undefined,
      generation_metadata: metadata,
      status: 'completed',
    });

    const imageUrl = resolveImagePublicUrl(storagePath);

    console.log('[chassis-study] Pipeline complete:', {
      studyId: study.id,
      totalDurationMs,
      moduleSlugs,
      refCount: allRefImages.length,
    });

    return {
      study: updatedStudy,
      imageUrl,
      brief: briefResult.brief,
      durationMs: totalDurationMs,
    };
  } catch (err) {
    // Mark study as failed
    await updateStudyServer(study.id, {
      status: 'failed',
      generation_metadata: {
        error: err instanceof Error ? err.message : 'Unknown error',
        durationMs: Date.now() - totalStart,
      },
    }).catch(() => {});

    throw err;
  }
}
