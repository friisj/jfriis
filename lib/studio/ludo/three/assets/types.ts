import { Player } from '../../game/types';

// Base interfaces for all modular assets
export interface AssetVariant {
  id: string;
  name: string;
  description: string;
  compatibility: string[]; // Asset IDs this works with
  version: string;
}

// ============== CHECKER VARIANTS ==============
export interface CheckerAppearance {
  geometry: {
    radiusTop: number;
    radiusBottom: number;
    height: number;
    segments: number;
  };
  material: {
    color: number;
    metalness?: number;
    roughness?: number;
    opacity?: number;
  };
  effects?: {
    glow?: { color: number; intensity: number };
    outline?: { color: number; thickness: number };
    emissive?: { color: number; intensity: number };
  };
}

export interface CheckerAnimationConfig {
  duration: number;
  easing: 'linear' | 'ease-in-out' | 'bounce' | 'elastic';
  path?: 'linear' | 'arc' | 'spiral';
}

export interface CheckerVariant extends AssetVariant {
  type: 'checker';
  states: {
    idle: CheckerAppearance;
    selected: CheckerAppearance;
    hoverable: CheckerAppearance;
    moving: CheckerAppearance;
    hit: CheckerAppearance;
  };
  colors: {
    [Player.WHITE]: CheckerAppearance;
    [Player.BLACK]: CheckerAppearance;
  };
  animations: {
    moveTransition: CheckerAnimationConfig;
    hitAnimation: CheckerAnimationConfig;
    stackAnimation: CheckerAnimationConfig;
  };
  stacking: {
    onPoint: 'linear' | 'pyramid' | 'scattered';
    onBar: 'horizontal' | 'vertical' | 'grid';
    spacing: number;
    maxHeight: number;
  };
}

// ============== POINT VARIANTS ==============
export interface PointAppearance {
  shape: 'triangle' | 'circle' | 'hexagon' | 'rounded-triangle' | 'custom';
  geometry: {
    width: number;
    depth: number;
    height: number;
  };
  material: {
    color: number;
    metalness?: number;
    roughness?: number;
    opacity?: number;
  };
  border?: {
    color: number;
    thickness: number;
    style: 'solid' | 'dashed' | 'dotted';
  };
  pattern?: {
    type: 'none' | 'stripes' | 'dots' | 'gradient';
    colors?: number[];
    scale?: number;
  };
}

export interface PointVariant extends AssetVariant {
  type: 'point';
  states: {
    empty: PointAppearance;
    occupied: PointAppearance;
    highlighted: PointAppearance;
    blocked: PointAppearance;
  };
  playerStates: {
    whiteControlled: PointAppearance;
    blackControlled: PointAppearance;
    contested: PointAppearance;
  };
  specialStates: {
    homeBoard: PointAppearance;
    outerBoard: PointAppearance;
  };
  layout: {
    alternateColors: [number, number];
    spacing: number;
    positioning: 'standard' | 'circular' | 'hexagonal';
  };
}

// ============== DICE VARIANTS ==============
export interface DiceAppearance {
  geometry: {
    size: number;
    chamfer: number;
    segments: number;
  };
  material: {
    face: number;
    dots: number;
    metalness?: number;
    roughness?: number;
  };
  dots: {
    size: number;
    depth: number;
    style: 'inset' | 'raised' | 'painted';
  };
  effects?: {
    glow?: { color: number; intensity: number };
    shadow?: boolean;
  };
}

export interface DiceVariant extends AssetVariant {
  type: 'dice';
  states: {
    unrolled: DiceAppearance;
    rolling: DiceAppearance;
    rolled: DiceAppearance;
    used: DiceAppearance;
  };
  playerColors: {
    [Player.WHITE]: DiceAppearance;
    [Player.BLACK]: DiceAppearance;
  };
  animation: {
    rollDuration: number;
    bounces: number;
    rotationSpeed: number;
    settleTime: number;
  };
  positioning: {
    layout: 'horizontal' | 'vertical' | 'scattered';
    spacing: number;
  };
}

// ============== BOARD VARIANTS ==============
export interface BoardAppearance {
  base: {
    dimensions: { width: number; height: number; thickness: number };
    material: { color: number; texture?: string; metalness?: number; roughness?: number };
    edges: { style: 'sharp' | 'rounded' | 'beveled'; radius?: number };
  };
  sections: {
    bar: { width: number; height: number; thickness: number; color: number };
    bearOff: { width: number; height: number; thickness: number; color: number };
  };
  markings?: {
    lines: boolean;
    numbers: boolean;
    logos: boolean;
  };
}

export interface BoardVariant extends AssetVariant {
  type: 'board';
  appearance: BoardAppearance;
  layout: {
    pointSpacing: number;
    sectionGap: number;
    checkerStackSpacing: number;
    dicePosition: { x: number; y: number; z: number };
  };
  lighting: {
    castShadows: boolean;
    receiveShadows: boolean;
    ambientOcclusion: boolean;
  };
}

// ============== SCENE VARIANTS ==============
export interface SceneVariant extends AssetVariant {
  type: 'scene';
  background: {
    type: 'color' | 'gradient' | 'skybox' | 'hdri';
    color?: number;
    gradient?: { top: number; bottom: number };
    texture?: string;
  };
  lighting: {
    ambient: { intensity: number; color: number };
    directional: { 
      intensity: number; 
      color: number; 
      position: [number, number, number];
      shadows: boolean;
    };
    point?: Array<{
      position: [number, number, number];
      intensity: number;
      color: number;
    }>;
  };
  camera: {
    fov: number;
    near: number;
    far: number;
    initialPosition: [number, number, number];
    initialTarget: [number, number, number];
  };
  effects?: {
    fog?: { color: number; near: number; far: number };
    bloom?: boolean;
    ssao?: boolean;
  };
}

// ============== GAME PRESET ==============
export interface GamePreset {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  tags?: string[];
  
  // Asset selections
  assets: {
    checker: string;  // CheckerVariant ID
    point: string;    // PointVariant ID
    dice: string;     // DiceVariant ID
    board: string;    // BoardVariant ID
    scene: string;    // SceneVariant ID
  };
  
  // Compatibility validation
  validated: boolean;
  compatibility: {
    visualHarmony: number; // 0-1 score
    performanceScore: number; // 0-1 score
    functionalityScore: number; // 0-1 score
  };
  
  // Game configuration
  gameplay?: {
    rules: 'standard' | 'nackgammon' | 'hypergammon' | 'custom';
    pointCount: number;
    checkersPerPlayer: number;
    customRules?: Record<string, unknown>;
  };
  
  // Metadata
  created: Date;
  modified: Date;
  popularity?: number;
}

// Type unions for easier handling
export type AssetVariantType = CheckerVariant | PointVariant | DiceVariant | BoardVariant | SceneVariant;
export type AssetType = 'checker' | 'point' | 'dice' | 'board' | 'scene';