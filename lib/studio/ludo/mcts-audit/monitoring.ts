/**
 * MCTS Performance Monitoring
 *
 * Tracks MCTS performance and automatically logs to database
 * Integrates with AI players to track evaluations in real-time
 */

import { logger } from '../utils/logger';
import { FastRolloutEngine } from '../ai/mcts/rollout';
import { logMCTSEvaluation, batchLogMCTSEvaluations, logPerformanceBenchmark, isMCTSAuditEnabled } from './client';
import type { MCTSEvaluationInsert, MCTSPerformanceBenchmarkInsert } from './types';
import type { Player, Move, BoardPosition } from '../game/types';
import type { AIDifficulty } from '../ai/types';
import type { PositionComplexity } from '../ai/speed';

/**
 * Performance monitoring singleton with local caching
 */
class MCTSPerformanceMonitor {
  private rolloutEngine: FastRolloutEngine;
  private benchmarkResults: Map<string, number> = new Map(); // policy -> games/sec
  private sessionId: string | null = null;
  private userId: string | null = null;
  private gameNumber = 0;

  // In-memory cache for evaluations (batched upload at session end)
  private evaluationCache: MCTSEvaluationInsert[] = [];
  private isFlushing = false;

  // Cache size limits to prevent memory exhaustion
  private readonly MAX_CACHE_SIZE = 10000; // Max evaluations before forced flush
  private readonly FLUSH_THRESHOLD = 5000; // Proactive flush at 50% capacity

  constructor() {
    this.rolloutEngine = new FastRolloutEngine();
  }

  /**
   * Set current session context for logging
   */
  setSessionContext(sessionId: string | null, userId: string | null) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.gameNumber = 0;

