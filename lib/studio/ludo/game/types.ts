export enum Player {
  WHITE = 'white',
  BLACK = 'black'
}

export enum PlayMode {
  TWO_PLAYER = 'two_player',
  AI_OPPONENT = 'ai_opponent',
  AI_VS_AI = 'ai_vs_ai',
  NETWORK_MULTIPLAYER = 'network_multiplayer'
}

export enum PlayerType {
  HUMAN = 'human',
  AI = 'ai',
  NETWORK = 'network'
}

export enum GameType {
  SINGLE = 'single',           // One-off game (current default)
  MATCH = 'match',             // Match to N points
  MONEY = 'money'              // Money game (future)
}

export enum GameFlowState {
  INITIAL = 'initial',         // App just loaded
  SETTINGS = 'settings',       // Configuring new game/match
  PLAYING = 'playing',         // Active gameplay
  INTERMISSION = 'intermission', // Between games in a match
  MATCH_END = 'match_end'      // Match complete
}

export enum GameValue {
  SINGLE = 1,                  // Normal win
  GAMMON = 2,                  // Winner bore off all, loser bore off none
  BACKGAMMON = 3               // Gammon + loser has checkers in winner's home/bar
}

export interface PlayerConfig {
  type: PlayerType;
  name: string;
  aiSettings?: import('../ai/types').AISettings;
}

export interface Checker {
  id: string;
  player: Player;
  position: number; // 0-23 (board points), 24 (bar), 25 (off)
}

export interface BoardPosition {
  pointIndex: number;
  checkers: Checker[];
}

export interface Move {
  checkerId: string;
  from: number;
  to: number;
  distance: number;
}

export interface PendingAnimation {
  id: string;
  type: 'move' | 'hit' | 'bear_off';
  checkerId: string;
  from: number;
  to: number;
  timestamp: number;
  player: Player;
  move?: Move;  // The actual move to execute after animation (undefined for hit animations)
}

// ============== MATCH SCORING TYPES ==============

export interface MatchConfiguration {
  enabled: boolean;              // Is this a match or single game?
  targetPoints: number;          // Match length (3, 5, 7, 11, 15, 21)
  useCrawfordRule: boolean;      // Enable Crawford rule
  useJacobyRule: boolean;        // Gammons/backgammons don't count without doubling
  automaticDoubles: boolean;     // Enable automatic doubles on same opening roll
  doublingCubeEnabled: boolean;  // Enable doubling cube
  maxDoubles: number;            // Maximum cube value (64 default)
}

export interface DoublingCubeState {
  value: number;                 // 1, 2, 4, 8, 16, 32, 64
  owner: Player | null;          // null = centered (both can double), Player = owns cube
  lastDoubler: Player | null;    // Who doubled last
  canDouble: boolean;            // Can current player double this turn?
}

export interface GameResult {
  gameNumber: number;
  winner: Player;
  gameValue: GameValue;
  cubeValue: number;             // Multiplier from doubling cube
  pointsAwarded: number;         // gameValue × cubeValue
  finalScore: {
    [Player.WHITE]: number;
    [Player.BLACK]: number;
  };
  moveCount: number;
  timestamp: number;
}

export interface MatchState {
  matchId: string;
  configuration: MatchConfiguration;
  scores: {
    [Player.WHITE]: number;
    [Player.BLACK]: number;
  };
  gamesPlayed: number;
  currentGameNumber: number;
  matchWinner: Player | null;

  // Crawford rule state
  isCrawfordGame: boolean;       // True when trailing player is 1 away
  crawfordGamePlayed: boolean;   // True after Crawford game completes
  isPostCrawford: boolean;       // True for games after Crawford

  // Game history
  gameHistory: GameResult[];

  // Automatic doubles tracking
  automaticDoublesThisGame: number;  // Count of auto-doubles in current game
}

export interface OpeningRollState {
  whiteRoll: number | null;      // White's die value (1-6)
  blackRoll: number | null;      // Black's die value (1-6)
  resolved: boolean;             // Has the opening roll been resolved?
  rerollCount: number;           // Track automatic doubles (for tied rolls)
}

