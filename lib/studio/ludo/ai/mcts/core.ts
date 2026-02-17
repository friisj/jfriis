/**
 * Monte Carlo Tree Search (MCTS) Core Implementation
 *
 * Uses UCB1 (Upper Confidence Bound) algorithm to balance exploration vs exploitation
 * Integrates with FastRolloutEngine for position evaluation
 */

import { BoardPosition, Player, Move } from '@/lib/studio/ludo/game/types';
import { FastRolloutEngine, RolloutPolicy } from './rollout';
import { logger } from '@/lib/studio/ludo/utils/logger';

/**
 * MCTS Node representing a game state in the search tree
 */
export interface MCTSNode {
  /** Board state at this node */
  state: BoardPosition[];

  /** Move that led to this state (null for root) */
  move: Move | null;

  /** Parent node (null for root) */
  parent: MCTSNode | null;

  /** Child nodes (expanded moves) */
  children: MCTSNode[];

  /** Number of times this node has been visited */
  visits: number;

  /** Total reward accumulated from simulations through this node */
  totalReward: number;

  /** Moves that haven't been expanded yet */
  untriedMoves: Move[];

  /** Player whose turn it is at this state */
  player: Player;
}

/**
 * Configuration for MCTS search
 */
export interface MCTSConfig {
  /** Number of rollout simulations to perform */
  simulationCount: number;

  /** UCB1 exploration constant (√2 is standard, higher = more exploration) */
  explorationConstant: number;

  /** Maximum time to spend searching (ms) */
  timeLimit: number;

  /** Rollout policy for simulations */
  rolloutPolicy: RolloutPolicy;

  /** Enable detailed logging */
  debug?: boolean;
}

/**
 * Default MCTS configuration
 */
export const DEFAULT_MCTS_CONFIG: MCTSConfig = {
  simulationCount: 1000,
  explorationConstant: Math.sqrt(2), // √2 ≈ 1.414
  timeLimit: 3000, // 3 seconds
  rolloutPolicy: 'heuristic',
  debug: false
};

/**
 * Monte Carlo Tree Search Evaluator
 */
export class MCTSEvaluator {
  private rolloutEngine: FastRolloutEngine;
  private nodesCreated = 0;
  private simulationsRun = 0;
  private lastRoot: MCTSNode | null = null;

  constructor() {
    this.rolloutEngine = new FastRolloutEngine();
  }

  /**
   * Select best move using MCTS
   * Returns the move with highest visit count (most robust)
   */
  async selectMove(
    board: BoardPosition[],
    player: Player,
    availableMoves: Move[],
    config: Partial<MCTSConfig> = {}
  ): Promise<Move> {
    const fullConfig = { ...DEFAULT_MCTS_CONFIG, ...config };

    if (availableMoves.length === 0) {
      throw new Error('No available moves');
    }

    if (availableMoves.length === 1) {
      // Only one move available, no need for search
      return availableMoves[0];
    }

    // Reset counters
    this.nodesCreated = 0;
    this.simulationsRun = 0;

    // Create root node
    const root = this.createNode(board, null, null, player, availableMoves);

    const startTime = performance.now();
    const deadline = startTime + fullConfig.timeLimit;

    // MCTS main loop
    while (
      this.simulationsRun < fullConfig.simulationCount &&
      performance.now() < deadline
    ) {
      // 1. Selection: Walk tree using UCB1
      const node = this.select(root, fullConfig);

      // 2. Expansion: Add a child node for an untried move
      const child = this.expand(node);

      // 3. Simulation: Run random playout to terminal state
      const reward = this.simulate(child || node, fullConfig);

      // 4. Backpropagation: Update statistics up the tree
      this.backpropagate(child || node, reward);

      this.simulationsRun++;
    }

    const elapsed = performance.now() - startTime;

    if (fullConfig.debug) {
      logger.debug(
        `MCTS: ${this.simulationsRun} simulations in ${elapsed.toFixed(0)}ms ` +
        `(${(this.simulationsRun / (elapsed / 1000)).toFixed(0)} sims/sec), ` +
        `${this.nodesCreated} nodes created`
      );
    }

    // Store root node for external access to move statistics
    this.lastRoot = root;

    // Return move with highest visit count (most robust)
    const bestChild = this.bestChild(root, 0); // exploitation only

    if (!bestChild || !bestChild.move) {
      // Fallback: return first available move
      logger.warn('MCTS failed to find best move, using fallback');
      return availableMoves[0];
    }

    if (fullConfig.debug) {
      logger.debug(
        `MCTS selected move: ${bestChild.move.from}→${bestChild.move.to}, ` +
        `visits: ${bestChild.visits}, ` +
        `win rate: ${(bestChild.totalReward / bestChild.visits).toFixed(3)}`
      );
    }

    return bestChild.move;
  }

