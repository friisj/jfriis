import { Player } from '../game/types';

/**
 * BoardTheme - Complete parametric configuration for a backgammon board theme.
 *
 * This interface defines all visual, geometric, and performance properties for a theme.
 * All themes must implement this interface to ensure consistency and compatibility.
 *
 * @example
 * ```typescript
 * const myTheme: BoardTheme = {
 *   name: 'Ocean',
 *   board: { dimensions: {16, 0.2, 10}, color: 0x1a3a52, ... },
 *   // ... all other required properties
 * };
 * ```
 *
 * @see {@link ./docs/theme-creation-guide.md} for step-by-step theme creation
 * @see {@link ./docs/3d-parametric-architecture.md} for architecture details
 */
export interface BoardTheme {
  /** Human-readable theme name displayed in UI */
  name: string;
  board: {
    dimensions: { width: number; height: number; thickness: number };
    color: number;
    bar: { width: number; height: number; thickness: number; color: number };
    off: { width: number; height: number; thickness: number; color: number };
  };
  points: {
    alternateColors: [number, number]; // [even, odd] point colors
    triangleDepth: number;
    triangleWidth: number;
    /** Shape of the points. 'triangle' = classic pointed, 'rounded' = beveled edges */
    shape: 'triangle' | 'rounded';
  };
  checkers: {
    radius: { top: number; bottom: number };
    height: number;
    segments: number;
    colors: {
      [Player.WHITE]: number;
      [Player.BLACK]: number;
    };
  };
  dice: {
    size: number;
    colors: {
      [Player.WHITE]: { face: number; dots: number };
      [Player.BLACK]: { face: number; dots: number };
    };
    dotRadius: number;
    dotSegments: number;
  };
  layout: {
    pointSpacing: number;
    boardSectionGap: number;
    checkerStackSpacing: number;
    dicePosition: { x: number; y: number; z: number };
  };
  /**
   * Proportional constants for position calculations.
   * All values are designed to scale proportionally with board dimensions.
   */
  proportions: {
    /** Distance from board center to triangle base edge (Z axis). Valid range: 3.5-5.5 */
    triangleBaseOffset: number;
    /** Distance from board center to triangle tip (Z axis). Valid range: 0.1-0.5 */
    triangleTipOffset: number;
    /** Starting X position for left side points. Valid range: -8.5 to -6.5 */
    leftSideStartX: number;
    /** Distance between checkers stacking toward triangle tip. Valid range: 0.5-0.6 (must be ≥ checker diameter for gap) */
    checkerStackProgressionZ: number;
    /** Bar starting Z position for white/black separation. Valid range: 0.3-1.0 */
    barSeparationZ: number;
    /** Spacing multiplier for checkers on bar (multiplied by checker diameter). Valid range: 2.0-3.5 */
    barCheckerSpacingMultiplier: number;
    /** Off area starting Z position for color separation. Valid range: 2.5-4.5 */
    offAreaSeparationZ: number;
    /** Gap between stacked checkers in off area. Valid range: 0.005-0.02 */
    offAreaStackSpacing: number;
    /** X position of off area center. Valid range: 8-10 */
    offAreaCenterX: number;
  };
  /**
   * Lighting configuration for theme-specific illumination and mood.
   * Each theme can define its own lighting characteristics for dramatic or subtle effects.
   */
  lighting: {
    /** Scene background color. Use darker colors for dramatic themes, lighter for casual themes */
    backgroundColor: number;
    /** Ambient light color (omnidirectional base illumination). Usually white (0xffffff) */
    ambientColor: number;
    /** Ambient light intensity. Valid range: 0-0.3 (higher = less dramatic shadows) */
    ambientIntensity: number;
    /** Hemisphere light sky color (light from above). Usually white/daylight (0xffffff) */
    hemisphereSkyColor: number;
    /** Hemisphere light ground color (reflected light from below). Match board color family */
    hemisphereGroundColor: number;
    /** Hemisphere light intensity. Valid range: 0-0.5 (contributes to overall ambient fill) */
    hemisphereIntensity: number;
    /** Directional light color (main shadow-casting light). Usually white (0xffffff) */
    directionalColor: number;
    /** Directional light intensity. Valid range: 0.5-2.0 (higher = stronger shadows) */
    directionalIntensity: number;
    /** Shadow map resolution (512/1024/2048/4096). Higher = sharper shadows, more memory */
    shadowMapSize: number;
  };
  /**
   * Performance optimization presets for different device capabilities.
   * Defines LOD (Level of Detail) settings for geometry complexity.
   */
  performance: {
    /** Target quality tier for this theme. Can be overridden by user settings */
    defaultTier: 'low' | 'medium' | 'high' | 'ultra';
    /** Checker geometry segments per tier. Lower = better performance, higher = smoother curves */
    checkerSegments: {
      low: number;    // Mobile/low-end: 8-12 segments
      medium: number; // Desktop: 16-20 segments
      high: number;   // High-end: 24-32 segments
      ultra: number;  // Max quality: 32-48 segments
    };
    /** Shadow map size per tier. Lower = better performance, higher = sharper shadows */
    shadowMapSize: {
      low: number;    // Mobile: 512-1024
      medium: number; // Desktop: 1024-2048
      high: number;   // High-end: 2048-4096
      ultra: number;  // Max quality: 4096-8192
    };
  };
  /**
   * Sonic/Audio configuration for procedurally generated ambient soundscape.
   * Optional - themes without sonic properties will have no ambient audio.
   */
  sonic?: {
    /** Enable/disable ambient soundscape for this theme */
    enabled: boolean;
    /** Musical key signature (e.g., 'C', 'Am', 'Eb') */
    keySignature: string;
    /** Chord progression (e.g., ['Cmaj7', 'Am7', 'Fmaj7', 'G7']) */
    chordProgression: string[];
    /** Tempo in BPM */
    tempo: number;
    /** Layer configuration */
    layers: {
      pad: { volume: number; density: number; character: number };
      arpeggio: { volume: number; density: number; character: number };
      sparkle: { volume: number; density: number; character: number };
      wash: { volume: number; density: number; character: number };
      bass: { volume: number; density: number; character: number };
    };
    /** Global effects configuration */
    effects: {
      reverb: { decay: number; wet: number };
      chorus: { wet: number; depth: number };
      delay: { wet: number; feedback: number };
    };
    /** Mood parameters */
    mood: {
      /** Valence: -1 (dark/melancholic) to 1 (bright/cheerful) */
      valence: number;
      /** Energy: 0 (calm) to 1 (energetic) */
      energy: number;
    };
  };
}

