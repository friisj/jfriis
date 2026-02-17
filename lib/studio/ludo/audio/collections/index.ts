/**
 * Sound Collection Registry
 *
 * Central export point for all sound collections and collection management.
 * Automatically registers available collections with the CollectionManager.
 */

import { collectionManager, CollectionManager } from './CollectionManager';
import { PrimitiveCollection } from './primitive';

// Export types
export type { SoundCollection, CollectionSound, SoundSource } from './types';
export { REQUIRED_SOUND_IDS, validateCollection } from './types';

// Export collection manager
export { collectionManager, CollectionManager };

// Export individual collections
export { PrimitiveCollection } from './primitive';

/**
 * System collections
 * Only Primitive is registered - it's the automatic fallback for all unassigned sounds
 */
export const AVAILABLE_COLLECTIONS = [
  PrimitiveCollection,
] as const;

/**
 * Register all collections with the manager
 * Call this during app initialization
 */
export function registerAllCollections(): void {
  console.log('📚 Registering sound collections...');

  AVAILABLE_COLLECTIONS.forEach((collection) => {
    try {
      collectionManager.registerCollection(collection);
    } catch (error) {
      console.error(`❌ Failed to register collection: ${collection.name}`, error);
    }
  });

  console.log(`✅ Registered ${AVAILABLE_COLLECTIONS.length} collections`);
}

/**
 * Initialize and load the primitive collection (system fallback)
 * Call this during app initialization
 */
export async function initializeDefaultCollection(): Promise<void> {
  console.log('🎵 Initializing primitive sound collection...');

  try {
    // Register all collections first
    registerAllCollections();

    // Load primitive collection (system fallback)
    await collectionManager.loadCollection('primitive');

    console.log('✅ Primitive collection ready');
  } catch (error) {
    console.error('❌ Failed to initialize primitive collection:', error);
    throw error;
  }
}
