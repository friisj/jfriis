import { MatchManager } from '../match';
import {
  Player,
  PlayerType,
  GameValue,
  MatchConfiguration,
  OFF_POSITION,
  BAR_POSITION,
  DEFAULT_MATCH_CONFIG
} from '../types';
import { createTestBoard } from './testUtils';

describe('MatchManager', () => {
  const mockPlayers = {
    [Player.WHITE]: { type: PlayerType.HUMAN, name: 'White Player' },
    [Player.BLACK]: { type: PlayerType.HUMAN, name: 'Black Player' }
  };

  describe('createMatch', () => {
    it('should create a new match with default configuration', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true };
      const matchState = MatchManager.createMatch(config, mockPlayers);

      expect(matchState.matchId).toBeDefined();
      expect(matchState.configuration).toEqual(config);
      expect(matchState.scores[Player.WHITE]).toBe(0);
      expect(matchState.scores[Player.BLACK]).toBe(0);
      expect(matchState.gamesPlayed).toBe(0);
      expect(matchState.currentGameNumber).toBe(1);
      expect(matchState.matchWinner).toBeNull();
      expect(matchState.isCrawfordGame).toBe(false);
      expect(matchState.crawfordGamePlayed).toBe(false);
      expect(matchState.isPostCrawford).toBe(false);
      expect(matchState.gameHistory).toEqual([]);
      expect(matchState.automaticDoublesThisGame).toBe(0);
    });

    it('should create match with custom target points', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 7 };
      const matchState = MatchManager.createMatch(config, mockPlayers);

      expect(matchState.configuration.targetPoints).toBe(7);
    });
  });

  describe('initializeDoublingCube', () => {
    it('should initialize cube at value 1 with no automatic doubles', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, doublingCubeEnabled: true };
      const cube = MatchManager.initializeDoublingCube(config, false, 0);

      expect(cube.value).toBe(1);
      expect(cube.owner).toBeNull();
      expect(cube.lastDoubler).toBeNull();
      expect(cube.canDouble).toBe(true);
    });

    it('should initialize cube at value 2 with one automatic double', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, doublingCubeEnabled: true };
      const cube = MatchManager.initializeDoublingCube(config, false, 1);

      expect(cube.value).toBe(2);
      expect(cube.owner).toBeNull();
    });

    it('should disable doubling during Crawford game', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, doublingCubeEnabled: true };
      const cube = MatchManager.initializeDoublingCube(config, true, 0);

      expect(cube.canDouble).toBe(false);
    });

    it('should disable doubling when cube not enabled', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, doublingCubeEnabled: false };
      const cube = MatchManager.initializeDoublingCube(config, false, 0);

      expect(cube.canDouble).toBe(false);
    });
  });

  describe('calculateGameValue', () => {
    it('should return SINGLE when loser bore off checkers', () => {
      const board = createTestBoard({
        white: { [OFF_POSITION]: 15 }, // All off
        black: { [OFF_POSITION]: 5, 0: 10 } // Some off
      });

      const gameValue = MatchManager.calculateGameValue(board, Player.WHITE);
      expect(gameValue).toBe(GameValue.SINGLE);
    });

    it('should return GAMMON when loser bore off no checkers', () => {
      const board = createTestBoard({
        white: { [OFF_POSITION]: 15 }, // All off
        black: { 0: 5, 1: 5, 2: 5 } // None off, not in white home
      });

      const gameValue = MatchManager.calculateGameValue(board, Player.WHITE);
      expect(gameValue).toBe(GameValue.GAMMON);
    });

    it('should return BACKGAMMON when loser has checkers in winner home board', () => {
      const board = createTestBoard({
        white: { [OFF_POSITION]: 15 }, // All off
        black: { 18: 1, 0: 14 } // One in white home (18-23)
      });

      const gameValue = MatchManager.calculateGameValue(board, Player.WHITE);
      expect(gameValue).toBe(GameValue.BACKGAMMON);
    });

    it('should return BACKGAMMON when loser has checkers on bar', () => {
      const board = createTestBoard({
        white: { [OFF_POSITION]: 15 }, // All off
        black: { [BAR_POSITION]: 1, 0: 14 } // One on bar
      });

      const gameValue = MatchManager.calculateGameValue(board, Player.WHITE);
      expect(gameValue).toBe(GameValue.BACKGAMMON);
    });

    it('should correctly identify gammon for black winner', () => {
      const board = createTestBoard({
        black: { [OFF_POSITION]: 15 }, // All off
        white: { 23: 5, 22: 5, 21: 5 } // None off
      });

      const gameValue = MatchManager.calculateGameValue(board, Player.BLACK);
      expect(gameValue).toBe(GameValue.GAMMON);
    });
  });

  describe('calculatePointsAwarded', () => {
    it('should calculate points for single game', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG };
      const points = MatchManager.calculatePointsAwarded(GameValue.SINGLE, 1, config);
      expect(points).toBe(1);
    });

    it('should calculate points for gammon', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG };
      const points = MatchManager.calculatePointsAwarded(GameValue.GAMMON, 1, config);
      expect(points).toBe(2);
    });

    it('should calculate points for backgammon', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG };
      const points = MatchManager.calculatePointsAwarded(GameValue.BACKGAMMON, 1, config);
      expect(points).toBe(3);
    });

    it('should multiply by cube value', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG };
      const points = MatchManager.calculatePointsAwarded(GameValue.GAMMON, 4, config);
      expect(points).toBe(8); // 2 × 4
    });

    it('should apply Jacoby rule when enabled', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, useJacobyRule: true };
      const points = MatchManager.calculatePointsAwarded(GameValue.GAMMON, 1, config);
      expect(points).toBe(1); // Reduced to 1 because cube not turned
    });

    it('should not apply Jacoby rule when cube was turned', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, useJacobyRule: true };
      const points = MatchManager.calculatePointsAwarded(GameValue.GAMMON, 2, config);
      expect(points).toBe(4); // 2 × 2, Jacoby not applied
    });

    it('should not apply Jacoby rule for single games', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, useJacobyRule: true };
      const points = MatchManager.calculatePointsAwarded(GameValue.SINGLE, 1, config);
      expect(points).toBe(1);
    });
  });

  describe('awardPoints', () => {
    it('should award points and return new match state immutably', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true };
      const matchState = MatchManager.createMatch(config, mockPlayers);

      const result = MatchManager.awardPoints(
        matchState,
        Player.WHITE,
        GameValue.SINGLE,
        1,
        50
      );

      // Original state should be unchanged
      expect(matchState.scores[Player.WHITE]).toBe(0);
      expect(matchState.scores[Player.BLACK]).toBe(0);
      expect(matchState.gamesPlayed).toBe(0);
      expect(matchState.gameHistory.length).toBe(0);

      // New state should be updated
      expect(result.matchState.scores[Player.WHITE]).toBe(1);
      expect(result.matchState.scores[Player.BLACK]).toBe(0);
      expect(result.matchState.gamesPlayed).toBe(1);
      expect(result.matchState.gameHistory.length).toBe(1);
      expect(result.gameResult.winner).toBe(Player.WHITE);
      expect(result.gameResult.gameValue).toBe(GameValue.SINGLE);
      expect(result.gameResult.cubeValue).toBe(1);
      expect(result.gameResult.pointsAwarded).toBe(1);
      expect(result.gameResult.moveCount).toBe(50);
    });

    it('should accumulate scores across multiple games immutably', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true };
      let matchState = MatchManager.createMatch(config, mockPlayers);

      const result1 = MatchManager.awardPoints(matchState, Player.WHITE, GameValue.SINGLE, 1, 50);
      matchState = result1.matchState;

      const result2 = MatchManager.awardPoints(matchState, Player.BLACK, GameValue.GAMMON, 1, 45);
      matchState = result2.matchState;

      const result3 = MatchManager.awardPoints(matchState, Player.WHITE, GameValue.SINGLE, 1, 40);
      matchState = result3.matchState;

      expect(matchState.scores[Player.WHITE]).toBe(2);
      expect(matchState.scores[Player.BLACK]).toBe(2);
      expect(matchState.gamesPlayed).toBe(3);
    });
  });

  describe('checkMatchWinner', () => {
    it('should return null when no player has reached target', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5 };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 3;
      matchState.scores[Player.BLACK] = 2;

      const winner = MatchManager.checkMatchWinner(matchState);
      expect(winner).toBeNull();
    });

    it('should return WHITE when white reaches target', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5 };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 5;
      matchState.scores[Player.BLACK] = 3;

      const winner = MatchManager.checkMatchWinner(matchState);
      expect(winner).toBe(Player.WHITE);
    });

    it('should return BLACK when black reaches target', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 7 };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 4;
      matchState.scores[Player.BLACK] = 7;

      const winner = MatchManager.checkMatchWinner(matchState);
      expect(winner).toBe(Player.BLACK);
    });

    it('should handle exceeding target points', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5 };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 8; // Exceeded by winning backgammon

      const winner = MatchManager.checkMatchWinner(matchState);
      expect(winner).toBe(Player.WHITE);
    });
  });

  describe('Crawford Rule', () => {
    it('should enter Crawford game when white is 1 away', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5, useCrawfordRule: true };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 4; // 1 away
      matchState.scores[Player.BLACK] = 2;

      const newMatchState = MatchManager.startNextGame(matchState);

      expect(newMatchState.isCrawfordGame).toBe(true);
      expect(newMatchState.crawfordGamePlayed).toBe(false);
    });

    it('should enter Crawford game when black is 1 away', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 7, useCrawfordRule: true };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 3;
      matchState.scores[Player.BLACK] = 6; // 1 away

      const newMatchState = MatchManager.startNextGame(matchState);

      expect(newMatchState.isCrawfordGame).toBe(true);
    });

    it('should not enter Crawford if both players are 1 away', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5, useCrawfordRule: true };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 4;
      matchState.scores[Player.BLACK] = 4;

      const newMatchState = MatchManager.startNextGame(matchState);

      expect(newMatchState.isCrawfordGame).toBe(false);
    });

    it('should exit Crawford game after completion and enter post-Crawford', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5, useCrawfordRule: true };
      let matchState = MatchManager.createMatch(config, mockPlayers);

      // Set scores to trigger Crawford on next game start
      matchState.scores[Player.WHITE] = 4;
      matchState.scores[Player.BLACK] = 2;

      // Start next game - should enter Crawford
      matchState = MatchManager.startNextGame(matchState);
      expect(matchState.isCrawfordGame).toBe(true);
      expect(matchState.currentGameNumber).toBe(2);

      // Now start another game - should exit Crawford
      // Update scores immutably to simulate Crawford game being played
      matchState = {
        ...matchState,
        scores: {
          ...matchState.scores,
          [Player.BLACK]: 3
        }
      };
      matchState = MatchManager.startNextGame(matchState);

      expect(matchState.isCrawfordGame).toBe(false);
      expect(matchState.crawfordGamePlayed).toBe(true);
      expect(matchState.isPostCrawford).toBe(true);
      expect(matchState.currentGameNumber).toBe(3);
    });

    it('should not enter Crawford game if already played', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5, useCrawfordRule: true };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.crawfordGamePlayed = true;
      matchState.scores[Player.WHITE] = 4;
      matchState.scores[Player.BLACK] = 2;

      const newMatchState = MatchManager.startNextGame(matchState);

      expect(newMatchState.isCrawfordGame).toBe(false);
      expect(newMatchState.isPostCrawford).toBe(true);
    });

    it('should not apply Crawford rule when disabled', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5, useCrawfordRule: false };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 4;
      matchState.scores[Player.BLACK] = 2;

      const newMatchState = MatchManager.startNextGame(matchState);

      expect(newMatchState.isCrawfordGame).toBe(false);
    });
  });

  describe('checkAutomaticDoubles', () => {
    it('should return true when both players roll same total', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, automaticDoubles: true };
      const result = MatchManager.checkAutomaticDoubles([3, 4], [5, 2], config);
      expect(result).toBe(true); // Both sum to 7
    });

    it('should return false when totals differ', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, automaticDoubles: true };
      const result = MatchManager.checkAutomaticDoubles([3, 4], [5, 3], config);
      expect(result).toBe(false); // 7 vs 8
    });

    it('should return false when automatic doubles disabled', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, automaticDoubles: false };
      const result = MatchManager.checkAutomaticDoubles([3, 4], [5, 2], config);
      expect(result).toBe(false);
    });
  });

  describe('applyAutomaticDouble', () => {
    it('should double the cube value immutably', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, maxDoubles: 64 };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      const cube = MatchManager.initializeDoublingCube(config, false, 0);

      const result = MatchManager.applyAutomaticDouble(cube, matchState);

      // Original state should be unchanged
      expect(cube.value).toBe(1);
      expect(matchState.automaticDoublesThisGame).toBe(0);

      // New state should be updated
      expect(result).not.toBeNull();
      expect(result!.doublingCube.value).toBe(2);
      expect(result!.matchState.automaticDoublesThisGame).toBe(1);
    });

    it('should not exceed max doubles', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, maxDoubles: 4 };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      const cube = MatchManager.initializeDoublingCube(config, false, 0);
      cube.value = 4;

      const result = MatchManager.applyAutomaticDouble(cube, matchState);

      // Should return null when cannot apply
      expect(result).toBeNull();

      // Original state should be unchanged
      expect(cube.value).toBe(4);
      expect(matchState.automaticDoublesThisGame).toBe(0);
    });
  });

  describe('getMatchStatus', () => {
    it('should identify leading player', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5 };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 3;
      matchState.scores[Player.BLACK] = 1;

      const status = MatchManager.getMatchStatus(matchState);

      expect(status.leadingPlayer).toBe(Player.WHITE);
      expect(status.pointsDifference).toBe(2);
    });

    it('should return null when scores tied', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5 };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 2;
      matchState.scores[Player.BLACK] = 2;

      const status = MatchManager.getMatchStatus(matchState);

      expect(status.leadingPlayer).toBeNull();
      expect(status.pointsDifference).toBe(0);
    });

    it('should indicate match point', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5 };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.scores[Player.WHITE] = 4;
      matchState.scores[Player.BLACK] = 2;

      const status = MatchManager.getMatchStatus(matchState);

      expect(status.gamesRemaining).toBe('Match point');
    });

    it('should reflect Crawford state', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true, targetPoints: 5, useCrawfordRule: true };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.isCrawfordGame = true;

      const status = MatchManager.getMatchStatus(matchState);

      expect(status.isCrawford).toBe(true);
      expect(status.isPostCrawford).toBe(false);
    });
  });

  describe('startNextGame', () => {
    it('should increment game number immutably', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true };
      const matchState = MatchManager.createMatch(config, mockPlayers);

      const newMatchState = MatchManager.startNextGame(matchState);

      // Original should be unchanged
      expect(matchState.currentGameNumber).toBe(1);

      // New state should be updated
      expect(newMatchState.currentGameNumber).toBe(2);
    });

    it('should reset automatic doubles counter immutably', () => {
      const config: MatchConfiguration = { ...DEFAULT_MATCH_CONFIG, enabled: true };
      const matchState = MatchManager.createMatch(config, mockPlayers);
      matchState.automaticDoublesThisGame = 2;

      const newMatchState = MatchManager.startNextGame(matchState);

      // Original should be unchanged
      expect(matchState.automaticDoublesThisGame).toBe(2);

      // New state should be updated
      expect(newMatchState.automaticDoublesThisGame).toBe(0);
    });
  });
});
