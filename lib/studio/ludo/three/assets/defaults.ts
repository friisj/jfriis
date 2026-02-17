import { Player } from '../../game/types';
import { 
  CheckerVariant, 
  PointVariant, 
  DiceVariant, 
  BoardVariant, 
  SceneVariant, 
  GamePreset 
} from './types';

// ============== DEFAULT CHECKER VARIANTS ==============
export const CLASSIC_CHECKERS: CheckerVariant = {
  id: 'checkers-classic',
  name: 'Classic',
  description: 'Traditional backgammon checkers with simple geometry',
  compatibility: [], // Compatible with all
  version: '1.0.0',
  type: 'checker',
  
  states: {
    idle: {
      geometry: { radiusTop: 0.25, radiusBottom: 0.25, height: 0.1, segments: 16 },
      material: { color: 0xF5F5DC, metalness: 0.1, roughness: 0.8 }
    },
    selected: {
      geometry: { radiusTop: 0.25, radiusBottom: 0.25, height: 0.1, segments: 16 },
      material: { color: 0xF5F5DC, metalness: 0.1, roughness: 0.8 },
      effects: { glow: { color: 0x00FF00, intensity: 0.5 } }
    },
    hoverable: {
      geometry: { radiusTop: 0.25, radiusBottom: 0.25, height: 0.1, segments: 16 },
      material: { color: 0xF5F5DC, metalness: 0.1, roughness: 0.8 },
      effects: { outline: { color: 0xFFFFFF, thickness: 0.02 } }
    },
    moving: {
      geometry: { radiusTop: 0.25, radiusBottom: 0.25, height: 0.1, segments: 16 },
      material: { color: 0xF5F5DC, metalness: 0.1, roughness: 0.8, opacity: 0.8 }
    },
    hit: {
      geometry: { radiusTop: 0.25, radiusBottom: 0.25, height: 0.1, segments: 16 },
      material: { color: 0xFF0000, metalness: 0.1, roughness: 0.8 },
      effects: { glow: { color: 0xFF0000, intensity: 0.7 } }
    }
  },
  
  colors: {
    [Player.WHITE]: {
      geometry: { radiusTop: 0.25, radiusBottom: 0.25, height: 0.1, segments: 16 },
      material: { color: 0xF5F5DC, metalness: 0.1, roughness: 0.8 }
    },
    [Player.BLACK]: {
      geometry: { radiusTop: 0.25, radiusBottom: 0.25, height: 0.1, segments: 16 },
      material: { color: 0x2F2F2F, metalness: 0.1, roughness: 0.8 }
    }
  },
  
  animations: {
    moveTransition: { duration: 0.5, easing: 'ease-in-out', path: 'arc' },
    hitAnimation: { duration: 0.3, easing: 'bounce' },
    stackAnimation: { duration: 0.2, easing: 'ease-in-out' }
  },
  
  stacking: {
    onPoint: 'linear',
    onBar: 'horizontal',
    spacing: 0.12,
    maxHeight: 8
  }
};

export const MODERN_CHECKERS: CheckerVariant = {
  ...CLASSIC_CHECKERS,
  id: 'checkers-modern',
  name: 'Modern',
  description: 'Sleek modern checkers with high-poly geometry and metallic finish',
  
  states: {
    ...CLASSIC_CHECKERS.states,
    idle: {
      geometry: { radiusTop: 0.28, radiusBottom: 0.28, height: 0.12, segments: 24 },
      material: { color: 0xECF0F1, metalness: 0.6, roughness: 0.3 }
    }
  },
  
  colors: {
    [Player.WHITE]: {
      geometry: { radiusTop: 0.28, radiusBottom: 0.28, height: 0.12, segments: 24 },
      material: { color: 0xECF0F1, metalness: 0.6, roughness: 0.3 }
    },
    [Player.BLACK]: {
      geometry: { radiusTop: 0.28, radiusBottom: 0.28, height: 0.12, segments: 24 },
      material: { color: 0x1C1C1C, metalness: 0.6, roughness: 0.3 }
    }
  }
};