  /**
   * Evaluate all available moves and return scores
   * Useful for blending with rule-based evaluation
   */
  async evaluateMoves(
    board: BoardPosition[],
    player: Player,
    availableMoves: Move[],
    config: Partial<MCTSConfig> = {}
  ): Promise<Array<{ move: Move; score: number; visits: number }>> {
    const fullConfig = { ...DEFAULT_MCTS_CONFIG, ...config };

    if (availableMoves.length === 0) {
      return [];
    }

    // Create root node
    const root = this.createNode(board, null, null, player, availableMoves);

    const startTime = performance.now();
    const deadline = startTime + fullConfig.timeLimit;

    // MCTS main loop
    while (
      this.simulationsRun < fullConfig.simulationCount &&
      performance.now() < deadline
    ) {
      const node = this.select(root, fullConfig);
      const child = this.expand(node);
      const reward = this.simulate(child || node, fullConfig);
      this.backpropagate(child || node, reward);
      this.simulationsRun++;
    }

    // Return all children with their scores
    return root.children.map(child => ({
      move: child.move!,
      score: child.visits > 0 ? child.totalReward / child.visits : 0,
      visits: child.visits
    })).sort((a, b) => b.score - a.score);
  }

  /**
   * Create a new MCTS node
   */
  private createNode(
    state: BoardPosition[],
    move: Move | null,
    parent: MCTSNode | null,
    player: Player,
    availableMoves: Move[]
  ): MCTSNode {
    this.nodesCreated++;

    return {
      state,
      move,
      parent,
      children: [],
      visits: 0,
      totalReward: 0,
      untriedMoves: [...availableMoves],
      player
    };
  }

  /**
   * Selection: Walk down tree using UCB1 until reaching a node with untried moves
   */
  private select(node: MCTSNode, config: MCTSConfig): MCTSNode {
    let current = node;

    while (current.untriedMoves.length === 0 && current.children.length > 0) {
      // All moves tried, select best child using UCB1
      current = this.bestChild(current, config.explorationConstant)!;
    }

    return current;
  }

  /**
   * Expansion: Add a child node for one untried move
   */
  private expand(node: MCTSNode): MCTSNode | null {
    if (node.untriedMoves.length === 0) {
      return null; // Fully expanded or terminal
    }

    // Select a random untried move
    const moveIndex = Math.floor(Math.random() * node.untriedMoves.length);
    const move = node.untriedMoves.splice(moveIndex, 1)[0];

    // Apply move to get new state
    const newState = this.applyMove(node.state, move);

    // Determine next player
    const nextPlayer = node.player === Player.WHITE ? Player.BLACK : Player.WHITE;

    // Get available moves for next player (simplified)
    const nextMoves = this.getAvailableMoves(newState, nextPlayer);

    // Create child node
    const child = this.createNode(newState, move, node, nextPlayer, nextMoves);
    node.children.push(child);

    return child;
  }

  /**
   * Simulation: Run a random playout from this node to a terminal state
   */
  private simulate(node: MCTSNode, config: MCTSConfig): number {
    // Use FastRolloutEngine to simulate game to completion
    const result = this.rolloutEngine.simulateGame(
      node.state,
      node.player,
      config.rolloutPolicy
    );

    // Convert result to reward from root player's perspective
    // Reward is from white's perspective: +1 for white win, 0 for black win
    const reward = result.winner === Player.WHITE ? 1 : 0;

    return reward;
  }

  /**
   * Backpropagation: Update statistics from leaf node up to root
   */
  private backpropagate(node: MCTSNode, reward: number): void {
    let current: MCTSNode | null = node;

    while (current !== null) {
      current.visits++;

      // Reward is always from white's perspective
      // If current player is black, we flip the reward
      const adjustedReward = current.player === Player.BLACK ? 1 - reward : reward;
      current.totalReward += adjustedReward;

      current = current.parent;
    }
  }