export interface BoardVariant {
  theme: BoardTheme;
  gameplay: {
    pointCount: number;
    checkersPerPlayer: number;
    // Could extend to support different game rules
  };
}

// Classic Backgammon Theme
export const CLASSIC_THEME: BoardTheme = {
  name: 'Classic',
  board: {
    dimensions: { width: 16, height: 0.2, thickness: 10 },
    color: 0x8B4513, // Saddle brown
    bar: { width: 0.8, height: 0.3, thickness: 10, color: 0x654321 },
    off: { width: 1, height: 0.1, thickness: 8, color: 0x444444 }
  },
  points: {
    alternateColors: [0xFF6B6B, 0x4ECDC4], // Red and teal
    triangleDepth: 0.01,
    triangleWidth: 0.5,
    shape: 'triangle'
  },
  checkers: {
    radius: { top: 0.25, bottom: 0.25 },
    height: 0.1,
    segments: 16,
    colors: {
      [Player.WHITE]: 0xF5F5DC, // Beige
      [Player.BLACK]: 0x2F2F2F  // Dark gray
    }
  },
  dice: {
    size: 0.5,
    colors: {
      [Player.WHITE]: { face: 0xFFFFFF, dots: 0x000000 },
      [Player.BLACK]: { face: 0x2F2F2F, dots: 0xFFFFFF }
    },
    dotRadius: 0.05,
    dotSegments: 8
  },
  layout: {
    pointSpacing: 1.2,
    boardSectionGap: 1.5,
    checkerStackSpacing: 0.12,
    dicePosition: { x: -2, y: 0.35, z: 0 }
  },
  proportions: {
    triangleBaseOffset: 4.8,
    triangleTipOffset: 0.2,
    leftSideStartX: -7.5,
    checkerStackProgressionZ: 0.55,
    barSeparationZ: 0.5,
    barCheckerSpacingMultiplier: 2.5,
    offAreaSeparationZ: 3.5,
    offAreaStackSpacing: 0.01,
    offAreaCenterX: 9
  },
  lighting: {
    backgroundColor: 0x2d5016, // Forest green
    ambientColor: 0xffffff,
    ambientIntensity: 0.1,
    hemisphereSkyColor: 0xffffff,
    hemisphereGroundColor: 0x8d6e63, // Brownish (reflected from wood board)
    hemisphereIntensity: 0.2,
    directionalColor: 0xffffff,
    directionalIntensity: 1.2,
    shadowMapSize: 2048
  },
  performance: {
    defaultTier: 'medium', // Balanced for most devices
    checkerSegments: {
      low: 8,
      medium: 16,
      high: 24,
      ultra: 32
    },
    shadowMapSize: {
      low: 512,
      medium: 1024,
      high: 2048,
      ultra: 4096
    }
  },
  sonic: {
    enabled: true,
    keySignature: 'C',
    chordProgression: ['Cmaj7', 'Am7', 'Fmaj7', 'G7'],
    tempo: 90,
    layers: {
      pad: { volume: 70, density: 20, character: 50 },
      arpeggio: { volume: 40, density: 40, character: 60 },
      sparkle: { volume: 20, density: 15, character: 70 },
      wash: { volume: 30, density: 10, character: 40 },
      bass: { volume: 50, density: 25, character: 30 }
    },
    effects: {
      reverb: { decay: 3.5, wet: 0.35 },
      chorus: { wet: 0.2, depth: 0.6 },
      delay: { wet: 0.15, feedback: 0.25 }
    },
    mood: {
      valence: 0.3,   // Slightly warm/positive
      energy: 0.4     // Calm-medium energy
    }
  }
};

