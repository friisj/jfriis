import { GameRules } from '../rules';
import { Player, OFF_POSITION } from '../types';
import { createTestBoard } from './testUtils';

describe('Bear-off Debug - Multiple Checkers with Doubles', () => {
  it('should correctly handle white bear-off with dice [6,6,6,6]', () => {
    // Simulate scenario from screenshots
    const board = createTestBoard({
      white: {
        18: 2,  // 2 checkers at point 18
        19: 3,  // 3 checkers at point 19
        20: 3,  // 3 checkers at point 20
        21: 2,  // 2 checkers at point 21
        22: 1,  // 1 checker at point 22
        23: 1,  // 1 checker at point 23 (HIGHEST)
        [OFF_POSITION]: 3  // 3 already borne off
      },
      black: { 0: 1 }
    });

    const dice = [6, 6, 6, 6]; // Doubles
    const usedDice = [false, false, false, false];

    const moves = GameRules.getAvailableMoves(board, Player.WHITE, dice, usedDice);

    console.log('\n=== White Bear-off with [6,6,6,6] ===');
    console.log(`Total moves: ${moves.length}`);

    // Group by position
    const movesByPosition: Record<number, typeof moves> = {};
    moves.forEach(move => {
      if (!movesByPosition[move.from]) movesByPosition[move.from] = [];
      movesByPosition[move.from].push(move);
    });

    Object.keys(movesByPosition).sort((a, b) => Number(a) - Number(b)).forEach(pos => {
      console.log(`  Point ${pos}: ${movesByPosition[Number(pos)].length} moves`);
    });

    console.log('\nExpected behavior (CORRECTED):');
    console.log('  ✓ Point 18: CAN bear off (exact: 24-18=6 AND furthest point)');
    console.log('  ✗ Point 19-23: CANNOT bear off (higher die, but 18 is still occupied)');
    console.log('  Note: Must clear point 18 first before bearing off from higher points');

    // With corrected logic, only point 18 can bear off with die 6
    // because it's the furthest occupied point
    expect(movesByPosition[18]).toBeDefined();
    // Other points cannot bear off while point 18 still has checkers
    expect(movesByPosition[19]).toBeUndefined();
    expect(movesByPosition[20]).toBeUndefined();
    expect(movesByPosition[21]).toBeUndefined();
    expect(movesByPosition[22]).toBeUndefined();
    expect(movesByPosition[23]).toBeUndefined();
  });

  it('should correctly handle black bear-off with dice [6,6,6,6]', () => {
    const board = createTestBoard({
      white: { 23: 1 },
      black: {
        0: 2,  // 2 checkers at point 0
        1: 3,  // 3 checkers at point 1
        2: 3,  // 3 checkers at point 2
        3: 2,  // 2 checkers at point 3
        4: 1,  // 1 checker at point 4
        5: 1,  // 1 checker at point 5 (HIGHEST)
        [OFF_POSITION]: 3  // 3 already borne off
      }
    });

    const dice = [6, 6, 6, 6];
    const usedDice = [false, false, false, false];

    const moves = GameRules.getAvailableMoves(board, Player.BLACK, dice, usedDice);

    console.log('\n=== Black Bear-off with [6,6,6,6] ===');
    console.log(`Total moves: ${moves.length}`);

    const movesByPosition: Record<number, typeof moves> = {};
    moves.forEach(move => {
      if (!movesByPosition[move.from]) movesByPosition[move.from] = [];
      movesByPosition[move.from].push(move);
    });

    Object.keys(movesByPosition).sort((a, b) => Number(a) - Number(b)).forEach(pos => {
      console.log(`  Point ${pos}: ${movesByPosition[Number(pos)].length} moves`);
    });

    console.log('\nExpected behavior:');
    console.log('  ✗ Point 0: CANNOT (not exact, not highest)');
    console.log('  ✗ Point 1: CANNOT (not exact, not highest)');
    console.log('  ✗ Point 2: CANNOT (not exact, not highest)');
    console.log('  ✗ Point 3: CANNOT (not exact, not highest)');
    console.log('  ✗ Point 4: CANNOT (not exact, not highest)');
    console.log('  ✓ Point 5: CAN bear off (exact: 5+1=6)');

    // Verify only point 5 can bear off (exact distance)
    expect(movesByPosition[5]).toBeDefined();
    expect(movesByPosition[0]).toBeUndefined();
    expect(movesByPosition[1]).toBeUndefined();
    expect(movesByPosition[2]).toBeUndefined();
    expect(movesByPosition[3]).toBeUndefined();
    expect(movesByPosition[4]).toBeUndefined();
  });
});
