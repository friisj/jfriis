// @ts-nocheck
/**
 * MCTS Analytics Client
 *
 * Client for logging MCTS evaluations and performance data to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import type {
  MCTSEvaluationInsert,
  MCTSPerformanceBenchmarkInsert,
  MCTSPositionInsert,
  MCTSTrainingSessionInsert,
  MCTSEvaluation,
  MCTSPerformanceBenchmark,
  MCTSPosition,
  MCTSTrainingSession,
  MCTSPerformanceByDifficulty,
  MCTSPerformanceByComplexity,
  MCTSRecentPerformance
} from './types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  logger.info('[MCTS Audit] Supabase client initialized');
} else {
  logger.warn('[MCTS Audit] Supabase credentials missing - audit features disabled');
}

/**
 * Log an MCTS evaluation to the database
 */
export async function logMCTSEvaluation(
  evaluation: MCTSEvaluationInsert
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Skipping evaluation log - Supabase not initialized');
    return { success: false, error: 'Supabase not initialized' };
  }

  try {
    const { error } = await supabase
      .from('mcts_evaluations')
      .insert(evaluation);

    if (error) {
      logger.error(`[MCTS Audit] Failed to log evaluation: ${error.message}`);
      return { success: false, error: error.message };
    }

    logger.debug('[MCTS Audit] Evaluation logged successfully');
    return { success: true };
  } catch (error) {
    logger.error(`[MCTS Audit] Exception logging evaluation: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Batch insert MCTS evaluations to the database
 * More efficient than individual inserts for large batches
 */
export async function batchLogMCTSEvaluations(
  evaluations: MCTSEvaluationInsert[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Skipping batch evaluation log - Supabase not initialized');
    return { success: false, count: 0, error: 'Supabase not initialized' };
  }

  if (evaluations.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    logger.debug(`[MCTS Audit] Batch inserting ${evaluations.length} evaluations...`);

    const { error } = await supabase
      .from('mcts_evaluations')
      .insert(evaluations);

    if (error) {
      logger.error(`[MCTS Audit] Failed to batch log evaluations: ${error.message}`);
      return { success: false, count: 0, error: error.message };
    }

    logger.info(`[MCTS Audit] ✓ Batch logged ${evaluations.length} evaluations successfully`);
    return { success: true, count: evaluations.length };
  } catch (error) {
    logger.error(`[MCTS Audit] Exception batch logging evaluations: ${error}`);
    return { success: false, count: 0, error: String(error) };
  }
}

/**
 * Log a performance benchmark to the database
 */
export async function logPerformanceBenchmark(
  benchmark: MCTSPerformanceBenchmarkInsert
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Skipping benchmark log - Supabase not initialized');
    return { success: false, error: 'Supabase not initialized' };
  }

  try {
    const { error } = await supabase
      .from('mcts_performance_benchmarks')
      .insert(benchmark);

    if (error) {
      logger.error(`[MCTS Audit] Failed to log benchmark: ${error.message}`);
      return { success: false, error: error.message };
    }

    logger.info('[MCTS Audit] Benchmark logged successfully');
    return { success: true };
  } catch (error) {
    logger.error(`[MCTS Audit] Exception logging benchmark: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Save a position to the position library
 */
export async function savePosition(
  position: MCTSPositionInsert
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Skipping position save - Supabase not initialized');
    return { success: false, error: 'Supabase not initialized' };
  }

  try {
    const { data, error } = await supabase
      .from('mcts_position_library')
      .insert(position)
      .select('id')
      .single();

    if (error) {
      logger.error(`[MCTS Audit] Failed to save position: ${error.message}`);
      return { success: false, error: error.message };
    }

    logger.info(`[MCTS Audit] Position saved with ID: ${data.id}`);
    return { success: true, id: data.id };
  } catch (error) {
    logger.error(`[MCTS Audit] Exception saving position: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Get all MCTS evaluations for a session
 */
export async function getSessionEvaluations(
  sessionId: string
): Promise<MCTSEvaluation[]> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Supabase not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('mcts_evaluations')
      .select('*')
      .eq('session_id', sessionId)
      .order('move_number', { ascending: true });

    if (error) {
      logger.error(`[MCTS Audit] Failed to fetch evaluations: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error(`[MCTS Audit] Exception fetching evaluations: ${error}`);
    return [];
  }
}

/**
 * Get recent performance benchmarks
 */
export async function getRecentBenchmarks(
  limit: number = 10
): Promise<MCTSPerformanceBenchmark[]> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Supabase not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('mcts_performance_benchmarks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table doesn't exist yet - migration not run
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        logger.debug('[MCTS Audit] MCTS tables not yet created - run migration 012');
        return [];
      }
      logger.error(`[MCTS Audit] Failed to fetch benchmarks: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error(`[MCTS Audit] Exception fetching benchmarks: ${error}`);
    return [];
  }
}

/**
 * Get positions from the library
 */
export async function getPositions(
  filters?: {
    category?: string;
    tags?: string[];
    limit?: number;
  }
): Promise<MCTSPosition[]> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Supabase not initialized');
    return [];
  }

  try {
    let query = supabase
      .from('mcts_position_library')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error(`[MCTS Audit] Failed to fetch positions: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error(`[MCTS Audit] Exception fetching positions: ${error}`);
    return [];
  }
}

/**
 * Get MCTS performance statistics by difficulty
 */
export async function getPerformanceByDifficulty(): Promise<MCTSPerformanceByDifficulty[]> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Supabase not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('mcts_performance_by_difficulty')
      .select('*')
      .order('ai_difficulty', { ascending: true });

    if (error) {
      // Table doesn't exist yet - migration not run
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        logger.debug('[MCTS Audit] MCTS tables not yet created - run migration 012');
        return [];
      }
      logger.error(`[MCTS Audit] Failed to fetch performance by difficulty: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error(`[MCTS Audit] Exception fetching performance by difficulty: ${error}`);
    return [];
  }
}

/**
 * Get MCTS performance statistics by position complexity
 */
export async function getPerformanceByComplexity(): Promise<MCTSPerformanceByComplexity[]> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Supabase not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('mcts_performance_by_complexity')
      .select('*');

    if (error) {
      // Table doesn't exist yet - migration not run
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        logger.debug('[MCTS Audit] MCTS tables not yet created - run migration 012');
        return [];
      }
      logger.error(`[MCTS Audit] Failed to fetch performance by complexity: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error(`[MCTS Audit] Exception fetching performance by complexity: ${error}`);
    return [];
  }
}

