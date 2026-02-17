import { 
  AssetVariantType, 
  AssetType, 
  GamePreset,
  CheckerVariant,
  PointVariant,
  DiceVariant,
  BoardVariant,
  SceneVariant
} from './types';

/**
 * Central registry for all modular assets and game presets
 */
export class AssetRegistry {
  private static instance: AssetRegistry;
  
  // Asset storage by type
  private checkers = new Map<string, CheckerVariant>();
  private points = new Map<string, PointVariant>();
  private dice = new Map<string, DiceVariant>();
  private boards = new Map<string, BoardVariant>();
  private scenes = new Map<string, SceneVariant>();
  
  // Game presets
  private presets = new Map<string, GamePreset>();
  
  // Current active preset
  private activePreset: GamePreset | null = null;

  private constructor() {}

  public static getInstance(): AssetRegistry {
    if (!AssetRegistry.instance) {
      AssetRegistry.instance = new AssetRegistry();
    }
    return AssetRegistry.instance;
  }

  // ============== ASSET REGISTRATION ==============
  registerAsset(asset: AssetVariantType): void {
    switch (asset.type) {
      case 'checker':
        this.checkers.set(asset.id, asset as CheckerVariant);
        break;
      case 'point':
        this.points.set(asset.id, asset as PointVariant);
        break;
      case 'dice':
        this.dice.set(asset.id, asset as DiceVariant);
        break;
      case 'board':
        this.boards.set(asset.id, asset as BoardVariant);
        break;
      case 'scene':
        this.scenes.set(asset.id, asset as SceneVariant);
        break;
    }
  }

  // ============== ASSET RETRIEVAL ==============
  getAsset<T extends AssetVariantType>(type: AssetType, id: string): T | null {
    switch (type) {
      case 'checker':
        return this.checkers.get(id) as T || null;
      case 'point':
        return this.points.get(id) as T || null;
      case 'dice':
        return this.dice.get(id) as T || null;
      case 'board':
        return this.boards.get(id) as T || null;
      case 'scene':
        return this.scenes.get(id) as T || null;
      default:
        return null;
    }
  }

  getAllAssets(type: AssetType): AssetVariantType[] {
    switch (type) {
      case 'checker':
        return Array.from(this.checkers.values());
      case 'point':
        return Array.from(this.points.values());
      case 'dice':
        return Array.from(this.dice.values());
      case 'board':
        return Array.from(this.boards.values());
      case 'scene':
        return Array.from(this.scenes.values());
      default:
        return [];
    }
  }

  // ============== COMPATIBILITY CHECKING ==============
  checkCompatibility(assetIds: { [K in AssetType]: string }): {
    valid: boolean;
    issues: string[];
    scores: {
      visual: number;
      performance: number;
      functional: number;
    };
  } {
    const issues: string[] = [];
    const visualScore = 1.0;
    let performanceScore = 1.0;
    let functionalScore = 1.0;

    // Get all assets
    const assets = {
      checker: this.getAsset('checker', assetIds.checker) as CheckerVariant | null,
      point: this.getAsset('point', assetIds.point) as PointVariant | null,
      dice: this.getAsset('dice', assetIds.dice) as DiceVariant | null,
      board: this.getAsset('board', assetIds.board) as BoardVariant | null,
      scene: this.getAsset('scene', assetIds.scene) as SceneVariant | null,
    };

    // Check if all assets exist
    for (const [type, asset] of Object.entries(assets)) {
      if (!asset) {
        issues.push(`Missing ${type} asset: ${assetIds[type as AssetType]}`);
        functionalScore = 0;
      }
    }

    if (functionalScore === 0) {
      return { valid: false, issues, scores: { visual: 0, performance: 0, functional: 0 } };
    }

    // Check explicit compatibility declarations
    for (const [type, asset] of Object.entries(assets)) {
      if (asset) {
        const otherAssetIds = Object.values(assetIds).filter(id => id !== asset.id);
        const incompatibleIds = otherAssetIds.filter(id => !asset.compatibility.includes(id) && asset.compatibility.length > 0);
        
        if (incompatibleIds.length > 0) {
          issues.push(`${asset.name} (${type}) has compatibility issues with: ${incompatibleIds.join(', ')}`);
          functionalScore *= 0.7; // Reduce but don't break
        }
      }
    }

    // Basic size compatibility (checker must fit on points)
    if (assets.checker && assets.point) {
      const checkerRadius = Math.max(assets.checker.states.idle.geometry.radiusTop, assets.checker.states.idle.geometry.radiusBottom);
      const pointWidth = assets.point.states.empty.geometry.width;

      if (checkerRadius * 2 > pointWidth) {
        issues.push('Checkers are too large for points');
        functionalScore *= 0.5;
      }
    }

    // Performance scoring (more complex geometry = lower score)
    if (assets.checker) {
      const segments = assets.checker.states.idle.geometry.segments;
      if (segments > 32) performanceScore *= 0.8;
      if (segments > 64) performanceScore *= 0.6;
    }

    return {
      valid: issues.length === 0 || functionalScore > 0.3,
      issues,
      scores: {
        visual: visualScore,
        performance: performanceScore,
        functional: functionalScore
      }
    };
  }

