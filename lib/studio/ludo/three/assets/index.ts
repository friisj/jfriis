import { assetRegistry } from './registry';
import { DEFAULT_ASSETS, DEFAULT_PRESETS } from './defaults';

/**
 * Initialize the modular asset system with default assets and presets
 */
export function initializeAssetSystem(): void {
  // Register all default assets
  DEFAULT_ASSETS.forEach(asset => {
    assetRegistry.registerAsset(asset);
  });

  // Register all default presets
  DEFAULT_PRESETS.forEach(preset => {
    assetRegistry.registerPreset(preset);
  });

  // Set the modern preset as active
  assetRegistry.setActivePreset('preset-modern');

  console.log('🎨 Asset system initialized:', assetRegistry.getRegistryStats());
}

/**
 * Get the current active assets for rendering
 */
export function getCurrentRenderingAssets() {
  const assets = assetRegistry.getCurrentAssets();
  if (!assets) {
    throw new Error('No active preset selected. Call initializeAssetSystem() first.');
  }
  return assets;
}

/**
 * Switch to a different game preset
 */
export function switchPreset(presetId: string): boolean {
  const success = assetRegistry.setActivePreset(presetId);
  if (success) {
    console.log(`🎨 Switched to preset: ${presetId}`);
    // Trigger scene refresh here if needed
    return true;
  } else {
    console.error(`❌ Failed to switch to preset: ${presetId}`);
    return false;
  }
}

// Re-export key types and registry for external use
export * from './types';
export * from './registry';
export * from './defaults';
export { assetRegistry };