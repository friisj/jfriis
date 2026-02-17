// @ts-nocheck
/**
 * Gameplay Audit System - Board State Compression
 *
 * Utilities for compressing and decompressing board states
 * Strategy: Delta encoding + Run-length encoding + zlib + base64
 * Target: ~5.4x compression ratio
 */

import { BoardPosition } from '../game/types';
import { logger } from '../utils/logger';
import pako from 'pako';

// =====================================================
// Board State Serialization
// =====================================================

interface SerializedBoardState {
  positions: Array<{
    pointIndex: number;
    checkers: Array<{
      player: string;
      position: number;
    }>;
  }>;
}

/**
 * Convert BoardPosition array to serializable format
 */
export function serializeBoardState(board: BoardPosition[]): SerializedBoardState {
  return {
    positions: board.map(pos => ({
      pointIndex: pos.pointIndex,
      checkers: pos.checkers.map(checker => ({
        player: checker.player,
        position: checker.position
      }))
    }))
  };
}

/**
 * Convert serialized format back to BoardPosition array
 */
export function deserializeBoardState(serialized: SerializedBoardState): BoardPosition[] {
  return serialized.positions.map(pos => ({
    pointIndex: pos.pointIndex,
    checkers: pos.checkers.map((checker, index) => ({
      id: `${checker.player}-${pos.pointIndex}-${index}`,
      player: checker.player as 'white' | 'black',
      position: checker.position
    }))
  }));
}

// =====================================================
// Delta Encoding
// =====================================================

/**
 * Encode board state as delta from previous state
 * Only stores changes, significantly reducing size for similar positions
 */
