import { Player, BoardPosition, Move, Checker, BOARD_POINTS, BAR_POSITION, OFF_POSITION } from './types';

export class GameRules {
  static isValidMove(move: Move, board: BoardPosition[], player: Player): boolean {
    const fromPosition = board.find(pos => pos.pointIndex === move.from);
    const toPosition = board.find(pos => pos.pointIndex === move.to);
    
    if (!fromPosition || !toPosition) return false;
    
    // Check if player has a checker at the from position
    const checker = fromPosition.checkers.find(c => c.id === move.checkerId && c.player === player);
    if (!checker) return false;
    
    // Check if destination is valid (not blocked by opponent)
    // OFF_POSITION allows unlimited checkers from both players
    if (move.to !== OFF_POSITION && toPosition.checkers.length >= 2 && toPosition.checkers[0].player !== player) {
      return false;
    }
    
    // Bear-off validation: can only bear off when all checkers are in home board
    if (move.to === OFF_POSITION) {
      if (!this.canBearOff(board, player)) {
        return false;
      }
      
      // Must use exact die value to bear off, or higher value from highest point
      const homeBoard = player === Player.WHITE ? [18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5];
      const homeBoardPositions = this.getPlayerCheckers(board, player)
        .map(c => c.position)
        .filter(p => homeBoard.includes(p));
      
      if (homeBoardPositions.length === 0) return false; // No checkers in home board
      
      // For bear-off with higher dice: find the furthest point from bearing off
      // White: LOWEST number in home board (18 is furthest from bearing off at 24)
      // Black: HIGHEST number in home board (5 is furthest from bearing off at -1)
      const furthestPoint = player === Player.WHITE
        ? Math.min(...homeBoardPositions)  // White: lowest point number is furthest
        : Math.max(...homeBoardPositions); // Black: highest point number is furthest
      
      // Calculate exact distance needed to bear off
      const exactDistanceToBearOff = player === Player.WHITE ? BOARD_POINTS - move.from : move.from + 1;
      
      if (move.distance >= exactDistanceToBearOff) {
        // Die roll is enough to bear off - check if it's allowed
        const isExactDistance = move.distance === exactDistanceToBearOff;
        const isHigherDieFromFurthestPoint = move.distance > exactDistanceToBearOff && move.from === furthestPoint;
        
        // Allow bear-off if: exact distance OR higher die from furthest occupied point
        if (!isExactDistance && !isHigherDieFromFurthestPoint) {
          return false;
        }
      } else {
        // Die roll is not enough to bear off
        return false;
      }
    }
    
    // Check direction (white moves 0->23, black moves 23->0)
    // Exception: bar entries are always valid direction-wise
    if (move.from !== BAR_POSITION) {
      if (player === Player.WHITE && move.from > move.to && move.to !== OFF_POSITION) return false;
      if (player === Player.BLACK && move.from < move.to && move.to !== OFF_POSITION) return false;
    }
    
    return true;
  }

  static getAvailableMoves(board: BoardPosition[], player: Player, dice: number[], usedDice: boolean[]): Move[] {
    const moves: Move[] = [];

    // Get checkers for current player - EXCLUDE checkers at OFF_POSITION
    // Checkers that have been borne off should not generate moves
    const allPlayerCheckers = this.getPlayerCheckers(board, player);
    const playerCheckers = allPlayerCheckers.filter(checker => checker.position !== OFF_POSITION);

    // Debug: Log active checker positions for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Move generation for ${player}:`, playerCheckers.map(c => `${c.id}@${c.position}`));
    }
    
    // Check if player has checkers on the bar
    const checkersOnBar = playerCheckers.filter(checker => checker.position === BAR_POSITION);
    
    // If there are checkers on the bar, ONLY allow moves from the bar
    if (checkersOnBar.length > 0) {
      dice.forEach((die, dieIndex) => {
        if (usedDice[dieIndex]) return;

        checkersOnBar.forEach(checker => {
          const destination = this.calculateDestination(checker.position, die, player);
          
          if (destination !== -1) {
            const move: Move = {
              checkerId: checker.id,
              from: checker.position,
              to: destination,
              distance: die
            };
            
            if (this.isValidMove(move, board, player)) {
              moves.push(move);
            }
          }
        });
      });
    } else {
      // No checkers on bar, allow normal moves
      dice.forEach((die, dieIndex) => {
        if (usedDice[dieIndex]) return;

        playerCheckers.forEach(checker => {
          const destination = this.calculateDestination(checker.position, die, player);

          if (destination !== -1) {
            const move: Move = {
              checkerId: checker.id,
              from: checker.position,
              to: destination,
              distance: die
            };

            if (this.isValidMove(move, board, player)) {
              moves.push(move);
            }
          }
        });
      });
    }
    
