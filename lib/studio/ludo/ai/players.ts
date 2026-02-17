import { AIPlayer, AIDifficulty, AIPersonality, AISettings, MoveEvaluation } from './types';
import { BoardPosition, Player, Move } from '../game/types';
import { PositionEvaluator } from './evaluation';
import { logger } from '../utils/logger';
import { copyBoard } from '../utils/deepCopy';
import { getOpeningMove, convertBookMoveToActual } from './opening-book';
import { analyzePositionComplexity, calculateAIThinkingTime } from './speed';
import { MCTSEvaluator } from './mcts/core';
import { AdaptiveMCTSEvaluator } from './mcts/adaptive';
import { mctsMonitor } from '../mcts-audit/monitoring';

export abstract class BaseAIPlayer implements AIPlayer {
  constructor(public readonly settings: AISettings) {}

  abstract evaluatePosition(
    board: BoardPosition[], 
    player: Player,
    dice: number[],
    availableMoves: Move[]
  ): Promise<Move>;

  getName(): string {
    return this.settings.name;
  }

  getDifficulty(): AIDifficulty {
    return this.settings.difficulty;
  }

  getPersonality(): AIPersonality {
    return this.settings.personality;
  }

  protected async simulateThinking(): Promise<void> {
    const { thinkingTimeMin, thinkingTimeMax } = this.settings;
    const thinkTime = Math.random() * (thinkingTimeMax - thinkingTimeMin) + thinkingTimeMin;
    return new Promise(resolve => setTimeout(resolve, thinkTime));
  }

  protected evaluateAllMoves(
    board: BoardPosition[],
    player: Player,
    availableMoves: Move[],
    personality?: AIPersonality
  ): MoveEvaluation[] {
    return availableMoves.map(move => {
      const score = PositionEvaluator.evaluateMove(board, move, player, personality);
      const reasoning = this.generateReasoning(move, board, player);

      // Debug: log bear-off moves specifically
      if (move.to === 25) {
        logger.debug(`Bear-off move evaluated: ${move.checkerId} from ${move.from}, score: ${score}, reasoning: ${reasoning}`);
      }

      return {
        move,
        score,
        reasoning
      };
    });
  }

  protected generateReasoning(move: Move, board: BoardPosition[], player: Player): string {
    const distance = move.distance;
    const isHit = this.isHittingMove(move, board);
    const isSafe = this.isSafeMove(move, board, player);
    const isBearOff = move.to === 25;
    
    if (isBearOff) return `Bear off checker`;
    if (isHit) return `Hit opponent checker`;
    if (isSafe) return `Move to safe position`;
    if (distance >= 5) return `Advance checker significantly`;
    return `Standard positional move`;
  }

  protected isHittingMove(move: Move, board: BoardPosition[]): boolean {
    const toPosition = board.find(pos => pos.pointIndex === move.to);
    return toPosition?.checkers.length === 1 &&
           toPosition?.checkers[0]?.id !== move.checkerId;
  }

  protected isSafeMove(move: Move, board: BoardPosition[], player: Player): boolean {
    const toPosition = board.find(pos => pos.pointIndex === move.to);
    return (toPosition?.checkers.length ?? 0) >= 1 &&
           toPosition?.checkers[0]?.player === player;
  }

  /**
   * Check for opening book move (for Easy+ difficulty)
   * @param variationRate Probability of NOT using book move (adds unpredictability)
   */
  protected checkOpeningBook(
    board: BoardPosition[],
    player: Player,
    dice: number[],
    availableMoves: Move[],
    turnCount: number = 0,
    variationRate: number = 0.0
  ): Move | null {
    // Only use opening book on first move of game
    if (turnCount > 1) return null;

    // Apply variation rate - sometimes deviate from book
    if (Math.random() < variationRate) {
      logger.debug(`Skipping opening book due to variation (rate: ${variationRate})`);
      return null;
    }

    const openingMove = getOpeningMove(dice);
    if (!openingMove) return null;

    // Try to find the opening book move in available moves
    const getCheckerId = (position: number) => {
      const pos = board.find(p => p.pointIndex === position);
      const checker = pos?.checkers.find(c => c.player === player);
      return checker?.id || null;
    };

    const bookMoves = convertBookMoveToActual(openingMove, player, getCheckerId);
    if (!bookMoves) return null;

    // Find the first book move that exists in available moves
    for (const bookMove of bookMoves) {
      const match = availableMoves.find(m =>
        m.from === bookMove.from && m.to === bookMove.to
      );
      if (match) {
        logger.info(`Using opening book: ${openingMove.strategy}`);
        return match;
      }
    }

    return null;
  }
}

