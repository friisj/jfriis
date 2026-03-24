/**
 * Cog: Benchmark & calibration seed operations — Client-side
 */

import { supabase } from '../supabase';
import type {
  CogBenchmarkRound,
  CogBenchmarkImage,
  CogBenchmarkRoundWithImages,
  CogBenchmarkConfigType,
  CogBenchmarkImageRating,
  CogCalibrationSeed,
  CogCalibrationSeedInsert,
  CogCalibrationSeedUpdate,
} from '../types/cog';

// ============================================================================
// Benchmark / Calibration Operations (Client)
// ============================================================================

/**
 * Get all benchmark rounds for a config, with images - client-side
 */
export async function getBenchmarkRoundsForConfig(
  configId: string,
  configType: CogBenchmarkConfigType,
): Promise<CogBenchmarkRoundWithImages[]> {
  const { data: rounds, error: roundsError } = await (supabase as any)
    .from('cog_benchmark_rounds')
    .select('*')
    .eq('config_id', configId)
    .eq('config_type', configType)
    .order('round_number', { ascending: false });

  if (roundsError) throw roundsError;
  if (!rounds || rounds.length === 0) return [];

  const roundIds = rounds.map((r: CogBenchmarkRound) => r.id);
  const { data: images, error: imagesError } = await (supabase as any)
    .from('cog_benchmark_images')
    .select('*')
    .in('round_id', roundIds)
    .order('image_index', { ascending: true });

  if (imagesError) throw imagesError;

  const imagesByRound = new Map<string, CogBenchmarkImage[]>();
  for (const img of (images || []) as CogBenchmarkImage[]) {
    const existing = imagesByRound.get(img.round_id) || [];
    existing.push(img);
    imagesByRound.set(img.round_id, existing);
  }

  return (rounds as CogBenchmarkRound[]).map((round) => ({
    ...round,
    images: imagesByRound.get(round.id) || [],
  }));
}

/**
 * Update a benchmark image's rating and feedback - client-side
 */
export async function updateBenchmarkImageRating(
  imageId: string,
  rating: CogBenchmarkImageRating | null,
  feedback: string | null,
): Promise<CogBenchmarkImage> {
  const { data, error } = await (supabase as any)
    .from('cog_benchmark_images')
    .update({ rating, feedback })
    .eq('id', imageId)
    .select()
    .single();

  if (error) throw error;
  return data as CogBenchmarkImage;
}

// ============================================================================
// Calibration Seed Operations (Client)
// ============================================================================

/**
 * Get all calibration seeds ordered by position - client-side
 */
export async function getCalibrationSeeds(): Promise<CogCalibrationSeed[]> {
  const { data, error } = await (supabase as any)
    .from('cog_calibration_seeds')
    .select('*')
    .order('position', { ascending: true });

  if (error) throw error;
  return data as CogCalibrationSeed[];
}

/**
 * Create a new calibration seed - client-side
 */
export async function createCalibrationSeed(input: CogCalibrationSeedInsert): Promise<CogCalibrationSeed> {
  const { data, error } = await (supabase as any)
    .from('cog_calibration_seeds')
    .insert({
      type_key: input.type_key,
      label: input.label,
      seed_subject: input.seed_subject,
      seed_image_path: input.seed_image_path || null,
      position: input.position,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogCalibrationSeed;
}

/**
 * Update a calibration seed - client-side
 */
export async function updateCalibrationSeed(id: string, updates: CogCalibrationSeedUpdate): Promise<CogCalibrationSeed> {
  const { data, error } = await (supabase as any)
    .from('cog_calibration_seeds')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogCalibrationSeed;
}

/**
 * Delete a calibration seed - client-side
 */
export async function deleteCalibrationSeed(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_calibration_seeds')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
