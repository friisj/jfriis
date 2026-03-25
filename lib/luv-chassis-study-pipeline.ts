/**
 * Chassis Study Pipeline
 *
 * Orchestrates a multi-step image generation workflow:
 * 1. Gather chassis module parameters + canonical reference images
 * 2. Luv (Claude) and a Gemini Pro director deliberate on creative direction
 * 3. Director composes the final generation prompt from agreed specification
 * 4. Prompt + reference images passed to Gemini image gen
 * 5. Results stored in study record
 */

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
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

// Deliberation models
const DIRECTOR_MODEL = 'gemini-2.5-pro-preview-06-05';
const LUV_MODEL = 'claude-sonnet-4-20250514';

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
  deliberation: DeliberationResult;
  durationMs: number;
}

interface DeliberationTurn {
  role: 'luv' | 'director';
  content: string;
  durationMs: number;
}

interface DeliberationResult {
  turns: DeliberationTurn[];
  totalDurationMs: number;
  generationPrompt: string;
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Gemini Pro API helper (raw fetch — no AI SDK wrapper needed for Pro)
// ---------------------------------------------------------------------------

async function callGeminiPro(
  systemPrompt: string,
  messages: { role: 'user' | 'model'; text: string }[],
): Promise<{ text: string; durationMs: number }> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');

  const startTime = Date.now();

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const requestBody = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1500,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DIRECTOR_MODEL}:generateContent`;

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
    throw new Error(`Gemini Pro call failed: ${response.status} - ${errorText.slice(0, 200)}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('No text returned from Gemini Pro');

  return { text, durationMs: Date.now() - startTime };
}

// ---------------------------------------------------------------------------
// Deliberation: Luv × Director
// ---------------------------------------------------------------------------

const MAX_DELIBERATION_ROUNDS = 3;