// Modern Theme
export const MODERN_THEME: BoardTheme = {
  name: 'Modern',
  board: {
    dimensions: { width: 16, height: 0.3, thickness: 10 },
    color: 0x2C3E50, // Dark blue-gray
    bar: { width: 1.2, height: 0.4, thickness: 10, color: 0x34495E },
    off: { width: 1.2, height: 0.15, thickness: 8, color: 0x1A1A1A }
  },
  points: {
    alternateColors: [0x3498DB, 0x9B59B6], // Blue and purple
    triangleDepth: 0.02,
    triangleWidth: 0.6,
    shape: 'triangle'
  },
  checkers: {
    radius: { top: 0.28, bottom: 0.28 },
    height: 0.12,
    segments: 20,
    colors: {
      [Player.WHITE]: 0xECF0F1, // Light gray
      [Player.BLACK]: 0x1C1C1C  // Almost black
    }
  },
  dice: {
    size: 0.6,
    colors: {
      [Player.WHITE]: { face: 0xECF0F1, dots: 0x2C3E50 },
      [Player.BLACK]: { face: 0x1C1C1C, dots: 0x3498DB }
    },
    dotRadius: 0.035,
    dotSegments: 12
  },
  layout: {
    pointSpacing: 1.25,
    boardSectionGap: 1.8,
    checkerStackSpacing: 0.15,
    dicePosition: { x: -2.5, y: 0.35, z: 0 }
  },
  proportions: {
    triangleBaseOffset: 4.8,
    triangleTipOffset: 0.2,
    leftSideStartX: -7.5,
    checkerStackProgressionZ: 0.55,
    barSeparationZ: 0.5,
    barCheckerSpacingMultiplier: 2.5,
    offAreaSeparationZ: 3.5,
    offAreaStackSpacing: 0.01,
    offAreaCenterX: 9
  },
  lighting: {
    backgroundColor: 0x1a1a2e, // Deep blue-black
    ambientColor: 0xffffff,
    ambientIntensity: 0.08, // Slightly darker for more drama
    hemisphereSkyColor: 0xffffff,
    hemisphereGroundColor: 0x2C3E50, // Match board color
    hemisphereIntensity: 0.15, // Reduced for stronger contrast
    directionalColor: 0xffffff,
    directionalIntensity: 1.4, // Increased for dramatic shadows
    shadowMapSize: 2048
  },
  performance: {
    defaultTier: 'high', // Modern theme targets higher-end devices
    checkerSegments: {
      low: 10,
      medium: 20,
      high: 28,
      ultra: 40
    },
    shadowMapSize: {
      low: 1024,
      medium: 2048,
      high: 4096,
      ultra: 4096
    }
  },
  sonic: {
    enabled: true,
    keySignature: 'Am',
    chordProgression: ['Am7', 'F', 'C', 'G'],
    tempo: 110,
    layers: {
      pad: { volume: 80, density: 30, character: 70 },
      arpeggio: { volume: 50, density: 50, character: 80 },
      sparkle: { volume: 30, density: 25, character: 85 },
      wash: { volume: 40, density: 15, character: 60 },
      bass: { volume: 70, density: 40, character: 50 }
    },
    effects: {
      reverb: { decay: 5.0, wet: 0.45 },
      chorus: { wet: 0.3, depth: 0.8 },
      delay: { wet: 0.25, feedback: 0.35 }
    },
    mood: {
      valence: -0.2,  // Slightly dark/moody
      energy: 0.7     // More energetic
    }
  }
};

