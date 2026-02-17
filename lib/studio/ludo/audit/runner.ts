/**
 * Gameplay Audit System - Headless Game Runner
 *
 * Non-rendering AI vs AI game execution for batch testing
 */

import { Player, GameState, Move, PlayerType, BoardPosition, PlayMode, GameFlowState, GameType } from '../game/types';
import { createAIPlayer } from '../ai/players';
import { AIPlayer, AIPersonality, AIDifficulty, AISettings } from '../ai/types';
import { GameRules } from '../game/rules';
import { diceRoller } from '../game/dice';
import { copyBoard } from '../utils/deepCopy';
import { INITIAL_SETUP, BAR_POSITION } from '../game/types';
import { PositionEvaluator } from '../ai/evaluation';
import { gameplayLogger } from './logger';
import { auditClient } from './client';
import { BatchConfig, BatchProgress, ProgressCallback } from './types';
import { logger } from '../utils/logger';
import { mctsMonitor } from '../mcts-audit/monitoring';

// =====================================================
// Helper Functions
// =====================================================

/**
 * Convert preset string to AIDifficulty enum
 */
function presetToDifficulty(preset: string): AIDifficulty {
  const normalized = preset.toLowerCase();
  switch (normalized) {
    case 'beginner':
    case 'rookie':
      return AIDifficulty.BEGINNER;
    case 'easy':
    case 'casual':
      return AIDifficulty.EASY;
    case 'medium':
    case 'competitor':
      return AIDifficulty.MEDIUM;
    case 'hard':
    case 'veteran':
      return AIDifficulty.HARD;
    case 'expert':
    case 'master':
      return AIDifficulty.EXPERT;
    default:
      logger.warn(`Unknown preset "${preset}", defaulting to MEDIUM`);
      return AIDifficulty.MEDIUM;
  }
}

/**
 * Convert personality string to AIPersonality enum
 */
function stringToPersonality(personality: string): AIPersonality {
  const normalized = personality.toLowerCase();
  switch (normalized) {
    case 'balanced':
      return AIPersonality.BALANCED;
    case 'aggressive':
      return AIPersonality.AGGRESSIVE;
    case 'defensive':
      return AIPersonality.DEFENSIVE;
    case 'tactical':
      return AIPersonality.TACTICAL;
    default:
      logger.warn(`Unknown personality "${personality}", defaulting to BALANCED`);
      return AIPersonality.BALANCED;
  }
}

/**
 * Create AISettings object from preset and personality strings
 */
function buildAISettings(preset: string, personality: string, playerName: string): AISettings {
  const difficulty = presetToDifficulty(preset);
  const personalityEnum = stringToPersonality(personality);

  // Set thinking time based on difficulty
  let thinkingTimeMin = 800;
  let thinkingTimeMax = 2000;

  switch (difficulty) {
    case AIDifficulty.BEGINNER:
      thinkingTimeMin = 500;
      thinkingTimeMax = 1500;
      break;
    case AIDifficulty.EASY:
      thinkingTimeMin = 800;
      thinkingTimeMax = 2000;
      break;
    case AIDifficulty.MEDIUM:
      thinkingTimeMin = 1000;
      thinkingTimeMax = 2500;
      break;
    case AIDifficulty.HARD:
      thinkingTimeMin = 1200;
      thinkingTimeMax = 3000;
      break;
    case AIDifficulty.EXPERT:
      thinkingTimeMin = 1500;
      thinkingTimeMax = 3500;
      break;
  }

  return {
    difficulty,
    personality: personalityEnum,
    thinkingTimeMin,
    thinkingTimeMax,
    name: `${playerName} (${preset.charAt(0).toUpperCase() + preset.slice(1)} / ${personality.charAt(0).toUpperCase() + personality.slice(1)})`
  };
}

/**
 * Initialize board from setup configuration
 */
function initializeBoardFromSetup(setup: { [position: number]: { player: Player; count: number } }): BoardPosition[] {
  // Initialize empty board (26 positions: 0-23 points, 24 bar, 25 off)
  const board: BoardPosition[] = Array.from({ length: 26 }, (_, index) => ({
    pointIndex: index,
    checkers: []
  }));

  // Place checkers according to setup
  let whiteCheckerId = 0;
  let blackCheckerId = 0;

  Object.entries(setup).forEach(([position, checkerSetup]) => {
    const pos = parseInt(position);
    const boardPosition = board[pos];

    for (let i = 0; i < checkerSetup.count; i++) {
      const checkerId = checkerSetup.player === Player.WHITE ? whiteCheckerId++ : blackCheckerId++;
      boardPosition.checkers.push({
        id: `${checkerSetup.player}-${checkerId}`,
        player: checkerSetup.player,
        position: pos
      });
    }
  });

  return board;
}

