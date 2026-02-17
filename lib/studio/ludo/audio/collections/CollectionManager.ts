/**
 * CollectionManager - Manages swappable sound effect collections
 *
 * Handles loading, switching, and lifecycle management of sound collections.
 * Supports both sample-based (MP3/WAV) and synthesized (Tone.js) sounds.
 */

import { SoundCollection, CollectionSound, validateCollection } from './types';

export class CollectionManager {
  private collections: Map<string, SoundCollection> = new Map();
  private activeCollection?: SoundCollection;
  private loadedSounds: Map<string, AudioBuffer> = new Map();

  constructor() {
    console.log('🎵 CollectionManager created');
  }

  /**
   * Register a sound collection
   */
  registerCollection(collection: SoundCollection): void {
    // Validate collection has all required sounds
    if (!validateCollection(collection)) {
      throw new Error(`Invalid collection: ${collection.id} - missing required sounds`);
    }

    this.collections.set(collection.id, collection);
    console.log(`✅ Registered collection: ${collection.name} (${collection.type})`);
  }

  /**
   * Get all registered collections
   */
  getCollections(): SoundCollection[] {
    return Array.from(this.collections.values());
  }

  /**
   * Get collection by ID
   */
  getCollection(id: string): SoundCollection | undefined {
    return this.collections.get(id);
  }

  /**
   * Get currently active collection
   */
  getActiveCollection(): SoundCollection | undefined {
    return this.activeCollection;
  }

  /**
   * Load and activate a collection
   */
  async loadCollection(collectionId: string): Promise<void> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    console.log(`🔄 Loading collection: ${collection.name}`);

    try {
      // Dispose of current collection if any
      if (this.activeCollection?.dispose) {
        this.activeCollection.dispose();
      }

      // Initialize new collection (for synthesized collections)
      if (collection.initialize) {
        await collection.initialize();
      }

      // Load sample-based sounds
      if (collection.type === 'sample-based' || collection.type === 'hybrid') {
        await this.loadSampleSounds(collection);
      }

      this.activeCollection = collection;
      console.log(`✅ Collection loaded: ${collection.name}`);
    } catch (error) {
      console.error(`❌ Failed to load collection: ${collection.name}`, error);
      throw error;
    }
  }

  /**
   * Load sample-based sounds from a collection
   */
  private async loadSampleSounds(collection: SoundCollection): Promise<void> {
    const audioContext = new AudioContext();
    const sampleSounds = collection.sounds.filter(
      sound => typeof sound.source === 'string' && !sound.isSynthesized
    );

    console.log(`📦 Loading ${sampleSounds.length} sample sounds...`);

    const loadPromises = sampleSounds.map(async (sound) => {
      try {
        const response = await fetch(sound.source as string);
        if (!response.ok) {
          console.warn(`⚠️ Failed to load sound: ${sound.id} from ${sound.source}`);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        this.loadedSounds.set(sound.id, audioBuffer);
        console.log(`✅ Loaded: ${sound.id}`);
      } catch (error) {
        console.warn(`⚠️ Error loading sound: ${sound.id}`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Get sound by ID from active collection
   */
  getSound(soundId: string): CollectionSound | undefined {
    if (!this.activeCollection) return undefined;
    return this.activeCollection.sounds.find(s => s.id === soundId);
  }

  /**
   * Get loaded audio buffer for a sound
   */
  getAudioBuffer(soundId: string): AudioBuffer | undefined {
    return this.loadedSounds.get(soundId);
  }

  /**
   * Switch to a different collection
   */
  async switchCollection(collectionId: string): Promise<void> {
    console.log(`🔄 Switching to collection: ${collectionId}`);
    await this.loadCollection(collectionId);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.activeCollection?.dispose) {
      this.activeCollection.dispose();
    }
    this.loadedSounds.clear();
    console.log('🗑️ CollectionManager disposed');
  }
}

// Export singleton instance
export const collectionManager = new CollectionManager();