// Luxury Theme
export const LUXURY_THEME: BoardTheme = {
  name: 'Luxury',
  board: {
    dimensions: { width: 16, height: 0.25, thickness: 10 },
    color: 0x8B0000, // Dark red (mahogany)
    bar: { width: 1.0, height: 0.35, thickness: 10, color: 0xFFD700 }, // Gold
    off: { width: 1, height: 0.12, thickness: 8, color: 0x556B2F }
  },
  points: {
    alternateColors: [0xDAA520, 0x8B4513], // Goldenrod and brown
    triangleDepth: 0.015,
    triangleWidth: 0.55,
    shape: 'rounded' // Luxury theme uses rounded edges
  },
  checkers: {
    radius: { top: 0.26, bottom: 0.26 },
    height: 0.11,
    segments: 24,
    colors: {
      [Player.WHITE]: 0xFFFAF0, // Ivory
      [Player.BLACK]: 0x000000  // Pure black
    }
  },
  dice: {
    size: 0.55,
    colors: {
      [Player.WHITE]: { face: 0xFFFAF0, dots: 0x8B0000 },
      [Player.BLACK]: { face: 0x000000, dots: 0xFFD700 }
    },
    dotRadius: 0.032,
    dotSegments: 10
  },
  layout: {
    pointSpacing: 1.15,
    boardSectionGap: 1.6,
    checkerStackSpacing: 0.13,
    dicePosition: { x: -2.2, y: 0.35, z: 0 }
  },
  proportions: {
    triangleBaseOffset: 4.8,
    triangleTipOffset: 0.2,
    leftSideStartX: -7.5,
    checkerStackProgressionZ: 0.55,
    barSeparationZ: 0.5,
    barCheckerSpacingMultiplier: 2.5,
    offAreaSeparationZ: 3.5,
    offAreaStackSpacing: 0.01,
    offAreaCenterX: 9
  },
  lighting: {
    backgroundColor: 0x3a1a1a, // Dark burgundy
    ambientColor: 0xfff8e1, // Warm white
    ambientIntensity: 0.12, // Slightly brighter for warm ambience
    hemisphereSkyColor: 0xfff8e1, // Warm white from above
    hemisphereGroundColor: 0x8B0000, // Match mahogany board
    hemisphereIntensity: 0.25, // More ambient fill for softer shadows
    directionalColor: 0xfff8e1, // Warm white directional
    directionalIntensity: 1.1, // Slightly softer shadows
    shadowMapSize: 4096 // Higher resolution for luxury feel
  },
  performance: {
    defaultTier: 'ultra', // Luxury demands maximum quality
    checkerSegments: {
      low: 12,
      medium: 24,
      high: 32,
      ultra: 48
    },
    shadowMapSize: {
      low: 1024,
      medium: 2048,
      high: 4096,
      ultra: 8192
    }
  },
  sonic: {
    enabled: true,
    keySignature: 'Eb',
    chordProgression: ['Ebmaj9', 'Cm7', 'Abmaj7', 'Bb13'],
    tempo: 75,
    layers: {
      pad: { volume: 75, density: 25, character: 80 },
      arpeggio: { volume: 45, density: 35, character: 75 },
      sparkle: { volume: 35, density: 20, character: 90 },
      wash: { volume: 50, density: 20, character: 70 },
      bass: { volume: 60, density: 30, character: 40 }
    },
    effects: {
      reverb: { decay: 6.0, wet: 0.5 },
      chorus: { wet: 0.35, depth: 0.9 },
      delay: { wet: 0.2, feedback: 0.3 }
    },
    mood: {
      valence: 0.6,   // Warm and bright
      energy: 0.3     // Relaxed, luxurious
    }
  }
};