// =====================================================
// Headless Game State
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface HeadlessGameState extends Omit<GameState, 'selectedChecker' | 'animationQueue'> {
  // Simplified state for headless execution
}

// =====================================================
// Headless Game Runner
// =====================================================

export class HeadlessGameRunner {
  private state: HeadlessGameState;
  private whiteAI: AIPlayer;
  private blackAI: AIPlayer;
  private sessionId: string | null = null;
  private gameNumber: number = 0;
  private maxMoves: number = 1000; // Safety limit per game
  private gameProgressCallback?: (moveNumber: number, phase: string, pipCount: number) => void;
  private initialPipCount: number = 334; // 167 per player in standard backgammon

  constructor(
    whitePreset: string,
    whitePersonality: string,
    blackPreset: string,
    blackPersonality: string,
    matchLength: number = 1
  ) {
    // Initialize AI players with proper AISettings objects
    const whiteSettings = buildAISettings(whitePreset, whitePersonality, 'White');
    const blackSettings = buildAISettings(blackPreset, blackPersonality, 'Black');

    this.whiteAI = createAIPlayer(whiteSettings);
    this.blackAI = createAIPlayer(blackSettings);

    logger.info(`[Headless] Created AI players: White=${whiteSettings.name}, Black=${blackSettings.name}`);

    // Initialize game state
    this.state = {
      board: initializeBoardFromSetup(INITIAL_SETUP),
      dice: null,
      usedDice: [],
      currentPlayer: Player.WHITE,
      availableMoves: [],
      winner: null,
      gamePhase: 'opening_roll',
      players: {
        [Player.WHITE]: {
          type: PlayerType.AI,
          name: 'White AI'
        },
        [Player.BLACK]: {
          type: PlayerType.AI,
          name: 'Black AI'
        }
      },
      matchState: matchLength > 1 ? {
        matchId: `batch-${Date.now()}`,
        configuration: {
          enabled: true,
          targetPoints: matchLength,
          useCrawfordRule: true,
          useJacobyRule: false,
          automaticDoubles: false,
          doublingCubeEnabled: false,
          maxDoubles: 64
        },
        scores: {
          [Player.WHITE]: 0,
          [Player.BLACK]: 0
        },
        gamesPlayed: 0,
        currentGameNumber: 1,
        matchWinner: null,
        isCrawfordGame: false,
        crawfordGamePlayed: false,
        isPostCrawford: false,
        gameHistory: [],
        automaticDoublesThisGame: 0
      } : undefined,
      doublingCube: {
        value: 1,
        owner: null,
        lastDoubler: null,
        canDouble: false
      },
      moveCount: 0,
      openingRoll: {
        whiteRoll: null,
        blackRoll: null,
        resolved: false,
        rerollCount: 0
      },
      gameFlowState: GameFlowState.PLAYING,
      playMode: PlayMode.AI_VS_AI,
      gameType: matchLength > 1 ? GameType.MATCH : GameType.SINGLE,
      pendingDouble: undefined
    };
  }

  /**
   * Initialize logging session
   */
  async initializeSession(sessionId: string, userId: string): Promise<void> {
    this.sessionId = sessionId;
    logger.info(`[Headless] Initializing session ${sessionId} for user ${userId}`);
    // Batch simulations: cache all events until end (observable = false, batchMode = true)
    await gameplayLogger.initialize(sessionId, false, true);
    // Initialize MCTS monitoring for this session
    mctsMonitor.setSessionContext(sessionId, userId);
    logger.info(`[Headless] MCTS monitoring context set`);
  }

  /**
   * Set callback for per-move game progress updates
   */
  setGameProgressCallback(callback: (moveNumber: number, phase: string, pipCount: number) => void): void {
    this.gameProgressCallback = callback;
  }

  /**
   * Calculate combined pip count for both players
   */
  private calculateCombinedPipCount(): number {
    const whitePips = GameRules.calculatePipCount(this.state.board, Player.WHITE);
    const blackPips = GameRules.calculatePipCount(this.state.board, Player.BLACK);
    return whitePips + blackPips;
  }