export class BeginnerAI extends BaseAIPlayer {
  async evaluatePosition(
    board: BoardPosition[],
    player: Player,
    dice: number[],
    availableMoves: Move[]
  ): Promise<Move> {
    // Thinking time is now handled by the speed variation system in state.ts

    // Beginner: Forward movement bias with hitting preference
    // Phase 2.2 Priority 6: Beginners focus on moving checkers toward home
    const evaluations = this.evaluateAllMoves(board, player, availableMoves);

    // 30% chance to pick a hitting move if available (beginners like hitting)
    const hittingMoves = evaluations.filter(evaluation =>
      evaluation.reasoning?.includes('Hit opponent'));

    if (hittingMoves.length > 0 && Math.random() < 0.3) {
      return hittingMoves[Math.floor(Math.random() * hittingMoves.length)].move;
    }

    // Strong preference for bearing off (obvious winning move)
    const bearOffMoves = availableMoves.filter(move => move.to === 25);
    if (bearOffMoves.length > 0 && Math.random() < 0.8) {
      return bearOffMoves[Math.floor(Math.random() * bearOffMoves.length)];
    }

    // Otherwise prefer forward movement (moving toward home)
    // Calculate forward distance for each move based on player direction
    const movesWithForwardScore = availableMoves.map(move => {
      // WHITE moves 0 → 24 (increasing), BLACK moves 23 → 0 (decreasing)
      const forwardDistance = player === Player.WHITE
        ? move.to - move.from  // WHITE: higher numbers = forward
        : move.from - move.to; // BLACK: lower numbers = forward

      // Add small random factor for variety (±3)
      const randomFactor = (Math.random() - 0.5) * 6;

      return {
        move,
        score: forwardDistance + randomFactor
      };
    });

    // Sort by forward score (prefer moves that advance most)
    movesWithForwardScore.sort((a, b) => b.score - a.score);

    // 70% chance to pick from top 3 forward moves, 30% random
    if (Math.random() < 0.7 && movesWithForwardScore.length >= 3) {
      const topForwardMoves = movesWithForwardScore.slice(0, 3);
      return topForwardMoves[Math.floor(Math.random() * topForwardMoves.length)].move;
    }

    // Fallback to random move
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }
}

export class EasyAI extends BaseAIPlayer {
  async evaluatePosition(
    board: BoardPosition[],
    player: Player,
    dice: number[],
    availableMoves: Move[]
  ): Promise<Move> {
    // Thinking time is now handled by the speed variation system in state.ts

    // Check opening book with 20% variation (exploratory)
    const openingMove = this.checkOpeningBook(board, player, dice, availableMoves, 0, 0.20);
    if (openingMove) return openingMove;

    // Easy: Basic evaluation with some randomness
    const evaluations = this.evaluateAllMoves(board, player, availableMoves);

    // Apply modest bear-off bonus to encourage winning
    evaluations.forEach(evaluation => {
      if (evaluation.move.to === 25) {
        evaluation.score += 20.0;
      }
    });

    evaluations.sort((a, b) => b.score - a.score);

    // 75% chance to pick from top 3 moves, 25% random (improved from 70/30)
    if (Math.random() < 0.75) {
      const topMoves = evaluations.slice(0, Math.min(3, evaluations.length));
      return topMoves[Math.floor(Math.random() * topMoves.length)].move;
    }

    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }
}