    // Clear cache when starting new session
    this.evaluationCache = [];
  }

  /**
   * Increment game number (call at start of each new game)
   */
  startNewGame() {
    this.gameNumber++;
  }

  /**
   * Run startup benchmark to measure device performance
   * Returns games per second
   */
  async runStartupBenchmark(durationMs: number = 1000): Promise<number> {
    logger.info('🏃 Running MCTS startup benchmark...');

    try {
      // Benchmark with random policy
      const randomGPS = await this.rolloutEngine.benchmark(durationMs);
      this.benchmarkResults.set('random', randomGPS);

      logger.info(`✓ MCTS Benchmark: ${randomGPS} games/sec (random policy)`);

      // Log to database if enabled
      if (isMCTSAuditEnabled() && this.userId) {
        const benchmark: MCTSPerformanceBenchmarkInsert = {
          user_id: this.userId,
          duration_ms: durationMs,
          rollout_policy: 'random',
          games_simulated: this.rolloutEngine.getGamesSimulated(),
          games_per_second: randomGPS,
          device_info: this.getDeviceInfo(),
          app_version: this.getAppVersion(),
          performance_tier: this.classifyPerformance(randomGPS)
        };

        await logPerformanceBenchmark(benchmark);
      }

      return randomGPS;
    } catch (error) {
      logger.error(`Failed to run MCTS benchmark: ${error}`);
      return 0;
    }
  }

  /**
   * Log an MCTS evaluation (cached locally, batched upload later)
   */
  logEvaluation(params: {
    moveNumber: number;
    player: Player;
    difficulty: AIDifficulty;
    complexity: PositionComplexity;
    thinkingTimeBudgetMs: number;
    mctsTimeBudgetMs: number;
    rolloutCountTarget: number;
    rolloutCountActual: number;
    rolloutPolicy: 'random' | 'heuristic';
    explorationConstant: number;
    actualTimeMs: number;
    gamesPerSecond: number;
    nodesCreated: number;
    simulationsRun: number;
    selectedMove: Move;
    selectedMoveVisits?: number;
    selectedMoveWinRate?: number;
    alternativeMoves?: Array<{
      from: number;
      to: number;
      visits: number;
      winRate: number;
      score: number;
    }>;
    ruleBasedMove?: Move;
    ruleBasedScore?: number;
    exceededTimeBudget: boolean;
    fallbackToRules: boolean;
    fallbackReason?: string;
    positionHash?: string;
  }): void {
    logger.debug(`[MCTS Monitor] logEvaluation called - game ${this.gameNumber}, move ${params.moveNumber}, player ${params.player}`);

    if (!isMCTSAuditEnabled()) {
      logger.debug('[MCTS Monitor] Audit disabled, skipping log');
      return; // Audit disabled
    }

    if (!this.sessionId || !this.userId) {
      logger.warn('[MCTS Monitor] No session context set, skipping evaluation log');
      return;
    }

    logger.debug(`[MCTS Monitor] Caching evaluation - rollouts: ${params.rolloutCountActual}, games/sec: ${params.gamesPerSecond.toFixed(0)}`);

    try {
      const evaluation: MCTSEvaluationInsert = {
        session_id: this.sessionId,
        user_id: this.userId,

        // Game Context
        game_number: this.gameNumber,
        move_number: params.moveNumber,
        player: params.player === 'white' ? 'white' : 'black',
        ai_difficulty: params.difficulty,

        // Position Complexity
        is_forced_move: params.complexity.isForcedMove,
        is_opening_move: params.complexity.isOpeningMove,
        is_contact_position: params.complexity.isContactPosition,
        is_bearoff_with_contact: params.complexity.isBearOffWithContact,
        is_cube_decision: params.complexity.isCubeDecision,
        is_match_critical: params.complexity.isMatchCritical,
        move_count: params.complexity.moveCount,

        // Time Budget
        thinking_time_budget_ms: params.thinkingTimeBudgetMs,
        mcts_time_budget_ms: params.mctsTimeBudgetMs,

        // MCTS Configuration
        rollout_count_target: params.rolloutCountTarget,
        rollout_count_actual: params.rolloutCountActual,
        rollout_policy: params.rolloutPolicy,
        exploration_constant: params.explorationConstant,

        // MCTS Performance
        actual_time_ms: Math.round(params.actualTimeMs),
        games_per_second: Math.round(params.gamesPerSecond),
        nodes_created: Math.round(params.nodesCreated),
        simulations_run: Math.round(params.simulationsRun),

        // Selected Move
        selected_move_from: params.selectedMove.from,
        selected_move_to: params.selectedMove.to,
        selected_move_visits: params.selectedMoveVisits ? Math.round(params.selectedMoveVisits) : null,
        selected_move_win_rate: params.selectedMoveWinRate || null,

        // Alternative Moves
        alternative_moves: params.alternativeMoves || null,

        // Rule-based Comparison
        rule_based_move_from: params.ruleBasedMove?.from || null,
        rule_based_move_to: params.ruleBasedMove?.to || null,
        rule_based_score: params.ruleBasedScore || null,
        mcts_rule_agreement: params.ruleBasedMove
          ? params.selectedMove.from === params.ruleBasedMove.from &&
            params.selectedMove.to === params.ruleBasedMove.to
          : null,

        // Performance Flags
        exceeded_time_budget: params.exceededTimeBudget,
        fallback_to_rules: params.fallbackToRules,
        fallback_reason: params.fallbackReason || null,

        // Position Hash
        position_hash: params.positionHash || null
      };

      // Cache locally instead of immediate database write
      this.evaluationCache.push(evaluation);
      logger.debug(`[MCTS Monitor] ✓ Evaluation cached (${this.evaluationCache.length} total)`);

      // Auto-flush if cache exceeds threshold to prevent memory exhaustion
      if (this.evaluationCache.length >= this.MAX_CACHE_SIZE) {
        logger.warn(`[MCTS Monitor] Cache size limit reached (${this.MAX_CACHE_SIZE}), forcing flush`);
        // Fire-and-forget flush to prevent blocking (sync method)
        this.flushEvaluations().catch(err =>
          logger.error(`[MCTS Monitor] Forced flush failed: ${err}`)
        );
      } else if (this.evaluationCache.length >= this.FLUSH_THRESHOLD) {
        logger.info(`[MCTS Monitor] Cache threshold reached (${this.FLUSH_THRESHOLD}), proactive flush`);
        // Background flush
        this.flushEvaluations().catch(err =>
          logger.error(`[MCTS Monitor] Background flush failed: ${err}`)
        );
      }
    } catch (error) {
      logger.error(`[MCTS Monitor] Exception caching MCTS evaluation: ${error}`);
    }
  }

  /**
   * Flush cached evaluations to database
   * Call at end of session or periodically
   */
  async flushEvaluations(): Promise<{ success: boolean; count: number; error?: string }> {
    if (this.isFlushing) {
      logger.warn('[MCTS Monitor] Already flushing, skipping duplicate flush');
      return { success: false, count: 0, error: 'Already flushing' };
    }

    if (this.evaluationCache.length === 0) {
      logger.debug('[MCTS Monitor] No cached evaluations to flush');
      return { success: true, count: 0 };
    }

    this.isFlushing = true;
    const count = this.evaluationCache.length;

    try {
      logger.info(`[MCTS Monitor] 📤 Flushing ${count} cached evaluations to database...`);

      // Batch insert all cached evaluations
      const result = await this.batchInsertEvaluations(this.evaluationCache);

      if (result.success) {
        logger.info(`[MCTS Monitor] ✓ Successfully flushed ${count} evaluations`);
        this.evaluationCache = []; // Clear cache after successful upload
        return { success: true, count };
      } else {
        logger.error(`[MCTS Monitor] ✗ Failed to flush evaluations: ${result.error}`);
        return { success: false, count, error: result.error };
      }
    } catch (error) {
      logger.error(`[MCTS Monitor] Exception during flush: ${error}`);
      return { success: false, count, error: String(error) };
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Batch insert evaluations to database
   * Handles chunking for large batches
   */
  private async batchInsertEvaluations(
    evaluations: MCTSEvaluationInsert[]
  ): Promise<{ success: boolean; error?: string }> {
    if (evaluations.length === 0) {
      return { success: true };
    }

    try {
      // For very large batches, chunk into smaller batches to avoid Supabase limits
      // Supabase PostgREST has a limit of ~1000 rows per request
      const CHUNK_SIZE = 500;

      if (evaluations.length <= CHUNK_SIZE) {
        // Single batch, use direct API call
        const result = await batchLogMCTSEvaluations(evaluations);
        return result.success
          ? { success: true }
          : { success: false, error: result.error };
      }

      // Multiple chunks needed
      const chunks = [];
      for (let i = 0; i < evaluations.length; i += CHUNK_SIZE) {
        chunks.push(evaluations.slice(i, i + CHUNK_SIZE));
      }

      logger.debug(`[MCTS Monitor] Uploading ${evaluations.length} evaluations in ${chunks.length} chunk(s)`);

      // Upload all chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        logger.debug(`[MCTS Monitor] Uploading chunk ${i + 1}/${chunks.length} (${chunk.length} items)`);

        const result = await batchLogMCTSEvaluations(chunk);
        if (!result.success) {
          throw new Error(`Failed to insert chunk ${i + 1}: ${result.error}`);
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get count of cached evaluations
   */
  getCachedEvaluationCount(): number {
    return this.evaluationCache.length;
  }

  /**
   * Check if currently flushing
   */
  isCurrentlyFlushing(): boolean {
    return this.isFlushing;
  }

  /**
   * Get latest benchmark result
   */
  getLatestBenchmark(policy: 'random' | 'heuristic' = 'random'): number | null {
    return this.benchmarkResults.get(policy) || null;
  }

  /**
   * Check if MCTS should be enabled based on performance
   */
  shouldEnableMCTS(minimumGamesPerSecond: number = 5000): boolean {
    const performance = this.benchmarkResults.get('random');
    return performance !== undefined && performance >= minimumGamesPerSecond;
  }

  /**
   * Classify device performance tier
   */
  private classifyPerformance(gamesPerSecond: number): 'low' | 'medium' | 'high' | 'optimal' {
    if (gamesPerSecond < 5000) return 'low';
    if (gamesPerSecond < 10000) return 'medium';
    if (gamesPerSecond < 20000) return 'high';
    return 'optimal';
  }

  /**
   * Get device info for logging
   */
  private getDeviceInfo(): Record<string, unknown> {
    try {
      return {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
        hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : null,
        memory: typeof (navigator as unknown as {deviceMemory?: number}).deviceMemory !== 'undefined'
          ? (navigator as unknown as {deviceMemory?: number}).deviceMemory
          : null
      };
    } catch {
      return {};
    }
  }

  /**
   * Get app version
   */
  private getAppVersion(): string {
    return '0.1.0'; // TODO: Get from package.json or env
  }

  /**
   * Generate position hash from board state
   */
  generatePositionHash(board: BoardPosition[], player: Player): string {
    // Simple hash based on board state
    // For production, consider a more robust hashing algorithm
    const stateString = board
      .map(pos => `${pos.pointIndex}:${pos.checkers.map(c => `${c.player}:${c.position}`).join(',')}`)
      .join('|');

    return `${player}:${this.simpleHash(stateString)}`;
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Global performance monitor instance
 */
export const mctsMonitor = new MCTSPerformanceMonitor();

/**
 * Initialize MCTS monitoring at app startup
 */
export async function initializeMCTSMonitoring(
  userId?: string | null,
  runBenchmark: boolean = true
): Promise<{ enabled: boolean; gamesPerSecond?: number }> {
  try {
    mctsMonitor.setSessionContext(null, userId || null);

    if (runBenchmark) {
      const gamesPerSecond = await mctsMonitor.runStartupBenchmark();
      const enabled = mctsMonitor.shouldEnableMCTS();

      if (!enabled) {
        logger.warn(
          `⚠️  MCTS disabled: performance ${gamesPerSecond} < 5000 games/sec required`
        );
      }

      return { enabled, gamesPerSecond };
    }

    return { enabled: isMCTSAuditEnabled() };
  } catch (error) {
    logger.error(`Failed to initialize MCTS monitoring: ${error}`);
    return { enabled: false };
  }
}