  /**
   * Play complete game to completion
   */
  async playGame(): Promise<{ winner: Player; moves: number; duration: number }> {
    const startTime = Date.now();
    this.gameNumber++;
    let moveCount = 0;

    logger.info(`[Headless] Starting game #${this.gameNumber}`);
    logger.info(`[Headless] White: ${this.whiteAI.getName()}, Black: ${this.blackAI.getName()}`);

    // Notify MCTS monitor of new game
    mctsMonitor.startNewGame();
    logger.debug(`[Headless] MCTS monitor notified of new game`);

    // Reset game state
    this.resetGameState();

    // Report progress: starting game
    const initialPips = this.calculateCombinedPipCount();
    this.gameProgressCallback?.(0, 'opening_roll', initialPips);

    // Opening roll
    await this.performOpeningRoll();

    // Main game loop
    while (!this.state.winner && moveCount < this.maxMoves) {
      await this.playTurn();
      moveCount++;

      // Report progress after each move with current pip count
      const currentPips = this.calculateCombinedPipCount();
      this.gameProgressCallback?.(moveCount, 'playing', currentPips);

      // Safety check
      if (moveCount >= this.maxMoves) {
        logger.warn(`Game exceeded max moves (${this.maxMoves}), ending as draw`);
        break;
      }
    }

    const duration = Date.now() - startTime;
    const winner = this.state.winner || Player.WHITE; // Default to white if exceeded moves

    // Report progress: game finished
    const finalPips = this.calculateCombinedPipCount();
    this.gameProgressCallback?.(moveCount, 'finished', finalPips);

    logger.info(`Game #${this.gameNumber} completed: ${winner} wins in ${moveCount} moves (${duration}ms)`);

    // Log game end
    await gameplayLogger.logGameEnd(
      winner,
      this.calculateGameValue(),
      this.getCurrentAIPreset()
    );

    return { winner, moves: moveCount, duration };
  }

  /**
   * Perform opening roll
   */
  private async performOpeningRoll(): Promise<void> {
    // Roll two dice and use them for opening roll
    let [whiteRoll] = diceRoller.roll();
    let [blackRoll] = diceRoller.roll();

    await gameplayLogger.logOpeningRoll(Player.WHITE, whiteRoll, this.getAIPreset(Player.WHITE), this.getAIPersonality(Player.WHITE));
    await gameplayLogger.logOpeningRoll(Player.BLACK, blackRoll, this.getAIPreset(Player.BLACK), this.getAIPersonality(Player.BLACK));

    // Handle ties
    while (whiteRoll === blackRoll) {
      logger.debug('Opening roll tie, re-rolling...');
      [whiteRoll] = diceRoller.roll();
      [blackRoll] = diceRoller.roll();

      await gameplayLogger.logOpeningRoll(Player.WHITE, whiteRoll, this.getAIPreset(Player.WHITE), this.getAIPersonality(Player.WHITE));
      await gameplayLogger.logOpeningRoll(Player.BLACK, blackRoll, this.getAIPreset(Player.BLACK), this.getAIPersonality(Player.BLACK));
    }

    // Determine starting player
    this.state.currentPlayer = whiteRoll > blackRoll ? Player.WHITE : Player.BLACK;
    this.state.dice = [whiteRoll, blackRoll].sort((a, b) => b - a);
    this.state.usedDice = [false, false];
    this.state.gamePhase = 'moving';

    // Calculate available moves
    this.state.availableMoves = GameRules.getAvailableMoves(
      this.state.board,
      this.state.currentPlayer,
      this.state.dice,
      this.state.usedDice
    );

    logger.debug(`Opening roll: White ${whiteRoll}, Black ${blackRoll}. ${this.state.currentPlayer} starts with [${this.state.dice}]`);
  }