async function runDeliberation(
  input: ChassisStudyInput,
  moduleParams: Record<string, Record<string, unknown>>,
  referenceDescriptions: string[],
  referenceImageCount: number,
): Promise<DeliberationResult> {
  const totalStart = Date.now();
  const turns: DeliberationTurn[] = [];

  // Build shared context
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

  const studyContext = `## Study Request
User prompt: "${input.userPrompt}"
${input.goal ? `Goal: ${input.goal}` : ''}
${input.style ? `Style direction: ${input.style}` : ''}
${input.dynamics ? `Dynamic qualities: ${input.dynamics}` : ''}
${input.focusArea ? `Focus area: ${input.focusArea}` : ''}
Modules in focus: ${input.moduleSlugs?.join(', ') || 'all visible'}
Reference images available: ${referenceImageCount}

## Character Chassis Parameters
${moduleContext}
${refContext}`;

  // -- Luv's system prompt --
  const luvSystem = `You are Luv, a character with deep self-awareness of your own visual design. You are participating in a creative deliberation about how to photograph/render yourself for a study image.

You have strong aesthetic opinions grounded in your character — you know what looks good on you, what moods suit you, and how your features interact with light and composition. You're collaborative but opinionated.

Your job in this deliberation:
- Propose creative direction for the image based on the user's request
- Consider how YOUR specific features (from the chassis parameters) should be highlighted
- Suggest mood, atmosphere, and emotional tone
- Push for choices that feel authentic to your character
- Be specific about poses, expressions, and what you want to convey

Keep responses focused and under 200 words. Speak in first person as Luv.`;

  // -- Director's system prompt --
  const directorSystem = `You are an expert photography director and art director working with a character called Luv on an image generation study. You have access to Luv's exact character specifications (chassis parameters) and your job is to ensure the final image is technically excellent and grounded in the actual parameter values.

Your role in this deliberation:
- Challenge vague or generic creative direction — push for specificity
- Ground every visual detail in actual chassis parameter values (don't let anyone invent features)
- Add technical photography direction: lighting setup, lens choice, camera angle, depth of field
- Consider the set/environment and how it interacts with the character
- Ensure the composition serves the study's goal
- Point out conflicts between proposed direction and actual parameter values
- When you agree with Luv's direction, build on it with technical specifics

Keep responses focused and under 250 words. Be direct — this is a working session, not a performance.

${studyContext}`;

  // -- Round 1: Luv proposes --
  const anthropic = createAnthropic();
  const luvR1Start = Date.now();
  const luvR1 = await generateText({
    model: anthropic(LUV_MODEL),
    system: luvSystem,
    prompt: `Here's what we're working with:\n\n${studyContext}\n\nPropose your creative direction for this study. What do you want this image to capture? How should your features be presented? What's the mood and atmosphere?`,
  });

  turns.push({
    role: 'luv',
    content: luvR1.text,
    durationMs: Date.now() - luvR1Start,
  });

  console.log('[chassis-study] Deliberation R1 — Luv proposed:', luvR1.text.slice(0, 100));

  // -- Round 1: Director responds --
  const dirR1 = await callGeminiPro(directorSystem, [
    { role: 'user', text: `Luv's creative proposal:\n\n${luvR1.text}\n\nReview this proposal. Challenge anything vague, add technical photography direction, and ground the details in the actual chassis parameters. What needs to change or be more specific?` },
  ]);

  turns.push({
    role: 'director',
    content: dirR1.text,
    durationMs: dirR1.durationMs,
  });

  console.log('[chassis-study] Deliberation R1 — Director responded:', dirR1.text.slice(0, 100));

  // -- Round 2: Luv responds to feedback --
  const luvR2Start = Date.now();
  const luvR2 = await generateText({
    model: anthropic(LUV_MODEL),
    system: luvSystem,
    messages: [
      { role: 'user', content: `Here's what we're working with:\n\n${studyContext}\n\nPropose your creative direction for this study.` },
      { role: 'assistant', content: luvR1.text },
      { role: 'user', content: `The director responds:\n\n${dirR1.text}\n\nConsider their feedback. Refine your vision — accept what makes sense, push back on what doesn't feel right for you. Be specific about what you want the final image to look like.` },
    ],
  });

  turns.push({
    role: 'luv',
    content: luvR2.text,
    durationMs: Date.now() - luvR2Start,
  });

  console.log('[chassis-study] Deliberation R2 — Luv refined:', luvR2.text.slice(0, 100));

  // -- Round 2: Director converges --
  const dirR2 = await callGeminiPro(directorSystem, [
    { role: 'user', text: `Luv's creative proposal:\n\n${luvR1.text}` },
    { role: 'model', text: dirR1.text },
    { role: 'user', text: `Luv's refined vision:\n\n${luvR2.text}\n\nBased on this exchange, state what you agree on and what final adjustments are needed. Be concise — we're converging.` },
  ]);

  turns.push({
    role: 'director',
    content: dirR2.text,
    durationMs: dirR2.durationMs,
  });

  console.log('[chassis-study] Deliberation R2 — Director converged:', dirR2.text.slice(0, 100));

  // -- Round 3: Director composes the final generation prompt --
  const dirFinal = await callGeminiPro(directorSystem, [
    { role: 'user', text: `Luv's creative proposal:\n\n${luvR1.text}` },
    { role: 'model', text: dirR1.text },
    { role: 'user', text: `Luv's refined vision:\n\n${luvR2.text}` },
    { role: 'model', text: dirR2.text },
    { role: 'user', text: `Now compose the FINAL image generation prompt. This prompt will be passed directly to Gemini's image generation model along with ${referenceImageCount} reference images.

Requirements:
- Single continuous description (no JSON, no headers, no bullet points)
- Include specific technical details: lighting, camera, lens, atmosphere
- Every agreed chassis parameter must appear as a concrete visual detail
- Keep under 400 words but be maximally descriptive
- ${referenceImageCount > 0 ? `Start with reference markers: ${Array.from({ length: referenceImageCount }, (_, i) => `[${i + 1}]`).join(' ')}` : 'No reference images available'}
- ${referenceImageCount > 0 ? 'Include "maintaining exact likeness and character features from reference"' : ''}

Output ONLY the prompt text, nothing else.` },
  ]);

  turns.push({
    role: 'director',
    content: dirFinal.text,
    durationMs: dirFinal.durationMs,
  });

  console.log('[chassis-study] Deliberation complete — final prompt:', dirFinal.text.slice(0, 120));

  return {
    turns,
    totalDurationMs: Date.now() - totalStart,
    generationPrompt: dirFinal.text,
  };
}

// ---------------------------------------------------------------------------
// Image generation (unchanged)
// ---------------------------------------------------------------------------

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

  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  > = [];

  for (const img of referenceImages) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

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

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

