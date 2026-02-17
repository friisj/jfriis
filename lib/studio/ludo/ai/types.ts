export enum AIDifficulty {
  BEGINNER = 'beginner',
  EASY = 'easy', 
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert'
}

export enum AIPersonality {
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive',
  DEFENSIVE = 'defensive',
  TACTICAL = 'tactical'
}

export interface AISettings {
  difficulty: AIDifficulty;
  personality: AIPersonality;
  thinkingTimeMin: number; // milliseconds
  thinkingTimeMax: number; // milliseconds
  name: string;
}

export interface MoveEvaluation {
  move: import('../game/types').Move;
  score: number;
  reasoning?: string;
}

export interface AIPlayer {
  readonly settings: AISettings;
  evaluatePosition(
    board: import('../game/types').BoardPosition[], 
    player: import('../game/types').Player,
    dice: number[],
    availableMoves: import('../game/types').Move[]
  ): Promise<import('../game/types').Move>;
  
  getName(): string;
  getDifficulty(): AIDifficulty;
  getPersonality(): AIPersonality;
}

export interface PositionEvaluation {
  score: number;
  factors: {
    pipCount: number;
    blockade: number;
    safety: number;
    hitting: number;
    bearing: number;
    anchors: number;
    timing: number;  // Phase 2.2 Priority 4: spare checkers and holding game timing
  };
}