    return moves;
  }

  static calculateDestination(from: number, distance: number, player: Player): number {
    if (from === BAR_POSITION) {
      // Entering from bar
      return player === Player.WHITE ? distance - 1 : BOARD_POINTS - distance;
    }
    
    if (player === Player.WHITE) {
      const destination = from + distance;
      return destination >= BOARD_POINTS ? OFF_POSITION : destination;
    } else {
      const destination = from - distance;
      return destination < 0 ? OFF_POSITION : destination;
    }
  }

  static getPlayerCheckers(board: BoardPosition[], player: Player): Checker[] {
    const checkers: Checker[] = [];
    board.forEach(position => {
      position.checkers.forEach(checker => {
        if (checker.player === player) {
          checkers.push(checker);
        }
      });
    });
    return checkers;
  }

  static checkWinCondition(board: BoardPosition[], player: Player): boolean {
    const offPosition = board.find(pos => pos.pointIndex === OFF_POSITION);
    if (!offPosition) return false;
    
    const playerCheckersOff = offPosition.checkers.filter(c => c.player === player);
    return playerCheckersOff.length === 15; // All checkers off the board
  }

  static canBearOff(board: BoardPosition[], player: Player): boolean {
    const playerCheckers = this.getPlayerCheckers(board, player);
    const homeBoard = player === Player.WHITE ? [18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5];
    
    return playerCheckers.every(checker => 
      checker.position === OFF_POSITION || 
      homeBoard.includes(checker.position)
    );
  }

  static calculatePipCount(board: BoardPosition[], player: Player): number {
    const playerCheckers = this.getPlayerCheckers(board, player);
    let pipCount = 0;

    playerCheckers.forEach(checker => {
      if (checker.position === OFF_POSITION) {
        // Checker is already off the board - no pips needed
        return;
      } else if (checker.position === BAR_POSITION) {
        // Checker on bar needs to enter and then bear off
        pipCount += player === Player.WHITE ? 25 : 25; // Distance from bar to off
      } else {
        // Normal checker on board
        if (player === Player.WHITE) {
          // White moves from low to high numbers, needs (24 - position) to get off
          pipCount += (24 - checker.position);
        } else {
          // Black moves from high to low numbers, needs (position + 1) to get off
          pipCount += (checker.position + 1);
        }
      }
    });

    return pipCount;
  }

  // ============== RESIGN VALIDATION HELPERS ==============

  /**
   * Check if a player has borne off at least one checker
   * Required for opponent to resign at gammon value
   */
  static hasPlayerBorneOffAny(board: BoardPosition[], player: Player): boolean {
    const offPosition = board.find(pos => pos.pointIndex === OFF_POSITION);
    if (!offPosition) return false;

    const playerCheckersOff = offPosition.checkers.filter(c => c.player === player);
    return playerCheckersOff.length > 0;
  }

  /**
   * Check if a player has any checkers on the bar
   * Required for backgammon resign validation
   */
  static hasCheckersOnBar(board: BoardPosition[], player: Player): boolean {
    const barPosition = board.find(pos => pos.pointIndex === BAR_POSITION);
    if (!barPosition) return false;

    return barPosition.checkers.some(c => c.player === player);
  }

  /**
   * Check if a player has any checkers in opponent's home board
   * Required for backgammon resign validation
   */
  static hasCheckersInOpponentHome(board: BoardPosition[], player: Player): boolean {
    const playerCheckers = this.getPlayerCheckers(board, player);

    // Opponent's home board
    // For WHITE player: opponent (BLACK) home board is points 0-5
    // For BLACK player: opponent (WHITE) home board is points 18-23
    const opponentHome = player === Player.WHITE ? [0, 1, 2, 3, 4, 5] : [18, 19, 20, 21, 22, 23];

    return playerCheckers.some(checker => opponentHome.includes(checker.position));
  }
}