export interface GameState {
  board: BoardPosition[];
  currentPlayer: Player;
  dice: number[] | null;
  availableMoves: Move[];
  gamePhase: 'setup' | 'opening_roll' | 'rolling' | 'moving' | 'forced_move' | 'no_moves' | 'ai_thinking' | 'finished';
  gameFlowState: GameFlowState; // UI flow state (settings, playing, intermission, match end)
  winner: Player | null;
  usedDice: boolean[];
  selectedChecker: string | null;
  playMode: PlayMode;
  players: {
    [Player.WHITE]: PlayerConfig;
    [Player.BLACK]: PlayerConfig;
  };

  // Match scoring (optional - undefined for single games)
  matchState?: MatchState;
  doublingCube?: DoublingCubeState;
  pendingDouble?: {
    offeredBy: Player;
    timestamp: number;
  };
  gameType: GameType;            // Default: SINGLE
  moveCount: number;             // Track moves for game result

  // Opening roll state (determining starting player)
  openingRoll?: OpeningRollState;

  // Audit configuration (optional - for gameplay logging)
  auditConfig?: {
    enabled: boolean;
    mode: 'observable' | 'batch';
    sessionId: string | null;
    notes?: string;
  };
}

export interface DiceRoller {
  roll(): [number, number];
  animate?(): Promise<[number, number]>;
}

// Game constants
export const BOARD_POINTS = 24;
export const BAR_POSITION = 24;
export const OFF_POSITION = 25;
export const CHECKERS_PER_PLAYER = 15;

// Match constants
export const MATCH_LENGTHS = [3, 5, 7, 9, 11, 15, 21] as const;
export const DEFAULT_MATCH_LENGTH = 5;
export const MAX_CUBE_VALUE = 64;

// Default match configurations
export const DEFAULT_MATCH_CONFIG: MatchConfiguration = {
  enabled: false,
  targetPoints: DEFAULT_MATCH_LENGTH,
  useCrawfordRule: true,
  useJacobyRule: false,
  automaticDoubles: false,
  doublingCubeEnabled: false,
  maxDoubles: MAX_CUBE_VALUE
};

export const TOURNAMENT_MATCH_CONFIG: MatchConfiguration = {
  enabled: true,
  targetPoints: 7,
  useCrawfordRule: true,
  useJacobyRule: false,
  automaticDoubles: false,
  doublingCubeEnabled: true,
  maxDoubles: MAX_CUBE_VALUE
};

// Initial board setup - positions are 0-indexed (subtract 1 from traditional numbering)
export const INITIAL_SETUP: { [position: number]: { player: Player; count: number } } = {
  0: { player: Player.WHITE, count: 2 },   // Point 1: 2 White checkers
  5: { player: Player.BLACK, count: 5 },   // Point 6: 5 Black checkers  
  7: { player: Player.BLACK, count: 3 },   // Point 8: 3 Black checkers
  11: { player: Player.WHITE, count: 5 },  // Point 12: 5 White checkers
  12: { player: Player.BLACK, count: 5 },  // Point 13: 5 Black checkers
  16: { player: Player.WHITE, count: 3 },  // Point 17: 3 White checkers
  18: { player: Player.WHITE, count: 5 },  // Point 19: 5 White checkers
  23: { player: Player.BLACK, count: 2 }   // Point 24: 2 Black checkers
};

// Debug game states for testing specific scenarios
export const DEBUG_GAME_STATES: { [stateName: string]: { [position: number]: { player: Player; count: number } } } = {
  'bear-off-test': {
    // White home board (18-23) - ready to bear off
    18: { player: Player.WHITE, count: 3 },
    19: { player: Player.WHITE, count: 4 },
    20: { player: Player.WHITE, count: 3 },
    21: { player: Player.WHITE, count: 2 },
    22: { player: Player.WHITE, count: 2 },
    23: { player: Player.WHITE, count: 1 },
    
    // Black home board (0-5) - ready to bear off  
    0: { player: Player.BLACK, count: 2 },
    1: { player: Player.BLACK, count: 3 },
    2: { player: Player.BLACK, count: 3 },
    3: { player: Player.BLACK, count: 2 },
    4: { player: Player.BLACK, count: 3 },
    5: { player: Player.BLACK, count: 2 }
  }
};