// ============== DEFAULT POINT VARIANTS ==============
export const CLASSIC_POINTS: PointVariant = {
  id: 'points-classic',
  name: 'Classic Triangles',
  description: 'Traditional triangular points with alternating colors',
  compatibility: [],
  version: '1.0.0',
  type: 'point',
  
  states: {
    empty: {
      shape: 'triangle',
      geometry: { width: 0.5, depth: 0.01, height: 4.6 },
      material: { color: 0xFF6B6B, metalness: 0.0, roughness: 0.9 }
    },
    occupied: {
      shape: 'triangle',
      geometry: { width: 0.5, depth: 0.01, height: 4.6 },
      material: { color: 0xFF6B6B, metalness: 0.0, roughness: 0.9, opacity: 0.9 }
    },
    highlighted: {
      shape: 'triangle',
      geometry: { width: 0.5, depth: 0.02, height: 4.6 },
      material: { color: 0xFFFF00, metalness: 0.2, roughness: 0.6 },
      border: { color: 0xFFFFFF, thickness: 0.05, style: 'solid' }
    },
    blocked: {
      shape: 'triangle',
      geometry: { width: 0.5, depth: 0.01, height: 4.6 },
      material: { color: 0x8B0000, metalness: 0.0, roughness: 0.9 }
    }
  },
  
  playerStates: {
    whiteControlled: {
      shape: 'triangle',
      geometry: { width: 0.5, depth: 0.01, height: 4.6 },
      material: { color: 0xE8E8E8, metalness: 0.0, roughness: 0.9 }
    },
    blackControlled: {
      shape: 'triangle',
      geometry: { width: 0.5, depth: 0.01, height: 4.6 },
      material: { color: 0x4A4A4A, metalness: 0.0, roughness: 0.9 }
    },
    contested: {
      shape: 'triangle',
      geometry: { width: 0.5, depth: 0.015, height: 4.6 },
      material: { color: 0xFF6B6B, metalness: 0.1, roughness: 0.8 },
      border: { color: 0xFFFF00, thickness: 0.02, style: 'dashed' }
    }
  },
  
  specialStates: {
    homeBoard: {
      shape: 'triangle',
      geometry: { width: 0.5, depth: 0.01, height: 4.6 },
      material: { color: 0xFF6B6B, metalness: 0.0, roughness: 0.9 },
      border: { color: 0xFFD700, thickness: 0.03, style: 'solid' }
    },
    outerBoard: {
      shape: 'triangle',
      geometry: { width: 0.5, depth: 0.01, height: 4.6 },
      material: { color: 0xFF6B6B, metalness: 0.0, roughness: 0.9 }
    }
  },
  
  layout: {
    alternateColors: [0xFF6B6B, 0x4ECDC4],
    spacing: 1.2,
    positioning: 'standard'
  }
};

// ============== DEFAULT DICE VARIANTS ==============
export const CLASSIC_DICE: DiceVariant = {
  id: 'dice-classic',
  name: 'Classic Dice',
  description: 'Traditional cube dice with simple dots',
  compatibility: [],
  version: '1.0.0',
  type: 'dice',
  
  states: {
    unrolled: {
      geometry: { size: 0.5, chamfer: 0.05, segments: 8 },
      material: { face: 0xFFFFFF, dots: 0x000000, metalness: 0.1, roughness: 0.8 },
      dots: { size: 0.03, depth: 0.01, style: 'inset' }
    },
    rolling: {
      geometry: { size: 0.5, chamfer: 0.05, segments: 8 },
      material: { face: 0xFFFFFF, dots: 0x000000, metalness: 0.1, roughness: 0.8 },
      dots: { size: 0.03, depth: 0.01, style: 'inset' },
      effects: { glow: { color: 0x00FF00, intensity: 0.3 } }
    },
    rolled: {
      geometry: { size: 0.5, chamfer: 0.05, segments: 8 },
      material: { face: 0xFFFFFF, dots: 0x000000, metalness: 0.1, roughness: 0.8 },
      dots: { size: 0.03, depth: 0.01, style: 'inset' }
    },
    used: {
      geometry: { size: 0.5, chamfer: 0.05, segments: 8 },
      material: { face: 0xCCCCCC, dots: 0x666666, metalness: 0.1, roughness: 0.8 },
      dots: { size: 0.03, depth: 0.01, style: 'inset' }
    }
  },
  
  playerColors: {
    [Player.WHITE]: {
      geometry: { size: 0.5, chamfer: 0.05, segments: 8 },
      material: { face: 0xFFFFFF, dots: 0x000000, metalness: 0.1, roughness: 0.8 },
      dots: { size: 0.03, depth: 0.01, style: 'inset' }
    },
    [Player.BLACK]: {
      geometry: { size: 0.5, chamfer: 0.05, segments: 8 },
      material: { face: 0x2F2F2F, dots: 0xFFFFFF, metalness: 0.1, roughness: 0.8 },
      dots: { size: 0.03, depth: 0.01, style: 'inset' }
    }
  },
  
  animation: {
    rollDuration: 1.5,
    bounces: 3,
    rotationSpeed: 10,
    settleTime: 0.5
  },
  
  positioning: {
    layout: 'horizontal',
    spacing: 1.0
  }
};

