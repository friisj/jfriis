import { PositionEvaluator } from '../evaluation';
import { Player } from '../../game/types';
import { createTestBoard } from '../../game/__tests__/testUtils';
import { DoublingStrategy } from '../doubling';

describe('AI Position Evaluation - Strategic Positions', () => {
  describe('Escape Urgency', () => {
    it('should heavily penalize trapped checkers when opponent is bearing off', () => {
      // White has 2 checkers trapped in Black's home board, Black is bearing off
      const board = createTestBoard({
        white: { 23: 2, 18: 5, 10: 8 }, // 2 trapped deep in black home
        black: { [25]: 10, 3: 3, 2: 2 } // Black has 10 off, bearing off
      });

      const evaluation = PositionEvaluator.evaluatePosition(board, Player.WHITE);

      // Should have significant penalty due to trapped checkers + opponent bearing off
      expect(evaluation.score).toBeLessThan(-20); // Heavy penalty expected
    });

    it('should reward escape moves when trapped', () => {
      const board = createTestBoard({
        white: { 1: 1, 10: 5 }, // White trapped at position 1 (BLACK's home board)
        black: { [25]: 5, 20: 5, 21: 5 }
      });

      // Create escape move (1 → 7 with a 6) - escaping BLACK's home board
      const escapeMove = {
        checkerId: 'white-0',
        from: 1,
        to: 7,
        distance: 6
      };

      const escapeMoveValue = PositionEvaluator.evaluateMove(board, escapeMove, Player.WHITE);

      // Escape moves should have high positive value
      expect(escapeMoveValue).toBeGreaterThan(5);
    });

    it('should increase escape urgency as opponent bears off more checkers', () => {
      const boardEarly = createTestBoard({
        white: { 23: 2, 10: 5 },
        black: { [25]: 2, 5: 5, 3: 8 } // Only 2 off
      });

      const boardLate = createTestBoard({
        white: { 23: 2, 10: 5 },
        black: { [25]: 12, 2: 3 } // 12 off - critical!
      });

      const evalEarly = PositionEvaluator.evaluatePosition(boardEarly, Player.WHITE);
      const evalLate = PositionEvaluator.evaluatePosition(boardLate, Player.WHITE);

      // Later position should have much worse score due to higher urgency
      expect(evalLate.score).toBeLessThan(evalEarly.score - 10);
    });
  });

  describe('Prime Detection', () => {
    it('should recognize and value a 6-prime (full prime)', () => {
      // White has 6 consecutive points (full prime)
      const board = createTestBoard({
        white: { 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2, [25]: 3 },
        black: { 23: 2, 18: 5, 10: 8 }
      });

      const evaluation = PositionEvaluator.evaluatePosition(board, Player.WHITE);

      // Should have significant blockade score (20+ for 6-prime)
      expect(evaluation.factors.blockade).toBeGreaterThanOrEqual(20);
    });

    it('should value a 5-prime appropriately', () => {
      const board = createTestBoard({
        white: { 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, [25]: 5 },
        black: { 23: 2, 18: 5, 10: 8 }
      });

      const evaluation = PositionEvaluator.evaluatePosition(board, Player.WHITE);

      // 5-prime: 4 pairs (8) + 12 bonus = 20 total
      expect(evaluation.factors.blockade).toBe(20);
    });

    it('should value a 4-prime appropriately', () => {
      const board = createTestBoard({
        white: { 7: 2, 8: 2, 9: 2, 10: 2, [25]: 7 },
        black: { 23: 2, 18: 5, 10: 8 }
      });

      const evaluation = PositionEvaluator.evaluatePosition(board, Player.WHITE);

      // 4-prime: 3 pairs (6) + 6 bonus = 12 total
      expect(evaluation.factors.blockade).toBe(12);
    });

    it('should not award prime bonus for non-consecutive points', () => {
      const board = createTestBoard({
        white: { 7: 2, 9: 2, 11: 2, 13: 2, [25]: 7 }, // Non-consecutive
        black: { 23: 2, 18: 5, 10: 8 }
      });

      const evaluation = PositionEvaluator.evaluatePosition(board, Player.WHITE);

      // Should get basic consecutive points value but no prime bonus
      expect(evaluation.factors.blockade).toBeLessThan(6);
    });

    it('should recognize prime for black player', () => {
      const board = createTestBoard({
        black: { 16: 2, 17: 2, 18: 2, 19: 2, 20: 2, 21: 2, [25]: 3 },
        white: { 0: 2, 5: 5, 13: 8 }
      });

      const evaluation = PositionEvaluator.evaluatePosition(board, Player.BLACK);

      // Black should also get 6-prime bonus
      expect(evaluation.factors.blockade).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Win Probability - Contact vs Race', () => {
    it('should detect contact position correctly', () => {
      const contactBoard = createTestBoard({
        white: { 5: 2, 13: 5, 18: 8 },
        black: { 18: 2, 12: 5, 5: 8 }
      });

      // This is tested indirectly through doubling evaluation
      // which uses contact detection
      const evaluation = DoublingStrategy['evaluatePosition'](contactBoard, Player.WHITE);

      expect(evaluation.reason).toContain('Contact');
    });

    it('should detect race position correctly', () => {
      const raceBoard = createTestBoard({
        white: { 20: 5, 21: 5, 22: 5 },
        black: { 3: 5, 2: 5, 1: 5 }
      });

      const evaluation = DoublingStrategy['evaluatePosition'](raceBoard, Player.WHITE);

      expect(evaluation.reason).toContain('Race');
    });

    it('should calculate race win probability using pip advantage', () => {
      // White ahead by ~20 pips
      const raceBoard = createTestBoard({
        white: { 22: 5, 23: 5, [25]: 5 }, // ~25 pips
        black: { 3: 5, 2: 5, 1: 5 } // ~45 pips
      });

      const evaluation = DoublingStrategy['evaluatePosition'](raceBoard, Player.WHITE);

      // White should have >50% win probability
      expect(evaluation.winProbability).toBeGreaterThan(0.50);
      expect(evaluation.pipAdvantage).toBeGreaterThan(15);
    });

    it('should account for blots in contact positions', () => {
      const safeBoard = createTestBoard({
        white: { 10: 3, 12: 3 }, // 6 checkers, all safe
        black: { 13: 3, 18: 3 }
      });

      const blotsBoard = createTestBoard({
        white: { 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1 }, // 6 checkers, all blots!
        black: { 13: 3, 18: 3 }
      });

      const safeEval = DoublingStrategy['evaluatePosition'](safeBoard, Player.WHITE);
      const blotsEval = DoublingStrategy['evaluatePosition'](blotsBoard, Player.WHITE);

      // Blots position should have worse win probability (6 blots * -0.02 = -0.12)
      expect(blotsEval.winProbability).toBeLessThan(safeEval.winProbability);
    });
  });

  describe('Bearing Off Evaluation', () => {
    it('should highly value checkers already borne off', () => {
      const boardFewOff = createTestBoard({
        white: { [25]: 3, 22: 5, 23: 7 },
        black: { 0: 5, 1: 5, 2: 5 }
      });

      const boardManyOff = createTestBoard({
        white: { [25]: 10, 22: 3, 23: 2 },
        black: { 0: 5, 1: 5, 2: 5 }
      });

      const evalFewOff = PositionEvaluator.evaluatePosition(boardFewOff, Player.WHITE);
      const evalManyOff = PositionEvaluator.evaluatePosition(boardManyOff, Player.WHITE);

      // More checkers off should have significantly higher bearing score
      expect(evalManyOff.factors.bearing).toBeGreaterThan(evalFewOff.factors.bearing + 20);
    });

    it('should value checkers in home board ready to bear off', () => {
      const boardNotReady = createTestBoard({
        white: { 10: 5, 11: 5, 12: 5 },
        black: { 0: 5, 1: 5, 2: 5 }
      });

      const boardReady = createTestBoard({
        white: { 18: 5, 19: 5, 20: 5 }, // In home board
        black: { 0: 5, 1: 5, 2: 5 }
      });

      const evalNotReady = PositionEvaluator.evaluatePosition(boardNotReady, Player.WHITE);
      const evalReady = PositionEvaluator.evaluatePosition(boardReady, Player.WHITE);

      // Checkers in home board should have better bearing score
      expect(evalReady.factors.bearing).toBeGreaterThan(evalNotReady.factors.bearing);
    });
  });

  describe('Overall Position Scoring', () => {
    it('should favor position with pip advantage and good structure', () => {
      const goodPosition = createTestBoard({
        white: { [25]: 5, 20: 5, 21: 5 }, // Ahead, bearing off
        black: { 0: 5, 1: 5, 2: 5 }
      });

      const badPosition = createTestBoard({
        white: { 0: 5, 1: 5, 2: 5 },
        black: { [25]: 5, 20: 5, 21: 5 } // Opponent ahead
      });

      const goodEval = PositionEvaluator.evaluatePosition(goodPosition, Player.WHITE);
      const badEval = PositionEvaluator.evaluatePosition(badPosition, Player.WHITE);

      expect(goodEval.score).toBeGreaterThan(badEval.score + 20);
    });

    it('should recognize strong prime + anchor combination', () => {
      const primeAndAnchorBoard = createTestBoard({
        white: { 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2, 20: 2 }, // 6-prime + anchor
        black: { 0: 2, 10: 5, 23: 8 }
      });

      const evaluation = PositionEvaluator.evaluatePosition(primeAndAnchorBoard, Player.WHITE);

      // Should have strong positive score
      expect(evaluation.score).toBeGreaterThan(15);
      expect(evaluation.factors.blockade).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Bar Handling - Phase 2.2 Priority 5', () => {
    it('should heavily penalize checkers on the bar', () => {
      const boardNormal = createTestBoard({
        white: { 10: 5, 15: 5, 18: 5 },
        black: { 0: 5, 5: 5, 8: 5 }
      });

      const boardWithBar = createTestBoard({
        white: { 24: 2, 10: 5, 15: 5, 18: 3 }, // 2 checkers on bar (point 24)
        black: { 0: 5, 5: 5, 8: 5 }
      });

      const evalNormal = PositionEvaluator.evaluatePosition(boardNormal, Player.WHITE);
      const evalWithBar = PositionEvaluator.evaluatePosition(boardWithBar, Player.WHITE);

      // Bar checkers should create significant penalty
      expect(evalWithBar.score).toBeLessThan(evalNormal.score - 10);
    });

    it('should increase bar penalty when opponent home board is closed', () => {
      const boardOpenHome = createTestBoard({
        white: { 24: 1, 10: 5, 15: 5, 18: 4 }, // 1 on bar
        black: { 1: 2, 3: 2, 5: 2, 10: 5, 15: 4 } // Black home has gaps
      });

      const boardClosedHome = createTestBoard({
        white: { 24: 1, 10: 5, 15: 5, 18: 4 }, // 1 on bar
        black: { 0: 2, 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 } // Black home fully closed!
      });

      const evalOpenHome = PositionEvaluator.evaluatePosition(boardOpenHome, Player.WHITE);
      const evalClosedHome = PositionEvaluator.evaluatePosition(boardClosedHome, Player.WHITE);

      // Closed home board should make bar position much worse
      expect(evalClosedHome.score).toBeLessThan(evalOpenHome.score - 5);
    });

    it('should recognize checker on bar reduces position value', () => {
      const boardNoBar = createTestBoard({
        white: { 10: 5, 15: 5, 18: 5 },
        black: { 1: 2, 5: 2, 10: 5, 15: 6 }
      });

      const boardWithBar = createTestBoard({
        white: { 24: 1, 10: 5, 15: 5, 18: 4 }, // 1 checker on bar
        black: { 1: 2, 5: 2, 10: 5, 15: 6 }
      });

      const evalNoBar = PositionEvaluator.evaluatePosition(boardNoBar, Player.WHITE);
      const evalWithBar = PositionEvaluator.evaluatePosition(boardWithBar, Player.WHITE);

      // Bar position should be worse (escape urgency handles bar checkers)
      expect(evalWithBar.score).toBeLessThan(evalNoBar.score);
    });

    it('should recognize bar as critical disadvantage in race positions', () => {
      // Both players otherwise equal, but White has checker on bar
      const boardEqualRace = createTestBoard({
        white: { 20: 5, 21: 5, 22: 5 },
        black: { 3: 5, 2: 5, 1: 5 }
      });

      const boardBarInRace = createTestBoard({
        white: { 24: 1, 20: 5, 21: 5, 22: 4 }, // 1 on bar in race
        black: { 3: 5, 2: 5, 1: 5 }
      });

      const evalEqual = PositionEvaluator.evaluatePosition(boardEqualRace, Player.WHITE);
      const evalBar = PositionEvaluator.evaluatePosition(boardBarInRace, Player.WHITE);

      // Bar in race is devastating (pip disadvantage + risk)
      expect(evalBar.score).toBeLessThan(evalEqual.score - 15);
    });
  });

  describe('Anchor Strategy - Phase 2.2 Priority 5', () => {
    it('should value advanced anchors in opponent home board', () => {
      const boardNoAnchor = createTestBoard({
        white: { 10: 5, 15: 5, 18: 5 },
        black: { 5: 5, 8: 5, 12: 5 }
      });

      const boardWithAdvancedAnchor = createTestBoard({
        white: { 10: 5, 15: 3, 4: 2, 18: 5 }, // White anchor on point 4 (BLACK's home board - advanced)
        black: { 5: 5, 8: 5, 12: 5 }
      });

      const evalNoAnchor = PositionEvaluator.evaluatePosition(boardNoAnchor, Player.WHITE);
      const evalWithAnchor = PositionEvaluator.evaluatePosition(boardWithAdvancedAnchor, Player.WHITE);

      // Advanced anchor should register in the anchor factor
      expect(evalWithAnchor.factors.anchors).toBeGreaterThan(0);
      // Note: Overall score may not improve due to pip disadvantage from back checkers
      expect(evalNoAnchor.factors.anchors).toBe(0);
    });

    it('should distinguish between advanced anchors (4pt/5pt) and mid anchors', () => {
      const boardAdvancedAnchor = createTestBoard({
        white: { 10: 5, 15: 3, 4: 2, 18: 5 }, // Point 4 in BLACK's home (advanced anchor)
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const boardMidAnchor = createTestBoard({
        white: { 10: 5, 15: 3, 2: 2, 18: 5 }, // Point 2 in BLACK's home (mid anchor)
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const boardWeakAnchor = createTestBoard({
        white: { 10: 5, 15: 3, 1: 2, 18: 5 }, // Point 1 in BLACK's home (weaker)
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const evalAdvanced = PositionEvaluator.evaluatePosition(boardAdvancedAnchor, Player.WHITE);
      const evalMid = PositionEvaluator.evaluatePosition(boardMidAnchor, Player.WHITE);
      const evalWeak = PositionEvaluator.evaluatePosition(boardWeakAnchor, Player.WHITE);

      // Advanced anchor should be best, mid anchor good, weak anchor less valuable
      expect(evalAdvanced.factors.anchors).toBeGreaterThan(evalMid.factors.anchors);
      expect(evalMid.factors.anchors).toBeGreaterThan(evalWeak.factors.anchors);
    });

    it('should value multiple anchors for backgame potential', () => {
      const boardOneAnchor = createTestBoard({
        white: { 10: 5, 15: 3, 4: 2, 18: 5 }, // 1 anchor in BLACK's home
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const boardTwoAnchors = createTestBoard({
        white: { 10: 5, 15: 1, 4: 2, 3: 2, 18: 5 }, // 2 anchors in BLACK's home (4 and 3)
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const evalOneAnchor = PositionEvaluator.evaluatePosition(boardOneAnchor, Player.WHITE);
      const evalTwoAnchors = PositionEvaluator.evaluatePosition(boardTwoAnchors, Player.WHITE);

      // Multiple anchors should get bonus
      expect(evalTwoAnchors.factors.anchors).toBeGreaterThan(evalOneAnchor.factors.anchors + 3);
    });

    it('should recognize anchor value for BLACK player correctly', () => {
      // Black anchors in White's home board
      const board = createTestBoard({
        black: { 10: 5, 15: 3, 3: 2, 18: 5 }, // Black anchor on point 3 (White's 4-point)
        white: { 5: 5, 8: 5, 12: 5 }
      });

      const evaluation = PositionEvaluator.evaluatePosition(board, Player.BLACK);

      // Black should get anchor value for point 3
      expect(evaluation.factors.anchors).toBeGreaterThan(0);
    });
  });

  describe('Backgame and Holding Game Strategy - Phase 2.2 Priority 5', () => {
    it('should recognize backgame position (2+ anchors)', () => {
      const backgameBoard = createTestBoard({
        white: { 3: 2, 4: 2, 10: 3, 11: 3, 12: 3, 13: 2 }, // 2 anchors in BLACK's home + builders
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const evaluation = PositionEvaluator.evaluatePosition(backgameBoard, Player.WHITE);

      // Should recognize multiple anchors
      expect(evaluation.factors.anchors).toBeGreaterThan(10);
    });

    it('should value spare checkers in holding game positions', () => {
      const holdingNoSpares = createTestBoard({
        white: { 4: 2, 10: 5, 11: 5, 12: 3 }, // Anchor but no spares (stacks of 5)
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const holdingWithSpares = createTestBoard({
        white: { 4: 2, 10: 3, 11: 3, 12: 3, 13: 3, 14: 1 }, // Anchor + multiple spares (3 checkers)
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const evalNoSpares = PositionEvaluator.evaluatePosition(holdingNoSpares, Player.WHITE);
      const evalWithSpares = PositionEvaluator.evaluatePosition(holdingWithSpares, Player.WHITE);

      // Spares should improve timing score
      expect(evalWithSpares.factors.timing).toBeGreaterThan(evalNoSpares.factors.timing);
    });

    it('should penalize holding game without spare checkers (timing failure)', () => {
      const holdingBadTiming = createTestBoard({
        white: { 3: 2, 4: 2, 10: 6, 11: 5 }, // 2 anchors but no spares (6+5 stack)
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const evaluation = PositionEvaluator.evaluatePosition(holdingBadTiming, Player.WHITE);

      // Should have negative timing score (anchor bonus outweighed by timing penalty)
      expect(evaluation.factors.timing).toBeLessThan(0);
    });

    it('should value spare checkers highly with multiple anchors (backgame timing)', () => {
      const backgameGoodTiming = createTestBoard({
        white: { 3: 2, 4: 2, 10: 3, 11: 3, 12: 3, 13: 2 }, // 2 anchors + 3 spares
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const backgameBadTiming = createTestBoard({
        white: { 3: 2, 4: 2, 10: 6, 11: 5 }, // 2 anchors but stacked (no spares)
        black: { 20: 5, 19: 5, 18: 5 }
      });

      const evalGoodTiming = PositionEvaluator.evaluatePosition(backgameGoodTiming, Player.WHITE);
      const evalBadTiming = PositionEvaluator.evaluatePosition(backgameBadTiming, Player.WHITE);

      // Good timing should have much better score
      expect(evalGoodTiming.factors.timing).toBeGreaterThan(evalBadTiming.factors.timing + 10);
    });

    it('should reduce anchor value when far ahead in pip count (timing adjustment)', () => {
      const holdingFarAhead = createTestBoard({
        white: { 4: 2, [25]: 8, 22: 5 }, // Anchor but most checkers off (far ahead in race)
        black: { 0: 5, 1: 5, 2: 5 } // BLACK far behind
      });

      const holdingClose = createTestBoard({
        white: { 4: 2, 10: 5, 11: 5, 12: 3 }, // Anchor in active position
        black: { 10: 5, 11: 5, 12: 5 } // Both players in similar position
      });

      const evalFarAhead = PositionEvaluator.evaluatePosition(holdingFarAhead, Player.WHITE);
      const evalClose = PositionEvaluator.evaluatePosition(holdingClose, Player.WHITE);

      // Anchor less valuable when far ahead (timing multiplier 0.5x)
      // This tests the timing adjustment in anchor evaluation
      // With 8 checkers off vs opponent at 0-2, WHITE has ~50+ pip advantage
      expect(evalFarAhead.factors.anchors).toBeLessThan(evalClose.factors.anchors);
    });
  });
});