export function encodeDelta(
  currentBoard: BoardPosition[],
  previousBoard: BoardPosition[] | null
): SerializedBoardState | { delta: string } {
  if (!previousBoard) {
    // No previous state, return full state
    return serializeBoardState(currentBoard);
  }

  const current = serializeBoardState(currentBoard);
  const previous = serializeBoardState(previousBoard);

  // Find positions that changed
  const changes: Record<string, unknown> = {};
  let hasChanges = false;

  for (let i = 0; i < current.positions.length; i++) {
    const currPos = current.positions[i];
    const prevPos = previous.positions[i];

    // Compare checker counts and positions
    if (JSON.stringify(currPos) !== JSON.stringify(prevPos)) {
      changes[i] = currPos;
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    return { delta: 'UNCHANGED' };
  }

  return { delta: JSON.stringify(changes) };
}

// =====================================================
// Run-Length Encoding
// =====================================================

/**
 * Apply run-length encoding to JSON string
 * Compresses repeated patterns like empty points
 */
function runLengthEncode(str: string): string {
  if (!str) return '';

  let encoded = '';
  let count = 1;
  let current = str[0];

  for (let i = 1; i < str.length; i++) {
    if (str[i] === current && count < 255) {
      count++;
    } else {
      if (count > 3) {
        // Only use RLE if it saves space
        encoded += `~${count}${current}`;
      } else {
        encoded += current.repeat(count);
      }
      current = str[i];
      count = 1;
    }
  }

  // Handle last run
  if (count > 3) {
    encoded += `~${count}${current}`;
  } else {
    encoded += current.repeat(count);
  }

  return encoded;
}

/**
 * Decode run-length encoded string
 */
function runLengthDecode(str: string): string {
  if (!str) return '';

  let decoded = '';
  let i = 0;

  while (i < str.length) {
    if (str[i] === '~') {
      // Parse count
      i++; // Skip ~
      let countStr = '';
      while (i < str.length && str[i] >= '0' && str[i] <= '9') {
        countStr += str[i];
        i++;
      }
      const count = parseInt(countStr, 10);
      const char = str[i];
      decoded += char.repeat(count);
      i++;
    } else {
      decoded += str[i];
      i++;
    }
  }

  return decoded;
}

// =====================================================
// Compression Pipeline
// =====================================================

/**
 * Compress board state using full pipeline:
 * 1. Serialize to JSON
 * 2. Apply run-length encoding
 * 3. Compress with zlib
 * 4. Encode as base64
 */
export function compressBoardState(
  board: BoardPosition[],
  previousBoard: BoardPosition[] | null = null
): string {
  try {
    // Step 1: Serialize (with optional delta encoding)
    const serialized = previousBoard
      ? encodeDelta(board, previousBoard)
      : serializeBoardState(board);

    const jsonStr = JSON.stringify(serialized);

    // Step 2: Run-length encoding
    const rleEncoded = runLengthEncode(jsonStr);

    // Step 3: zlib compression
    const compressed = pako.deflate(rleEncoded, { level: 9 });

    // Step 4: Base64 encoding
    const base64 = Buffer.from(compressed).toString('base64');

    logger.debug(
      `Compression: ${jsonStr.length}B → ${rleEncoded.length}B (RLE) → ${compressed.length}B (zlib) → ${base64.length}B (base64)`
    );

    return base64;
  } catch (err) {
    logger.error('Board state compression failed', err);
    // Fallback: return uncompressed JSON
    return JSON.stringify(serializeBoardState(board));
  }
}

/**
 * Decompress board state through full pipeline:
 * 1. Decode base64
 * 2. Decompress with zlib
 * 3. Decode run-length encoding
 * 4. Parse JSON
 * 5. Deserialize to BoardPosition[]
 */
export function decompressBoardState(
  compressed: string,
  previousBoard: BoardPosition[] | null = null
): BoardPosition[] | null {
  try {
    // Check if it's uncompressed (fallback format)
    if (compressed.startsWith('{') || compressed.startsWith('[')) {
      const parsed = JSON.parse(compressed) as SerializedBoardState;
      return deserializeBoardState(parsed);
    }

    // Step 1: Base64 decode
    const binaryData = Buffer.from(compressed, 'base64');

    // Step 2: zlib decompression
    const decompressed = pako.inflate(binaryData, { to: 'string' });

    // Step 3: Run-length decode
    const rleDecoded = runLengthDecode(decompressed);

    // Step 4: Parse JSON
    const parsed = JSON.parse(rleDecoded);

    // Step 5: Handle delta or full state
    if (parsed.delta) {
      if (parsed.delta === 'UNCHANGED') {
        return previousBoard;
      }

      if (!previousBoard) {
        logger.error('Delta state requires previous board');
        return null;
      }

      // Apply delta to previous state
      const changes = JSON.parse(parsed.delta);
      const result = serializeBoardState(previousBoard);

      for (const [index, newPos] of Object.entries(changes)) {
        result.positions[parseInt(index, 10)] = newPos as typeof result.positions[0];
      }

      return deserializeBoardState(result);
    }

    // Full state
    return deserializeBoardState(parsed as SerializedBoardState);
  } catch (err) {
    logger.error('Board state decompression failed', err);
    return null;
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Calculate pip counts from board state
 */
export function calculatePipCounts(board: BoardPosition[]): {
  white: number;
  black: number;
} {
  let whitePips = 0;
  let blackPips = 0;

  for (const position of board) {
    if (position.pointIndex < 24) {
      // Regular points (0-23)
      for (const checker of position.checkers) {
        const distance =
          checker.player === 'white'
            ? 24 - checker.position
            : checker.position + 1;

        if (checker.player === 'white') {
          whitePips += distance;
        } else {
          blackPips += distance;
        }
      }
    } else if (position.pointIndex === 24) {
      // Bar
      const whiteOnBar = position.checkers.filter(c => c.player === 'white').length;
      const blackOnBar = position.checkers.filter(c => c.player === 'black').length;
      whitePips += whiteOnBar * 25;
      blackPips += blackOnBar * 25;
    }
    // OFF_POSITION (25) doesn't count toward pips
  }

  return { white: whitePips, black: blackPips };
}

/**
 * Count checkers on bar
 */
export function countCheckersOnBar(board: BoardPosition[]): {
  white: number;
  black: number;
} {
  const barPosition = board.find(pos => pos.pointIndex === 24);

  if (!barPosition) {
    return { white: 0, black: 0 };
  }

  const white = barPosition.checkers.filter(c => c.player === 'white').length;
  const black = barPosition.checkers.filter(c => c.player === 'black').length;

  return { white, black };
}

/**
 * Count checkers borne off
 */
export function countCheckersOff(board: BoardPosition[]): {
  white: number;
  black: number;
} {
  const offPosition = board.find(pos => pos.pointIndex === 25);

  if (!offPosition) {
    return { white: 0, black: 0 };
  }

  const white = offPosition.checkers.filter(c => c.player === 'white').length;
  const black = offPosition.checkers.filter(c => c.player === 'black').length;

  return { white, black };
}

/**
 * Create snapshot metadata from board state
 */
export function createSnapshotMetadata(board: BoardPosition[]) {
  const pipCounts = calculatePipCounts(board);
  const checkersOnBar = countCheckersOnBar(board);
  const checkersOff = countCheckersOff(board);

  return {
    white_pip_count: pipCounts.white,
    black_pip_count: pipCounts.black,
    white_checkers_on_bar: checkersOnBar.white,
    black_checkers_on_bar: checkersOnBar.black,
    white_checkers_off: checkersOff.white,
    black_checkers_off: checkersOff.black
  };
}