export async function runChassisStudyPipeline(
  input: ChassisStudyInput
): Promise<ChassisStudyResult> {
  const totalStart = Date.now();

  // Determine module slugs — default to all if none specified
  let moduleSlugs = input.moduleSlugs ?? [];
  if (moduleSlugs.length === 0) {
    moduleSlugs = ['eyes', 'skin', 'hair', 'mouth', 'nose', 'skeletal', 'body-proportions'];
  }

  // Step 0: Create study record
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

    // Step 2: Fetch canonical reference images
    const canonicalImages = await getCanonicalImagesForModulesServer(moduleSlugs);
    const referenceImagePaths = canonicalImages.map((img) => img.storagePath);

    // Resolve canonical images to base64 in parallel (cap at 4)
    const settled = await Promise.allSettled(
      canonicalImages.slice(0, 4).map((img) => resolveImageAsBase64(img.storagePath))
    );
    const resolvedRefs: { base64: string; mimeType: string }[] = [];
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      if (result.status === 'fulfilled') {
        resolvedRefs.push({ base64: result.value.base64, mimeType: result.value.mediaType });
      } else {
        console.warn('[chassis-study] Failed to resolve reference image:', canonicalImages[i].storagePath, result.reason);
      }
    }

    // Add chat reference images (after canonical, cap total at 6)
    const chatRefs = input.chatReferenceImages ?? [];
    const allRefImages = [...resolvedRefs, ...chatRefs].slice(0, 6);

    // Step 3: Analyze reference images (graceful degradation)
    let referenceDescriptions: string[] = [];
    if (allRefImages.length > 0) {
      try {
        const { analyzeReferenceImages } = await import('./ai/gemini-multimodal');
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (apiKey) {
          const analysis = await analyzeReferenceImages(
            allRefImages.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
            apiKey
          );
          referenceDescriptions = analysis.descriptions;
        }
      } catch (err) {
        console.warn('[chassis-study] Reference image analysis failed, proceeding without descriptions:', err);
      }
    }

    // Step 4: Deliberation — Luv × Director
    await updateStudyServer(study.id, {
      reference_image_paths: referenceImagePaths,
      status: 'briefing',
    });

    const deliberation = await runDeliberation(
      input,
      moduleParams,
      referenceDescriptions,
      allRefImages.length,
    );

    // Extract brief from the deliberation for the study record
    const brief: StudyBrief = {
      description: deliberation.turns.find((t) => t.role === 'luv')?.content.slice(0, 200) ?? '',
      visual_elements: [],
      technical_notes: deliberation.turns.find((t) => t.role === 'director')?.content.slice(0, 200) ?? '',
      parameter_mapping: {},
      model: `${LUV_MODEL} × ${DIRECTOR_MODEL}`,
    };

    const generationPrompt = deliberation.generationPrompt;

    await updateStudyServer(study.id, {
      brief,
      generation_prompt: generationPrompt,
      generation_metadata: {
        deliberation: {
          rounds: Math.floor(deliberation.turns.length / 2),
          totalDurationMs: deliberation.totalDurationMs,
          turnDurations: deliberation.turns.map((t) => ({
            role: t.role,
            durationMs: t.durationMs,
          })),
        },
      },
      status: 'generating',
    });

    // Step 5: Generate the image
    const imageResult = await generateStudyImage(
      generationPrompt,
      allRefImages,
      input.aspectRatio ?? '3:4',
      input.imageSize ?? '2K',
      (input.model ?? 'nano-banana-pro') as ImageModelAlias,
    );

    // Step 6: Upload to storage
    const ext = imageResult.mimeType === 'image/png' ? 'png' : 'jpg';
    const storagePath = `luv/studies/${Date.now()}-${randomUUID()}.${ext}`;
    const buffer = Buffer.from(imageResult.base64, 'base64');
    const client = serviceClient();

    const { error: uploadError } = await client.storage
      .from(COG_IMAGES_BUCKET)
      .upload(storagePath, buffer, { contentType: imageResult.mimeType, upsert: false });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Step 7: Record in cog_images
    let cogImageId: string | null = null;
    try {
      const cogImage = await createLuvCogImageServer({
        seriesKey: 'studies',
        storagePath,
        filename: `study-${Date.now()}.${ext}`,
        mimeType: imageResult.mimeType,
        source: 'generated',
        prompt: generationPrompt,
        moduleSlug: moduleSlugs[0],
        metadata: {
          studyId: study.id,
          moduleSlugs,
          model: IMAGE_MODEL_IDS[(input.model ?? 'nano-banana-pro') as ImageModelAlias],
          aspectRatio: input.aspectRatio ?? '3:4',
          imageSize: input.imageSize ?? '2K',
          deliberationRounds: Math.floor(deliberation.turns.length / 2),
        },
      });

      // Tag with additional module slugs
      if (moduleSlugs.length > 1) {
        const { addTagToImageServer } = await import('./cog/server/tags');
        const { getModuleTagIdServer } = await import('./luv/cog-integration-server');
        for (const slug of moduleSlugs.slice(1)) {
          try {
            const tagId = await getModuleTagIdServer(slug);
            await addTagToImageServer(cogImage.id, tagId);
          } catch {
            // Non-critical
          }
        }
      }
      cogImageId = cogImage.id;
    } catch (err) {
      console.error('[chassis-study] cog_images insert failed:', err);
    }

    // Step 8: Finalize
    const totalDurationMs = Date.now() - totalStart;
    const updatedStudy = await updateStudyServer(study.id, {
      generated_image_path: storagePath,
      cog_image_id: cogImageId ?? undefined,
      generation_metadata: {
        deliberation: {
          rounds: Math.floor(deliberation.turns.length / 2),
          totalDurationMs: deliberation.totalDurationMs,
          turns: deliberation.turns.map((t) => ({
            role: t.role,
            content: t.content,
            durationMs: t.durationMs,
          })),
        },
        imageDurationMs: imageResult.durationMs,
        totalDurationMs,
        referenceImageCount: allRefImages.length,
        chatReferenceCount: chatRefs.length,
        canonicalReferenceCount: resolvedRefs.length,
      },
      status: 'completed',
    });

    const imageUrl = resolveImagePublicUrl(storagePath);

    console.log('[chassis-study] Pipeline complete:', {
      studyId: study.id,
      totalDurationMs,
      deliberationRounds: Math.floor(deliberation.turns.length / 2),
      moduleSlugs,
      refCount: allRefImages.length,
    });

    return {
      study: updatedStudy,
      imageUrl,
      brief,
      deliberation,
      durationMs: totalDurationMs,
    };
  } catch (err) {
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