/**
 * Get recent MCTS performance trends
 */
export async function getRecentPerformanceTrends(
  hours: number = 24
): Promise<MCTSRecentPerformance[]> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Supabase not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('mcts_recent_performance')
      .select('*')
      .order('time_bucket', { ascending: false })
      .limit(hours);

    if (error) {
      // Table doesn't exist yet - migration not run
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        logger.debug('[MCTS Audit] MCTS tables not yet created - run migration 012');
        return [];
      }
      logger.error(`[MCTS Audit] Failed to fetch recent performance: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error(`[MCTS Audit] Exception fetching recent performance: ${error}`);
    return [];
  }
}

/**
 * Create a new training session
 */
export async function createTrainingSession(
  session: MCTSTrainingSessionInsert
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Skipping training session creation - Supabase not initialized');
    return { success: false, error: 'Supabase not initialized' };
  }

  try {
    const { data, error } = await supabase
      .from('mcts_training_sessions')
      .insert(session)
      .select('id')
      .single();

    if (error) {
      logger.error(`[MCTS Audit] Failed to create training session: ${error.message}`);
      return { success: false, error: error.message };
    }

    logger.info(`[MCTS Audit] Training session created with ID: ${data.id}`);
    return { success: true, id: data.id };
  } catch (error) {
    logger.error(`[MCTS Audit] Exception creating training session: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Update a training session
 */
export async function updateTrainingSession(
  id: string,
  updates: Partial<MCTSTrainingSession>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    logger.warn('[MCTS Audit] Skipping training session update - Supabase not initialized');
    return { success: false, error: 'Supabase not initialized' };
  }

  try {
    const { error } = await supabase
      .from('mcts_training_sessions')
      .update(updates)
      .eq('id', id);

    if (error) {
      logger.error(`[MCTS Audit] Failed to update training session: ${error.message}`);
      return { success: false, error: error.message };
    }

    logger.info(`[MCTS Audit] Training session updated: ${id}`);
    return { success: true };
  } catch (error) {
    logger.error(`[MCTS Audit] Exception updating training session: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if MCTS audit system is enabled
 */
export function isMCTSAuditEnabled(): boolean {
  return supabase !== null;
}