export class MediumAI extends BaseAIPlayer {
  async evaluatePosition(
    board: BoardPosition[],
    player: Player,
    dice: number[],
    availableMoves: Move[]
  ): Promise<Move> {
    // Thinking time is now handled by the speed variation system in state.ts

    // Check opening book with 10% variation (mostly consistent)
    const openingMove = this.checkOpeningBook(board, player, dice, availableMoves, 0, 0.10);
    if (openingMove) return openingMove;

    // Medium: Good evaluation with personality influence
    const evaluations = this.evaluateAllMoves(board, player, availableMoves, this.settings.personality);
    evaluations.sort((a, b) => b.score - a.score);

    // 90% chance to pick from top 2 moves (improved from 85%)
    if (Math.random() < 0.90) {
      const topMoves = evaluations.slice(0, Math.min(2, evaluations.length));
      return topMoves[Math.floor(Math.random() * topMoves.length)].move;
    }

    return evaluations[0].move;
  }
}

export class HardAI extends BaseAIPlayer {
  private mcts: MCTSEvaluator;
  private adaptiveMCTS: AdaptiveMCTSEvaluator;
  private turnNumber = 0;

  constructor(settings: AISettings) {
    super(settings);
    this.mcts = new MCTSEvaluator();
    this.adaptiveMCTS = new AdaptiveMCTSEvaluator();
  }