// Default variants
export const CLASSIC_VARIANT: BoardVariant = {
  theme: CLASSIC_THEME,
  gameplay: {
    pointCount: 24,
    checkersPerPlayer: 15
  }
};

export const MODERN_VARIANT: BoardVariant = {
  theme: MODERN_THEME,
  gameplay: {
    pointCount: 24,
    checkersPerPlayer: 15
  }
};

export const LUXURY_VARIANT: BoardVariant = {
  theme: LUXURY_THEME,
  gameplay: {
    pointCount: 24,
    checkersPerPlayer: 15
  }
};

// Registry of all available variants
export const BOARD_VARIANTS = {
  classic: CLASSIC_VARIANT,
  modern: MODERN_VARIANT,
  luxury: LUXURY_VARIANT
} as const;

export type VariantName = keyof typeof BOARD_VARIANTS;

// Current variant (could be managed by state later)
export let currentVariant: BoardVariant = CLASSIC_VARIANT;

export function setVariant(variantName: VariantName) {
  currentVariant = BOARD_VARIANTS[variantName];
}

/**
 * Get the current variant with theme loaded from Supabase.
 * This is the primary function used throughout the codebase to access the current theme.
 *
 * Themes are loaded from the database on demand. If the theme store hasn't loaded yet,
 * falls back to the hardcoded Classic theme for offline/error scenarios.
 *
 * When theme builder is open, returns the working theme for live preview.
 *
 * @returns Current board variant with theme loaded from database
 */
export function getCurrentVariant(): BoardVariant {
  // Lazy import to avoid circular dependency issues and SSR problems
  if (typeof window !== 'undefined') {
    try {
      // Check if theme builder is active with a working theme (for live preview)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useThemeBuilderStoreV2 } = require('../theme-builder/store-v2');
      const builderState = useThemeBuilderStoreV2.getState();

      if (builderState.workingTheme) {
        return {
          theme: builderState.workingTheme,
          gameplay: {
            pointCount: 24,
            checkersPerPlayer: 15,
          },
        };
      }

      // Otherwise use main theme store
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useThemeStore } = require('../theme/store');
      const state = useThemeStore.getState();

      // If theme is loaded from database, use it
      if (state.currentTheme) {
        return {
          theme: state.currentTheme,
          gameplay: {
            pointCount: 24,
            checkersPerPlayer: 15,
          },
        };
      }

      // If theme store exists but hasn't loaded yet, trigger load
      if (!state.isLoading && !state.currentTheme) {
        state.loadActiveTheme();
      }
    } catch (error) {
      // Theme store not available or error loading - fall through to default
      console.debug('Theme store not available:', error);
    }
  }

  // Fallback to Classic theme (for SSR, offline, or errors)
  return CLASSIC_VARIANT;
}