  /**
   * Play a single turn
   */
  private async playTurn(): Promise<void> {
    const player = this.state.currentPlayer;

    // Roll dice (unless first turn from opening roll)
    if (this.state.moveCount > 0 || this.state.dice === null) {
      const dice = diceRoller.roll();
      this.state.dice = dice;
      this.state.usedDice = dice.map(() => false);

      await gameplayLogger.logDiceRoll(
        player,
        dice,
        this.getAIPreset(player),
        this.getAIPersonality(player)
      );

      // Calculate available moves
      this.state.availableMoves = GameRules.getAvailableMoves(
        this.state.board,
        player,
        dice,
        this.state.usedDice
      );
    }

    // Play all available moves
    while (this.state.availableMoves.length > 0 && this.state.usedDice.some(used => !used)) {
      // Safety check: ensure dice is set
      if (!this.state.dice || this.state.dice.length === 0) {
        logger.warn('No dice available for move selection');
        break;
      }

      const ai = player === Player.WHITE ? this.whiteAI : this.blackAI;
      const decisionStart = Date.now();

      logger.debug(`[Headless] Requesting move from ${ai.getName()} (${player}), ${this.state.availableMoves.length} moves available`);

      // Get AI move using async evaluation (enables MCTS logging)
      let selectedMove: Move;
      try {
        logger.debug(`[Headless] Calling evaluatePosition for ${ai.getName()}`);
        selectedMove = await ai.evaluatePosition(
          this.state.board,
          player,
          this.state.dice,
          this.state.availableMoves
        );
        logger.debug(`[Headless] ${ai.getName()} selected move: ${selectedMove.checkerId} from ${selectedMove.from} to ${selectedMove.to}`);
      } catch (error) {
        logger.error('[Headless] AI move selection failed:', error);
        break;
      }

      const decisionTime = Date.now() - decisionStart;

      if (!selectedMove) {
        logger.warn(`AI returned no move despite ${this.state.availableMoves.length} available`);
        break;
      }

      // Capture pre-move snapshot
      const preSnapshot = copyBoard(this.state.board);

      // Execute move
      await this.executeMove(selectedMove);

      // Capture post-move snapshot
      const postSnapshot = copyBoard(this.state.board);

      // Get position evaluation score
      const positionEval = PositionEvaluator.evaluatePosition(
        this.state.board,
        player,
        this.getAIPersonality(player) as AIPersonality
      );

      // Log move with AI decision data
      await gameplayLogger.logMove(player, selectedMove, {
        aiPreset: this.getAIPreset(player),
        aiPersonality: this.getAIPersonality(player),
        availableMovesCount: this.state.availableMoves.length,
        evaluationScore: positionEval.score,
        decisionTimeMs: decisionTime,
        preSnapshot,
        postSnapshot
      });

      // Check for win
      if (GameRules.checkWinCondition(this.state.board, player)) {
        this.state.winner = player;
        this.state.gamePhase = 'finished';
        return;
      }

      // Recalculate available moves
      this.state.availableMoves = GameRules.getAvailableMoves(
        this.state.board,
        player,
        this.state.dice!,
        this.state.usedDice
      );
    }

    // Switch turns
    this.state.currentPlayer = player === Player.WHITE ? Player.BLACK : Player.WHITE;
    this.state.dice = null;
    this.state.gamePhase = 'rolling';
    this.state.moveCount++;
  }

  /**
   * Execute a move and update state
   */
  private async executeMove(move: Move): Promise<void> {
    const fromPosition = this.state.board.find(pos => pos.pointIndex === move.from);
    const toPosition = this.state.board.find(pos => pos.pointIndex === move.to);

    if (!fromPosition || !toPosition) return;

    // Move checker
    const checkerIndex = fromPosition.checkers.findIndex(c => c.id === move.checkerId);
    if (checkerIndex === -1) return;

    const checker = fromPosition.checkers.splice(checkerIndex, 1)[0];
    checker.position = move.to;

    // Handle hitting
    if (move.to !== 25 && toPosition.checkers.length === 1 && toPosition.checkers[0].player !== this.state.currentPlayer) {
      const hitChecker = toPosition.checkers.pop()!;
      hitChecker.position = BAR_POSITION;

      const barPosition = this.state.board.find(pos => pos.pointIndex === BAR_POSITION);
      if (barPosition) {
        barPosition.checkers.push(hitChecker);
      }

      // Log the hit
      await gameplayLogger.logHit(
        this.state.currentPlayer,
        move.to,
        this.getAIPreset(this.state.currentPlayer)
      );
      logger.debug(`[Headless] ${this.state.currentPlayer} hit opponent checker at point ${move.to}`);
    }

    toPosition.checkers.push(checker);

    // Mark die as used
    const dieIndex = this.state.dice!.findIndex((die, index) =>
      die === move.distance && !this.state.usedDice[index]
    );
    if (dieIndex !== -1) {
      this.state.usedDice[dieIndex] = true;
    }
  }

  /**
   * Reset game state for new game
   */
  private resetGameState(): void {
    this.state.board = initializeBoardFromSetup(INITIAL_SETUP);
    this.state.dice = null;
    this.state.usedDice = [];
    this.state.currentPlayer = Player.WHITE;
    this.state.availableMoves = [];
    this.state.winner = null;
    this.state.gamePhase = 'opening_roll';
    this.state.moveCount = 0;
    this.state.openingRoll = {
      whiteRoll: null,
      blackRoll: null,
      resolved: false,
      rerollCount: 0
    };

    gameplayLogger.startNewGame();
  }

  /**
   * Calculate game value (single/gammon/backgammon)
   */
  private calculateGameValue(): number {
    // For now, simplified to 1 point
    // TODO: Implement proper gammon/backgammon detection
    return 1;
  }

  /**
   * Get AI preset name for player
   */
  private getAIPreset(player: Player): string {
    return player === Player.WHITE ? this.whiteAI.getName() : this.blackAI.getName();
  }