  /**
   * UCB1: Select best child using Upper Confidence Bound formula
   * Balances exploitation (high win rate) vs exploration (few visits)
   */
  private ucb1(node: MCTSNode, parent: MCTSNode, c: number): number {
    if (node.visits === 0) {
      return Infinity; // Unvisited nodes have infinite value (ensure exploration)
    }

    // Exploitation: average reward
    const exploitation = node.totalReward / node.visits;

    // Exploration: bonus for less-visited nodes
    const exploration = c * Math.sqrt(Math.log(parent.visits) / node.visits);

    return exploitation + exploration;
  }

  /**
   * Select best child node using UCB1 formula
   */
  private bestChild(node: MCTSNode, explorationConstant: number): MCTSNode | null {
    if (node.children.length === 0) {
      return null;
    }

    let bestChild = node.children[0];
    let bestValue = this.ucb1(bestChild, node, explorationConstant);

    for (let i = 1; i < node.children.length; i++) {
      const child = node.children[i];
      const value = this.ucb1(child, node, explorationConstant);

      if (value > bestValue) {
        bestValue = value;
        bestChild = child;
      }
    }

    return bestChild;
  }

  /**
   * Simple move application (for expanding tree)
   * NOTE: This is simplified and may not handle all edge cases
   * For production, should use full game rules engine
   */
  private applyMove(board: BoardPosition[], move: Move): BoardPosition[] {
    // Deep clone board
    const newBoard = board.map(pos => ({
      pointIndex: pos.pointIndex,
      checkers: pos.checkers.map(c => ({ ...c }))
    }));

    // Find source and destination
    const fromPos = newBoard.find(p => p.pointIndex === move.from);
    const toPos = newBoard.find(p => p.pointIndex === move.to);

    if (!fromPos || !toPos) {
      return newBoard; // Invalid move, return unchanged
    }

    // Find checker to move
    const checkerIndex = fromPos.checkers.findIndex(c => c.id === move.checkerId);
    if (checkerIndex === -1) {
      return newBoard; // Checker not found
    }

    // Move checker
    const checker = fromPos.checkers.splice(checkerIndex, 1)[0];
    checker.position = move.to;

    // Handle hit (simplified)
    if (toPos.checkers.length === 1 && toPos.checkers[0].player !== checker.player) {
      const hitChecker = toPos.checkers.pop()!;
      hitChecker.position = 24; // Bar
      const bar = newBoard.find(p => p.pointIndex === 24);
      if (bar) bar.checkers.push(hitChecker);
    }

    toPos.checkers.push(checker);

    return newBoard;
  }

  /**
   * Get available moves for a player (simplified)
   * NOTE: This is a placeholder - should use proper move generation from game rules
   */
  private getAvailableMoves(board: BoardPosition[], player: Player): Move[] {
    // Simplified: just return empty array
    // In real implementation, would generate all legal moves
    // For MCTS purposes, we rely on the rollout engine to handle move generation
    return [];
  }

  /**
   * Get statistics about the search
   */
  getStats(): { nodesCreated: number; simulationsRun: number } {
    return {
      nodesCreated: this.nodesCreated,
      simulationsRun: this.simulationsRun
    };
  }

  /**
   * Get detailed move statistics from last search
   * Returns top moves sorted by visit count with their win rates
   */
  getMoveStatistics(topN: number = 5): Array<{
    move: Move;
    visits: number;
    winRate: number;
    score: number;
  }> {
    if (!this.lastRoot || this.lastRoot.children.length === 0) {
      return [];
    }

    // Extract move statistics from root children
    const moveStats = this.lastRoot.children
      .filter(child => child.move !== null)
      .map(child => ({
        move: child.move!,
        visits: child.visits,
        winRate: child.visits > 0 ? child.totalReward / child.visits : 0,
        score: child.visits > 0 ? child.totalReward / child.visits : 0
      }));

    // Sort by visits (most robust indicator)
    moveStats.sort((a, b) => b.visits - a.visits);

    // Return top N
    return moveStats.slice(0, topN);
  }

  /**
   * Get selected move statistics (best move from last search)
   */
  getSelectedMoveStats(): { visits: number; winRate: number } | null {
    if (!this.lastRoot || this.lastRoot.children.length === 0) {
      return null;
    }

    // Find child with most visits (the selected move)
    const bestChild = this.lastRoot.children.reduce((best, child) =>
      child.visits > best.visits ? child : best
    );

    return {
      visits: bestChild.visits,
      winRate: bestChild.visits > 0 ? bestChild.totalReward / bestChild.visits : 0
    };
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this.nodesCreated = 0;
    this.simulationsRun = 0;
    this.lastRoot = null;
  }
}