  async evaluatePosition(
    board: BoardPosition[],
    player: Player,
    dice: number[],
    availableMoves: Move[]
  ): Promise<Move> {
    this.turnNumber++;

    // 1. Analyze position complexity
    const complexity = analyzePositionComplexity(
      board,
      player,
      availableMoves,
      this.turnNumber,
      false, // TODO: Get from game state
      false  // TODO: Get from match state
    );

    // 2. Calculate thinking time from Phase 2.9 system
    const thinkingTimeMs = calculateAIThinkingTime(AIDifficulty.HARD, complexity);

    // 3. Check opening book with 5% variation (very consistent)
    const openingMove = this.checkOpeningBook(board, player, dice, availableMoves, this.turnNumber, 0.05);
    if (openingMove) {
      // Still need to delay for UX
      await new Promise(resolve => setTimeout(resolve, thinkingTimeMs));
      return openingMove;
    }

    const startTime = performance.now();

    // 4. Calculate MCTS rollout count based on time budget
    const rolloutCount = this.adaptiveMCTS.calculateRolloutCount(
      AIDifficulty.HARD,
      complexity,
      thinkingTimeMs
    );

    let selectedMove: Move;

    if (rolloutCount === 0) {
      // Use pure rule-based evaluation (forced move or opening)
      const evaluations = await this.deepEvaluateMovesAsync(board, player, availableMoves);
      evaluations.sort((a, b) => b.score - a.score);

      // 97% chance to pick best move, 3% second best
      selectedMove = Math.random() < 0.97 || evaluations.length === 1
        ? evaluations[0].move
        : evaluations[1].move;
    } else {
      // Use hybrid MCTS + rules evaluation
      try {
        // Get MCTS evaluation with time limit
        const mctsTimeMs = Math.floor(thinkingTimeMs * 0.8);
        const mctsConfig = this.adaptiveMCTS.createMCTSConfig(rolloutCount, mctsTimeMs);

        // FIRST: Compute rule-based move for comparison
        const ruleBasedEvaluations = await this.deepEvaluateMovesAsync(board, player, availableMoves);
        ruleBasedEvaluations.sort((a, b) => b.score - a.score);
        const ruleBasedMove = ruleBasedEvaluations[0].move;
        const ruleBasedScore = ruleBasedEvaluations[0].score;

        // THEN: Evaluate with MCTS
        selectedMove = await this.mcts.selectMove(board, player, availableMoves, mctsConfig);

        // Track performance
        const actualTime = performance.now() - startTime;
        const gamesPerSecond = Math.floor((rolloutCount / actualTime) * 1000);
        this.adaptiveMCTS.updatePerformance(gamesPerSecond);

        logger.debug(
          `🧠 HardAI MCTS: rollouts=${rolloutCount}, ` +
          `time=${Math.round(actualTime)}ms, ` +
          `speed=${gamesPerSecond} games/sec`
        );

        // Extract move statistics from MCTS tree
        const mctsStats = this.mcts.getStats();
        const selectedMoveStats = this.mcts.getSelectedMoveStats();
        const allMoveStats = this.mcts.getMoveStatistics(5); // Top 5 alternative moves

        // Format alternative moves for database
        const alternativeMoves = allMoveStats.slice(1, 5).map(stat => ({
          from: stat.move.from,
          to: stat.move.to,
          visits: stat.visits,
          winRate: stat.winRate,
          score: stat.score
        }));

        // Log MCTS evaluation (cached locally, no await - fire and forget)
        mctsMonitor.logEvaluation({
          moveNumber: this.turnNumber,
          player,
          difficulty: AIDifficulty.HARD,
          complexity,
          thinkingTimeBudgetMs: thinkingTimeMs,
          mctsTimeBudgetMs: mctsTimeMs,
          rolloutCountTarget: rolloutCount,
          rolloutCountActual: mctsStats.simulationsRun,
          rolloutPolicy: mctsConfig.rolloutPolicy || 'heuristic',
          explorationConstant: mctsConfig.explorationConstant || Math.sqrt(2),
          actualTimeMs: actualTime,
          gamesPerSecond,
          nodesCreated: mctsStats.nodesCreated,
          simulationsRun: mctsStats.simulationsRun,
          selectedMove,
          selectedMoveVisits: selectedMoveStats?.visits,
          selectedMoveWinRate: selectedMoveStats?.winRate,
          alternativeMoves,
          ruleBasedMove,
          ruleBasedScore,
          exceededTimeBudget: actualTime > mctsTimeMs,
          fallbackToRules: false
        });
      } catch (error) {
        // Fallback to rule-based if MCTS fails
        logger.warn(`HardAI MCTS failed, falling back to rules: ${error}`);
        const evaluations = await this.deepEvaluateMovesAsync(board, player, availableMoves);
        evaluations.sort((a, b) => b.score - a.score);
        selectedMove = evaluations[0].move;

        // Log fallback to rules (cached locally, no await)
        const actualTime = performance.now() - startTime;
        mctsMonitor.logEvaluation({
          moveNumber: this.turnNumber,
          player,
          difficulty: AIDifficulty.HARD,
          complexity,
          thinkingTimeBudgetMs: thinkingTimeMs,
          mctsTimeBudgetMs: Math.floor(thinkingTimeMs * 0.8),
          rolloutCountTarget: rolloutCount,
          rolloutCountActual: 0,
          rolloutPolicy: 'heuristic',
          explorationConstant: Math.sqrt(2),
          actualTimeMs: actualTime,
          gamesPerSecond: 0,
          nodesCreated: 0,
          simulationsRun: 0,
          selectedMove,
          exceededTimeBudget: false,
          fallbackToRules: true,
          fallbackReason: String(error)
        });
      }
    }

    const actualComputeTime = performance.now() - startTime;

    // 5. Add artificial delay to match Phase 2.9 thinking time
    const remainingDelay = Math.max(0, thinkingTimeMs - actualComputeTime);
    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }

    return selectedMove;
  }

  private async deepEvaluateMovesAsync(
    board: BoardPosition[],
    player: Player,
    availableMoves: Move[]
  ): Promise<MoveEvaluation[]> {
    // Simulate one move ahead for better evaluation using personality weights
    return availableMoves.map(move => {
      const newBoard = this.simulateMove(board, move);
      let baseScore = PositionEvaluator.evaluateMove(board, move, player, this.settings.personality);
      const positionScore = PositionEvaluator.evaluatePosition(newBoard, player, this.settings.personality).score;

      // Add explicit bonus for bear-off moves to ensure they're prioritized
      if (move.to === 25) {
        baseScore += 50.0;
      }

      return {
        move,
        score: baseScore + positionScore * 0.3, // Weight position evaluation
        reasoning: this.generateAdvancedReasoning(move, board, newBoard, player)
      };
    });
  }

  private simulateMove(board: BoardPosition[], move: Move): BoardPosition[] {
    // Apply the move to a copy of the board
    const newBoard = copyBoard(board);
    const fromPosition = newBoard.find(pos => pos.pointIndex === move.from);
    const toPosition = newBoard.find(pos => pos.pointIndex === move.to);

    if (!fromPosition || !toPosition) return newBoard;

    const checkerIndex = fromPosition.checkers.findIndex(c => c.id === move.checkerId);
    if (checkerIndex === -1) return newBoard;

    const checker = fromPosition.checkers.splice(checkerIndex, 1)[0];
    checker.position = move.to;
    toPosition.checkers.push(checker);

    return newBoard;
  }

  private generateAdvancedReasoning(
    move: Move,
    board: BoardPosition[],
    newBoard: BoardPosition[],
    player: Player
  ): string {
    const pipBefore = PositionEvaluator.evaluatePosition(board, player, this.settings.personality).factors.pipCount;
    const pipAfter = PositionEvaluator.evaluatePosition(newBoard, player, this.settings.personality).factors.pipCount;

    if (pipAfter > pipBefore) return `Improves position significantly`;
    if (this.isHittingMove(move, board)) return `Strategic hit`;
    return `Positional improvement`;
  }
}

export class ExpertAI extends BaseAIPlayer {
  private mcts: MCTSEvaluator;
  private adaptiveMCTS: AdaptiveMCTSEvaluator;
  private turnNumber = 0;

  constructor(settings: AISettings) {
    super(settings);
    this.mcts = new MCTSEvaluator();
    this.adaptiveMCTS = new AdaptiveMCTSEvaluator();
  }