  /**
   * Get AI personality for player
   */
  private getAIPersonality(player: Player): string {
    return player === Player.WHITE ? this.whiteAI.getPersonality() : this.blackAI.getPersonality();
  }

  /**
   * Get current player's AI preset
   */
  private getCurrentAIPreset(): string {
    return this.getAIPreset(this.state.currentPlayer);
  }
}

// =====================================================
// Batch Runner
// =====================================================

export class BatchGameRunner {
  private aborted: boolean = false;

  /**
   * Abort the current batch run
   */
  abort(): void {
    this.aborted = true;
    logger.warn('Batch run abort requested');
  }

  /**
   * Run multiple games in sequence
   */
  async runBatch(
    config: BatchConfig,
    userId: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    // Reset abort flag
    this.aborted = false;
    logger.info(`Starting batch run: ${config.iterations} games`);

    // Create session
    const session = await auditClient.createSession(
      {
        mode: 'batch',
        white_ai_preset: config.whiteAI.preset,
        white_ai_personality: config.whiteAI.personality,
        black_ai_preset: config.blackAI.preset,
        black_ai_personality: config.blackAI.personality,
        match_length: config.matchLength,
        iteration_count: config.iterations,
        random_seed: config.randomSeed?.toString(),
        notes: config.notes
      },
      userId
    );

    if (!session) {
      const errorMsg = 'Failed to create audit session. Common issues:\n\n' +
        '1. Database tables not created:\n' +
        '   Run: npx supabase migration up\n' +
        '   (Creates gameplay_sessions table from migration 011)\n\n' +
        '2. Supabase not configured:\n' +
        '   Check .env.local has:\n' +
        '   - NEXT_PUBLIC_SUPABASE_URL\n' +
        '   - NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n' +
        '3. Not logged in:\n' +
        '   Ensure you\'re authenticated with a valid user';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const sessionId = session.id;

    // Initialize runner
    const runner = new HeadlessGameRunner(
      config.whiteAI.preset,
      config.whiteAI.personality,
      config.blackAI.preset,
      config.blackAI.personality,
      config.matchLength
    );

    await runner.initializeSession(sessionId, userId);

    // Run startup benchmark for MCTS performance tracking
    await mctsMonitor.runStartupBenchmark(1000);

    // Set up game progress callback to propagate to UI
    let currentGameMoveNumber = 0;
    let currentGamePhase = 'starting';
    let currentGamePipCount = 334; // Initial pip count

    runner.setGameProgressCallback((moveNumber, phase, pipCount) => {
      currentGameMoveNumber = moveNumber;
      currentGamePhase = phase;
      currentGamePipCount = pipCount;

      // Immediately propagate game progress to UI
      if (onProgress) {
        const elapsed = Date.now() - startTime;
        const avgTimePerGame = elapsed / Math.max(1, currentGameIndex);
        const remaining = (config.iterations - currentGameIndex) * avgTimePerGame;

        onProgress({
          current: currentGameIndex,
          total: config.iterations,
          sessionId,
          estimatedTimeRemaining: remaining,
          currentGameMoveNumber: moveNumber,
          currentGamePhase: phase,
          currentGameTotalMoves: undefined, // We don't know total moves in advance
          currentGamePipCount: pipCount,
          initialPipCount: 334
        });
      }
    });

    // Run games
    const startTime = Date.now();
    let currentGameIndex = 0;

    for (let i = 0; i < config.iterations; i++) {
      // Check for abort
      if (this.aborted) {
        logger.warn(`Batch run aborted after ${i} games`);
        break;
      }

      currentGameIndex = i + 1;
      await runner.playGame();

      // Progress callback after game completion
      if (onProgress) {
        const elapsed = Date.now() - startTime;
        const avgTimePerGame = elapsed / (i + 1);
        const remaining = (config.iterations - i - 1) * avgTimePerGame;

        onProgress({
          current: i + 1,
          total: config.iterations,
          sessionId,
          estimatedTimeRemaining: remaining,
          currentGameMoveNumber: currentGameMoveNumber,
          currentGamePhase: 'completed',
          currentGameTotalMoves: currentGameMoveNumber,
          currentGamePipCount: currentGamePipCount,
          initialPipCount: 334
        });
      }
    }

    // Complete session
    await gameplayLogger.complete();

    const totalTime = Date.now() - startTime;
    logger.info(`Batch run completed: ${config.iterations} games in ${(totalTime / 1000).toFixed(1)}s`);

    return sessionId;
  }
}

// Export singleton
export const batchRunner = new BatchGameRunner();