  // ============== PRESET MANAGEMENT ==============
  registerPreset(preset: GamePreset): void {
    // Validate preset before registering
    const compatibility = this.checkCompatibility(preset.assets);
    preset.validated = compatibility.valid;
    preset.compatibility = {
      visualHarmony: compatibility.scores.visual,
      performanceScore: compatibility.scores.performance,
      functionalityScore: compatibility.scores.functional
    };

    this.presets.set(preset.id, preset);
  }

  getPreset(id: string): GamePreset | null {
    return this.presets.get(id) || null;
  }

  getAllPresets(): GamePreset[] {
    return Array.from(this.presets.values());
  }

  getValidatedPresets(): GamePreset[] {
    return this.getAllPresets().filter(preset => preset.validated);
  }

  // ============== ACTIVE PRESET MANAGEMENT ==============
  setActivePreset(presetId: string): boolean {
    const preset = this.getPreset(presetId);
    if (preset && preset.validated) {
      this.activePreset = preset;
      return true;
    }
    return false;
  }

  getActivePreset(): GamePreset | null {
    return this.activePreset;
  }

  getCurrentAssets(): {
    checker: CheckerVariant | null;
    point: PointVariant | null;
    dice: DiceVariant | null;
    board: BoardVariant | null;
    scene: SceneVariant | null;
  } | null {
    if (!this.activePreset) return null;

    return {
      checker: this.getAsset('checker', this.activePreset.assets.checker),
      point: this.getAsset('point', this.activePreset.assets.point),
      dice: this.getAsset('dice', this.activePreset.assets.dice),
      board: this.getAsset('board', this.activePreset.assets.board),
      scene: this.getAsset('scene', this.activePreset.assets.scene),
    };
  }

  // ============== UTILITY METHODS ==============
  searchAssets(type: AssetType, query: string): AssetVariantType[] {
    const assets = this.getAllAssets(type);
    const searchTerm = query.toLowerCase();
    
    return assets.filter(asset => 
      asset.name.toLowerCase().includes(searchTerm) ||
      asset.description.toLowerCase().includes(searchTerm) ||
      asset.id.toLowerCase().includes(searchTerm)
    );
  }

  getAssetsByCompatibility(targetAssetId: string): {
    [K in AssetType]: AssetVariantType[];
  } {
    return {
      checker: this.getAllAssets('checker').filter(asset => asset.compatibility.includes(targetAssetId) || asset.compatibility.length === 0),
      point: this.getAllAssets('point').filter(asset => asset.compatibility.includes(targetAssetId) || asset.compatibility.length === 0),
      dice: this.getAllAssets('dice').filter(asset => asset.compatibility.includes(targetAssetId) || asset.compatibility.length === 0),
      board: this.getAllAssets('board').filter(asset => asset.compatibility.includes(targetAssetId) || asset.compatibility.length === 0),
      scene: this.getAllAssets('scene').filter(asset => asset.compatibility.includes(targetAssetId) || asset.compatibility.length === 0),
    };
  }

  // ============== EXPORT/IMPORT ==============
  exportPreset(presetId: string): string | null {
    const preset = this.getPreset(presetId);
    if (!preset) return null;

    return JSON.stringify(preset, null, 2);
  }

  importPreset(jsonData: string): boolean {
    try {
      const preset = JSON.parse(jsonData) as GamePreset;
      // Validate structure
      if (!preset.id || !preset.name || !preset.assets) {
        return false;
      }
      
      this.registerPreset(preset);
      return true;
    } catch (error) {
      console.error('Failed to import preset:', error);
      return false;
    }
  }

  // ============== DEBUG/DEVELOPMENT ==============
  getRegistryStats(): {
    assets: { [K in AssetType]: number };
    presets: number;
    validatedPresets: number;
    activePreset: string | null;
  } {
    return {
      assets: {
        checker: this.checkers.size,
        point: this.points.size,
        dice: this.dice.size,
        board: this.boards.size,
        scene: this.scenes.size,
      },
      presets: this.presets.size,
      validatedPresets: this.getValidatedPresets().length,
      activePreset: this.activePreset?.id || null,
    };
  }

  clearRegistry(): void {
    this.checkers.clear();
    this.points.clear();
    this.dice.clear();
    this.boards.clear();
    this.scenes.clear();
    this.presets.clear();
    this.activePreset = null;
  }
}

// Singleton instance
export const assetRegistry = AssetRegistry.getInstance();