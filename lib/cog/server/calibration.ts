import { createClient } from '../../supabase-server';
import type {
  CogBenchmarkRound,
  CogBenchmarkImage,
  CogBenchmarkRoundWithImages,
  CogBenchmarkConfigType,
  CogBenchmarkRoundStatus,
  CogBenchmarkImageRating,
  CogCalibrationSeed,
} from '../../types/cog';

// ============================================================================
// Benchmark / Calibration Operations (Server)
// ============================================================================

/**
 * Get all benchmark rounds for a config, with images, ordered by round_number desc
 */
export async function getBenchmarkRoundsForConfigServer(
  configId: string,
  configType: CogBenchmarkConfigType,
): Promise<CogBenchmarkRoundWithImages[]> {
  const client = await createClient();

  const { data: rounds, error: roundsError } = await (client as any)
    .from('cog_benchmark_rounds')
    .select('*')
    .eq('config_id', configId)
    .eq('config_type', configType)
    .order('round_number', { ascending: false });

  if (roundsError) throw roundsError;
  if (!rounds || rounds.length === 0) return [];

  const roundIds = rounds.map((r: CogBenchmarkRound) => r.id);
  const { data: images, error: imagesError } = await (client as any)
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
 * Create a benchmark round - server-side
 */
export async function createBenchmarkRoundServer(input: {
  config_type: CogBenchmarkConfigType;
  config_id: string;
  round_number: number;
  distilled_prompt: string;
}): Promise<CogBenchmarkRound> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_benchmark_rounds')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CogBenchmarkRound;
}

/**
 * Create a benchmark image - server-side
 */
export async function createBenchmarkImageServer(input: {
  round_id: string;
  image_index: number;
  storage_path: string;
}): Promise<CogBenchmarkImage> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_benchmark_images')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CogBenchmarkImage;
}

/**
 * Update a benchmark round's status - server-side
 */
export async function updateBenchmarkRoundStatusServer(
  roundId: string,
  status: CogBenchmarkRoundStatus,
): Promise<CogBenchmarkRound> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_benchmark_rounds')
    .update({ status })
    .eq('id', roundId)
    .select()
    .single();

  if (error) throw error;
  return data as CogBenchmarkRound;
}

/**
 * Update a benchmark image's rating and feedback - server-side
 */
export async function updateBenchmarkImageRatingServer(
  imageId: string,
  rating: CogBenchmarkImageRating | null,
  feedback: string | null,
): Promise<CogBenchmarkImage> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_benchmark_images')
    .update({ rating, feedback })
    .eq('id', imageId)
    .select()
    .single();

  if (error) throw error;
  return data as CogBenchmarkImage;
}

// ============================================================================
// Calibration Seed Operations (Server)
// ============================================================================

/**
 * Get a calibration seed by type_key - server-side
 */
export async function getCalibrationSeedByTypeServer(typeKey: string): Promise<CogCalibrationSeed | null> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_calibration_seeds')
    .select('*')
    .eq('type_key', typeKey)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as CogCalibrationSeed;
}