  async evaluatePosition(
    board: BoardPosition[],
    player: Player,
    dice: number[],
    availableMoves: Move[]
  ): Promise<Move> {
    this.turnNumber++;

    logger.debug(`[ExpertAI] evaluatePosition called - turn ${this.turnNumber}, player ${player}, ${availableMoves.length} moves`);

    // 1. Analyze position complexity
    const complexity = analyzePositionComplexity(
      board,
      player,
      availableMoves,
      this.turnNumber,
      false, // TODO: Get from game state
      false  // TODO: Get from match state
    );

    // 2. Calculate thinking time from Phase 2.9 system
    const thinkingTimeMs = calculateAIThinkingTime(AIDifficulty.EXPERT, complexity);

    // 3. Check opening book with 2% variation (nearly perfect)
    const openingMove = this.checkOpeningBook(board, player, dice, availableMoves, this.turnNumber, 0.02);
    if (openingMove) {
      // Still need to delay for UX
      await new Promise(resolve => setTimeout(resolve, thinkingTimeMs));
      return openingMove;
    }

    const startTime = performance.now();

    // 4. Calculate MCTS rollout count based on time budget
    const rolloutCount = this.adaptiveMCTS.calculateRolloutCount(
      AIDifficulty.EXPERT,
      complexity,
      thinkingTimeMs
    );

    let selectedMove: Move;

    if (rolloutCount === 0) {
      // Use pure rule-based evaluation (forced move or opening)
      logger.debug(`[ExpertAI] Using rules-based (rolloutCount=0) - complexity: forced=${complexity.isForcedMove}, opening=${complexity.isOpeningMove}`);
      const evaluations = await this.expertEvaluateMovesAsync(board, player, availableMoves);
      evaluations.sort((a, b) => b.score - a.score);

      // 99% chance to pick best move
      selectedMove = Math.random() < 0.99 || evaluations.length === 1
        ? evaluations[0].move
        : evaluations[1].move;
    } else {
      logger.debug(`[ExpertAI] Using MCTS - rolloutCount=${rolloutCount}, thinkingTime=${thinkingTimeMs}ms`);
      // Use hybrid MCTS + rules evaluation
      try {
        // Get MCTS evaluation with time limit
        const mctsTimeMs = Math.floor(thinkingTimeMs * 0.8);
        const mctsConfig = this.adaptiveMCTS.createMCTSConfig(rolloutCount, mctsTimeMs);

        // FIRST: Compute rule-based move for comparison
        const ruleBasedEvaluations = await this.expertEvaluateMovesAsync(board, player, availableMoves);
        ruleBasedEvaluations.sort((a, b) => b.score - a.score);
        const ruleBasedMove = ruleBasedEvaluations[0].move;
        const ruleBasedScore = ruleBasedEvaluations[0].score;

        // THEN: Evaluate with MCTS
        selectedMove = await this.mcts.selectMove(board, player, availableMoves, mctsConfig);

        // Track performance
        const actualTime = performance.now() - startTime;
        const gamesPerSecond = Math.floor((rolloutCount / actualTime) * 1000);
        this.adaptiveMCTS.updatePerformance(gamesPerSecond);

        logger.debug(
          `🧠 ExpertAI MCTS: rollouts=${rolloutCount}, ` +
          `time=${Math.round(actualTime)}ms, ` +
          `speed=${gamesPerSecond} games/sec`
        );

        // Extract move statistics from MCTS tree
        const mctsStats = this.mcts.getStats();
        const selectedMoveStats = this.mcts.getSelectedMoveStats();
        const allMoveStats = this.mcts.getMoveStatistics(5); // Top 5 alternative moves

        // Format alternative moves for database
        const alternativeMoves = allMoveStats.slice(1, 5).map(stat => ({
          from: stat.move.from,
          to: stat.move.to,
          visits: stat.visits,
          winRate: stat.winRate,
          score: stat.score
        }));

        // Log MCTS evaluation (cached locally, no await - fire and forget)
        mctsMonitor.logEvaluation({
          moveNumber: this.turnNumber,
          player,
          difficulty: AIDifficulty.EXPERT,
          complexity,
          thinkingTimeBudgetMs: thinkingTimeMs,
          mctsTimeBudgetMs: mctsTimeMs,
          rolloutCountTarget: rolloutCount,
          rolloutCountActual: mctsStats.simulationsRun,
          rolloutPolicy: mctsConfig.rolloutPolicy || 'heuristic',
          explorationConstant: mctsConfig.explorationConstant || Math.sqrt(2),
          actualTimeMs: actualTime,
          gamesPerSecond,
          nodesCreated: mctsStats.nodesCreated,
          simulationsRun: mctsStats.simulationsRun,
          selectedMove,
          selectedMoveVisits: selectedMoveStats?.visits,
          selectedMoveWinRate: selectedMoveStats?.winRate,
          alternativeMoves,
          ruleBasedMove,
          ruleBasedScore,
          exceededTimeBudget: actualTime > mctsTimeMs,
          fallbackToRules: false
        });
      } catch (error) {
        // Fallback to rule-based if MCTS fails
        logger.warn(`ExpertAI MCTS failed, falling back to rules: ${error}`);
        const evaluations = await this.expertEvaluateMovesAsync(board, player, availableMoves);
        evaluations.sort((a, b) => b.score - a.score);
        selectedMove = evaluations[0].move;

        // Log fallback to rules (cached locally, no await)
        const actualTime = performance.now() - startTime;
        mctsMonitor.logEvaluation({
          moveNumber: this.turnNumber,
          player,
          difficulty: AIDifficulty.EXPERT,
          complexity,
          thinkingTimeBudgetMs: thinkingTimeMs,
          mctsTimeBudgetMs: Math.floor(thinkingTimeMs * 0.8),
          rolloutCountTarget: rolloutCount,
          rolloutCountActual: 0,
          rolloutPolicy: 'heuristic',
          explorationConstant: Math.sqrt(2),
          actualTimeMs: actualTime,
          gamesPerSecond: 0,
          nodesCreated: 0,
          simulationsRun: 0,
          selectedMove,
          exceededTimeBudget: false,
          fallbackToRules: true,
          fallbackReason: String(error)
        });
      }
    }

    const actualComputeTime = performance.now() - startTime;

    // 5. Add artificial delay to match Phase 2.9 thinking time
    const remainingDelay = Math.max(0, thinkingTimeMs - actualComputeTime);
    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }

    return selectedMove;
  }

  private async expertEvaluateMovesAsync(
    board: BoardPosition[],
    player: Player,
    availableMoves: Move[]
  ): Promise<MoveEvaluation[]> {
    // Advanced evaluation with multiple factors and personality weights
    const evaluations = availableMoves.map(move => {
      const moveScore = PositionEvaluator.evaluateMove(board, move, player, this.settings.personality);
      const newBoard = this.simulateMove(board, move);
      const positionEval = PositionEvaluator.evaluatePosition(newBoard, player, this.settings.personality);

      // Weighted combination of multiple factors
      let combinedScore =
        moveScore * 0.4 +
        positionEval.score * 0.3 +
        positionEval.factors.safety * 0.1 +
        positionEval.factors.hitting * 0.1 +
        positionEval.factors.bearing * 0.1;

      // Overwhelming bonus for bear-off moves (Expert AI must prioritize winning above all)
      if (move.to === 25) {
        combinedScore += 100.0;
      }

      return {
        move,
        score: combinedScore,
        reasoning: move.to === 25 ? `Bear off checker` : `Expert evaluation: ${combinedScore.toFixed(2)}`
      };
    });

    return evaluations;
  }

  private simulateMove(board: BoardPosition[], move: Move): BoardPosition[] {
    // Apply the move to a copy of the board
    const newBoard = copyBoard(board);
    const fromPosition = newBoard.find(pos => pos.pointIndex === move.from);
    const toPosition = newBoard.find(pos => pos.pointIndex === move.to);

    if (!fromPosition || !toPosition) return newBoard;

    const checkerIndex = fromPosition.checkers.findIndex(c => c.id === move.checkerId);
    if (checkerIndex === -1) return newBoard;

    const checker = fromPosition.checkers.splice(checkerIndex, 1)[0];
    checker.position = move.to;
    toPosition.checkers.push(checker);

    return newBoard;
  }
}

// Factory function to create AI players
export function createAIPlayer(settings: AISettings): AIPlayer {
  switch (settings.difficulty) {
    case AIDifficulty.BEGINNER:
      return new BeginnerAI(settings);
    case AIDifficulty.EASY:
      return new EasyAI(settings);
    case AIDifficulty.MEDIUM:
      return new MediumAI(settings);
    case AIDifficulty.HARD:
      return new HardAI(settings);
    case AIDifficulty.EXPERT:
      return new ExpertAI(settings);
    default:
      return new EasyAI(settings);
  }
}

// Predefined AI opponents
export const AI_PRESETS: Record<string, AISettings> = {
  rookie: {
    difficulty: AIDifficulty.BEGINNER,
    personality: AIPersonality.BALANCED,
    thinkingTimeMin: 500,
    thinkingTimeMax: 1500,
    name: 'Rookie'
  },
  casual: {
    difficulty: AIDifficulty.EASY,
    personality: AIPersonality.BALANCED,
    thinkingTimeMin: 800,
    thinkingTimeMax: 2000,
    name: 'Casual Player'
  },
  competitor: {
    difficulty: AIDifficulty.MEDIUM,
    personality: AIPersonality.TACTICAL,
    thinkingTimeMin: 1000,
    thinkingTimeMax: 2500,
    name: 'Competitor'
  },
  veteran: {
    difficulty: AIDifficulty.HARD,
    personality: AIPersonality.AGGRESSIVE,
    thinkingTimeMin: 1200,
    thinkingTimeMax: 3000,
    name: 'Veteran'
  },
  master: {
    difficulty: AIDifficulty.EXPERT,
    personality: AIPersonality.TACTICAL,
    thinkingTimeMin: 1500,
    thinkingTimeMax: 3500,
    name: 'Master'
  }
};