// ============== DEFAULT BOARD VARIANTS ==============
export const CLASSIC_BOARD: BoardVariant = {
  id: 'board-classic',
  name: 'Classic Board',
  description: 'Traditional wooden backgammon board',
  compatibility: [],
  version: '1.0.0',
  type: 'board',
  
  appearance: {
    base: {
      dimensions: { width: 16, height: 0.2, thickness: 10 },
      material: { color: 0x8B4513, metalness: 0.0, roughness: 0.9 },
      edges: { style: 'rounded', radius: 0.05 }
    },
    sections: {
      bar: { width: 0.2, height: 0.3, thickness: 10, color: 0x654321 },
      bearOff: { width: 1, height: 0.1, thickness: 8, color: 0x444444 }
    },
    markings: {
      lines: true,
      numbers: true,
      logos: false
    }
  },
  
  layout: {
    pointSpacing: 1.2,
    sectionGap: 1.5,
    checkerStackSpacing: 0.12,
    dicePosition: { x: -2, y: 1, z: 0 }
  },
  
  lighting: {
    castShadows: true,
    receiveShadows: true,
    ambientOcclusion: true
  }
};

// ============== DEFAULT SCENE VARIANTS ==============
export const CLASSIC_SCENE: SceneVariant = {
  id: 'scene-classic',
  name: 'Classic Scene',
  description: 'Warm, traditional lighting setup',
  compatibility: [],
  version: '1.0.0',
  type: 'scene',
  
  background: {
    type: 'color',
    color: 0x2d5016
  },
  
  lighting: {
    ambient: { intensity: 0.4, color: 0xffffff },
    directional: { 
      intensity: 0.8, 
      color: 0xffffff, 
      position: [10, 20, 10],
      shadows: true
    }
  },
  
  camera: {
    fov: 70,  // Match overhead preset FOV
    near: 0.1,
    far: 1000,
    initialPosition: [0.25, 24.998, 0],  // Match overhead preset position
    initialTarget: [0, 0, 0]
  },
  
  effects: {
    fog: { color: 0x2d5016, near: 50, far: 200 }
  }
};

// ============== DEFAULT GAME PRESETS ==============
export const CLASSIC_PRESET: GamePreset = {
  id: 'preset-classic',
  name: 'Classic Backgammon',
  description: 'Traditional backgammon appearance and feel',
  version: '1.0.0',
  author: 'System',
  tags: ['classic', 'traditional', 'wooden'],
  
  assets: {
    checker: 'checkers-classic',
    point: 'points-classic',
    dice: 'dice-classic',
    board: 'board-classic',
    scene: 'scene-classic'
  },
  
  validated: true,
  compatibility: {
    visualHarmony: 1.0,
    performanceScore: 1.0,
    functionalityScore: 1.0
  },
  
  gameplay: {
    rules: 'standard',
    pointCount: 24,
    checkersPerPlayer: 15
  },
  
  created: new Date(),
  modified: new Date(),
  popularity: 1.0
};

export const MODERN_PRESET: GamePreset = {
  id: 'preset-modern',
  name: 'Modern Style',
  description: 'Contemporary look with metallic finishes',
  version: '1.0.0',
  author: 'System',
  tags: ['modern', 'metallic', 'contemporary'],
  
  assets: {
    checker: 'checkers-modern',
    point: 'points-classic', // Reuse classic points
    dice: 'dice-classic',    // Reuse classic dice
    board: 'board-classic',  // Reuse classic board
    scene: 'scene-classic'   // Reuse classic scene
  },
  
  validated: true,
  compatibility: {
    visualHarmony: 0.9,
    performanceScore: 0.8, // Lower due to higher poly checkers
    functionalityScore: 1.0
  },
  
  gameplay: {
    rules: 'standard',
    pointCount: 24,
    checkersPerPlayer: 15
  },
  
  created: new Date(),
  modified: new Date(),
  popularity: 0.8
};

// Default assets array for easy registration
export const DEFAULT_ASSETS = [
  CLASSIC_CHECKERS,
  MODERN_CHECKERS,
  CLASSIC_POINTS,
  CLASSIC_DICE,
  CLASSIC_BOARD,
  CLASSIC_SCENE
];

export const DEFAULT_PRESETS = [
  CLASSIC_PRESET,
  MODERN_PRESET
];