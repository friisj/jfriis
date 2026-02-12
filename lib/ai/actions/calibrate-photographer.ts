'use server';

import { generateText } from 'ai';
import { getModel } from '../models';
import { generateImageWithGemini3Pro } from '../gemini-multimodal';
import { createClient } from '@/lib/supabase-server';
import {
  getPhotographerConfigByIdServer,
  getBenchmarkRoundsForConfigServer,
  createBenchmarkRoundServer,
  createBenchmarkImageServer,
  updateBenchmarkRoundStatusServer,
} from '@/lib/cog-server';
import {
  SEED_CONFIGS,
  buildDistillationPrompt,
  buildRefinementPrompt,
} from '../prompts/calibration';
import type { CogPhotographerType } from '@/lib/types/cog';

// ============================================================================
// distillPhotographer
// ============================================================================

export async function distillPhotographer(configId: string): Promise<{ distilledPrompt: string }> {
  const config = await getPhotographerConfigByIdServer(configId);

  const result = await generateText({
    model: getModel('gemini-flash'),
    prompt: buildDistillationPrompt(config),
  });

  return { distilledPrompt: result.text.trim() };
}

// ============================================================================
// runBenchmarkRound
// ============================================================================

export async function runBenchmarkRound(input: {
  configId: string;
  distilledPrompt: string;
  roundNumber: number;
}): Promise<{ roundId: string; images: Array<{ id: string; storagePath: string }> }> {
  const config = await getPhotographerConfigByIdServer(input.configId);

  if (!config.type) {
    throw new Error('Photographer config must have a type set to run benchmarks');
  }

  const seed = SEED_CONFIGS[config.type as CogPhotographerType];
  const fullPrompt = `${input.distilledPrompt}\n\nSubject: ${seed.subject}`;

  // Create round record
  const round = await createBenchmarkRoundServer({
    config_type: 'photographer',
    config_id: input.configId,
    round_number: input.roundNumber,
    distilled_prompt: input.distilledPrompt,
  });

  const supabase = await createClient();

  // Try to download the seed image for I2I reference
  let referenceImages: Array<{ base64: string; mimeType: string; subjectDescription?: string }> | undefined;
  const { data: seedImageData } = await supabase.storage
    .from('cog-images')
    .download(seed.imagePath);

  if (seedImageData) {
    const arrayBuffer = await seedImageData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = seedImageData.type || 'image/jpeg';
    referenceImages = [{ base64, mimeType, subjectDescription: seed.subject }];
  }

  // Generate 3 benchmark images (I2I if seed image exists, text-only fallback)
  const images: Array<{ id: string; storagePath: string }> = [];

  for (let i = 0; i < 3; i++) {
    const generated = await generateImageWithGemini3Pro({
      prompt: fullPrompt,
      referenceImages,
      aspectRatio: '1:1',
      imageSize: '1K',
    });

    const filename = `benchmark-${input.configId}-${input.roundNumber}-${i}-${Date.now()}.png`;
    const storagePath = `benchmarks/${input.configId}/${filename}`;
    const imageData = Buffer.from(generated.base64, 'base64');

    const { error: uploadError } = await supabase.storage
      .from('cog-images')
      .upload(storagePath, imageData, { contentType: generated.mimeType || 'image/png' });

    if (uploadError) throw uploadError;

    const benchmarkImage = await createBenchmarkImageServer({
      round_id: round.id,
      image_index: i,
      storage_path: storagePath,
    });

    images.push({ id: benchmarkImage.id, storagePath });
  }

  return { roundId: round.id, images };
}

// ============================================================================
// refineDistilledPrompt
// ============================================================================

export async function refineDistilledPrompt(input: {
  configId: string;
  roundId: string;
  feedback?: string;
}): Promise<{ refinedPrompt: string }> {
  const config = await getPhotographerConfigByIdServer(input.configId);

  // Get the round with images
  const rounds = await getBenchmarkRoundsForConfigServer(input.configId, 'photographer');
  const round = rounds.find(r => r.id === input.roundId);
  if (!round) throw new Error('Benchmark round not found');

  // Mark current round as superseded
  await updateBenchmarkRoundStatusServer(input.roundId, 'superseded');

  const result = await generateText({
    model: getModel('gemini-flash'),
    prompt: buildRefinementPrompt(config, round.distilled_prompt, round.images),
  });

  return { refinedPrompt: result.text.trim() };
}

// ============================================================================
// approveBenchmarkRound
// ============================================================================

export async function approveBenchmarkRound(input: {
  configId: string;
  roundId: string;
}): Promise<void> {
  // Get all rounds for this config
  const rounds = await getBenchmarkRoundsForConfigServer(input.configId, 'photographer');

  // Mark approved round and supersede all others
  for (const round of rounds) {
    if (round.id === input.roundId) {
      await updateBenchmarkRoundStatusServer(round.id, 'approved');
    } else if (round.status === 'active') {
      await updateBenchmarkRoundStatusServer(round.id, 'superseded');
    }
  }

  // Get the approved round's distilled prompt
  const approvedRound = rounds.find(r => r.id === input.roundId);
  if (!approvedRound) throw new Error('Round not found');

  // Write distilled_prompt back to config
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from('cog_photographer_configs')
    .update({ distilled_prompt: approvedRound.distilled_prompt })
    .eq('id', input.configId);

  if (error) throw error;
}
