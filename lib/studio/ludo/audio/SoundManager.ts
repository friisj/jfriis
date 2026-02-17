/**
 * SoundManager - Core sound system for the game
 *
 * Features:
 * - Sound loading and caching (AudioBuffer management)
 * - Playback queue and priority system
 * - Volume mixing (master, effects, ambient)
 * - Crossfade and ducking utilities
 * - Error handling and fallback strategies
 * - Integration with AudioContextManager
 *
 * Usage:
 * ```typescript
 * const soundManager = SoundManager.getInstance();
 * await soundManager.initialize();
 * await soundManager.loadSound('dice_roll', '/sounds/dice/roll.mp3', SoundCategory.DICE);
 * soundManager.play('dice_roll', { volume: 0.8 });
 * ```
 */

import { audioContextManager } from './AudioContextManager';
import {
  SoundAsset,
  SoundCategory,
  SoundInstance,
  SoundManagerConfig,
  PlaybackOptions,
  VolumeSettings,
} from './types';
import { collectionManager } from './collections';

class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, SoundAsset> = new Map();
  private activeSounds: Map<string, SoundInstance> = new Map();
  private volumeSettings: VolumeSettings = {
    master: 0.7,
    effects: 0.8,
    ambient: 0.5,
    muted: false,
  };
  private config: SoundManagerConfig = {
    maxSimultaneousSounds: 12,
    defaultVolume: 1.0,
    enableSpatialAudio: true,
    distanceModel: 'inverse',
    maxDistance: 100,
    refDistance: 1,
    rolloffFactor: 1,
  };
  private masterGainNode: GainNode | null = null;
  private effectsGainNode: GainNode | null = null;
  private ambientGainNode: GainNode | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Initialize the sound manager
   * Sets up gain nodes for volume mixing
   */
  public async initialize(): Promise<void> {
    await audioContextManager.initialize();

    const context = audioContextManager.getContext();
    if (!context) {
      console.error('[SoundManager] Failed to initialize - no AudioContext');
      return;
    }

    // Create master gain node
    this.masterGainNode = context.createGain();
    this.masterGainNode.connect(context.destination);
    this.masterGainNode.gain.value = this.volumeSettings.master;

    // Create effects gain node (for sound effects)
    this.effectsGainNode = context.createGain();
    this.effectsGainNode.connect(this.masterGainNode);
    this.effectsGainNode.gain.value = this.volumeSettings.effects;

    // Create ambient gain node (for background audio)
    this.ambientGainNode = context.createGain();
    this.ambientGainNode.connect(this.masterGainNode);
    this.ambientGainNode.gain.value = this.volumeSettings.ambient;

    console.log('[SoundManager] Initialized');
  }

  /**
   * Load a sound file
   * @param id Unique identifier for the sound
   * @param url Path to the sound file
   * @param category Sound category for mixing
   * @param volume Default volume for this sound (0-1)
   */
  public async loadSound(
    id: string,
    url: string,
    category: SoundCategory,
    volume: number = 1.0
  ): Promise<void> {
    if (this.sounds.has(id)) {
      console.warn(`[SoundManager] Sound already loaded: ${id}`);
      return;
    }

    const sound: SoundAsset = {
      id,
      url,
      category,
      buffer: null,
      loaded: false,
      volume,
    };

    this.sounds.set(id, sound);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sound: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const context = audioContextManager.getContext();

      if (!context) {
        throw new Error('AudioContext not available');
      }

      sound.buffer = await context.decodeAudioData(arrayBuffer);
      sound.loaded = true;

      console.log(`[SoundManager] Loaded sound: ${id} (${sound.buffer.duration.toFixed(2)}s)`);
    } catch (error) {
      console.error(`[SoundManager] Failed to load sound ${id}:`, error);
      this.sounds.delete(id);
    }
  }

  /**
   * Load multiple sounds in parallel
   */
  public async loadSounds(sounds: Array<{ id: string; url: string; category: SoundCategory; volume?: number }>): Promise<void> {
    await Promise.all(
      sounds.map((sound) => this.loadSound(sound.id, sound.url, sound.category, sound.volume))
    );
  }

  /**
   * Load sounds from the active collection
   * Only loads sample-based sounds (synthesized sounds are handled by the collection)
   */
  public async loadFromActiveCollection(): Promise<void> {
    const collection = collectionManager.getActiveCollection();
    if (!collection) {
      console.warn('[SoundManager] No active collection to load from');
      return;
    }

    console.log(`[SoundManager] Loading sounds from collection: ${collection.name}`);

    // Filter for sample-based sounds only
    const sampleSounds = collection.sounds.filter(
      (sound) => typeof sound.source === 'string' && !sound.isSynthesized
    );

    // Load all sample-based sounds
    await Promise.all(
      sampleSounds.map((sound) =>
        this.loadSound(sound.id, sound.source as string, sound.category, sound.volume)
      )
    );

    console.log(`[SoundManager] Loaded ${sampleSounds.length} sounds from ${collection.name}`);
  }

  /**
   * Switch to a different sound collection
   * Unloads current sounds and loads sounds from the new collection
   */
  public async switchCollection(collectionId: string): Promise<void> {
    console.log(`[SoundManager] Switching to collection: ${collectionId}`);

    try {
      // Stop all currently playing sounds
      this.stopAll(0.5);

      // Unload all current sounds
      const currentSounds = Array.from(this.sounds.keys());
      currentSounds.forEach((id) => this.unloadSound(id));

      // Switch collection in the collection manager
      await collectionManager.switchCollection(collectionId);

      // Load sounds from the new collection
      await this.loadFromActiveCollection();

      console.log(`[SoundManager] Successfully switched to collection: ${collectionId}`);
    } catch (error) {
      console.error(`[SoundManager] Failed to switch collection:`, error);
      throw error;
    }
  }

  /**
   * Play a sound
   * Falls back to Primitive collection if sound not found in active collection
   * @param id Sound identifier
   * @param options Playback options
   * @returns Instance ID for controlling the sound later
   */
  public play(id: string, options: PlaybackOptions = {}): string | null {
    // Try active collection first
    const collection = collectionManager.getActiveCollection();
    if (collection) {
      const collectionSound = collection.sounds.find((s) => s.id === id);
      if (collectionSound?.isSynthesized && typeof collectionSound.source === 'function') {
        // Call the synthesis function
        collectionSound.source();
        return `synth_${id}_${Date.now()}`; // Return synthetic instance ID
      }
    }

    // Try sample-based sound from active collection
    const sound = this.sounds.get(id);

    // If not found, fall back to Primitive collection
    if (!sound || !sound.loaded || !sound.buffer) {
      const primitiveCollection = collectionManager.getCollection('primitive');
      if (primitiveCollection) {
        const primitiveSound = primitiveCollection.sounds.find((s) => s.id === id);
        if (primitiveSound?.isSynthesized && typeof primitiveSound.source === 'function') {
          console.log(`[SoundManager] Falling back to Primitive sound: ${id}`);
          primitiveSound.source();
          return `synth_${id}_${Date.now()}`;
        }
      }

      console.warn(`[SoundManager] Cannot play sound: ${id} (not found in active or primitive collection)`);
      return null;
    }

    const context = audioContextManager.getContext();
    if (!context || !audioContextManager.isReady()) {
      console.warn('[SoundManager] AudioContext not ready');
      return null;
    }

    // Check if we've hit the concurrent sound limit
    if (this.activeSounds.size >= this.config.maxSimultaneousSounds) {
      this.stopOldestSound();
    }

    // Create source node
    const source = context.createBufferSource();
    source.buffer = sound.buffer;
    source.loop = options.loop ?? false;

    if (options.playbackRate) {
      source.playbackRate.value = options.playbackRate;
    }

    if (options.detune) {
      source.detune.value = options.detune;
    }

    // Create gain node for this sound
    const gainNode = context.createGain();
    const volume = options.volume ?? sound.volume;
    gainNode.gain.value = this.volumeSettings.muted ? 0 : volume;

    // Apply fade in
    if (options.fadeIn) {
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + options.fadeIn);
    }

    // Connect to appropriate channel (effects vs ambient)
    const channelGain = sound.category === SoundCategory.AMBIENT ? this.ambientGainNode : this.effectsGainNode;

    if (!channelGain) {
      console.error('[SoundManager] Channel gain node not initialized');
      return null;
    }

    // Handle spatial audio if position provided
    let pannerNode: PannerNode | undefined;
    if (this.config.enableSpatialAudio && options.position) {
      pannerNode = this.createPannerNode(context, options.position);
      source.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(channelGain);
    } else {
      source.connect(gainNode);
      gainNode.connect(channelGain);
    }

    // Create instance tracking
    const instanceId = `${id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const instance: SoundInstance = {
      id: instanceId,
      source,
      gainNode,
      pannerNode,
      category: sound.category,
      startTime: context.currentTime,
      duration: sound.buffer.duration,
      loop: source.loop,
    };

    this.activeSounds.set(instanceId, instance);

    // Setup cleanup when sound ends
    source.onended = () => {
      this.activeSounds.delete(instanceId);
    };

    // Start playback
    source.start(0);

    // Schedule fade out if specified
    if (options.fadeOut && !source.loop) {
      const fadeStart = context.currentTime + sound.buffer.duration - options.fadeOut;
      if (fadeStart > context.currentTime) {
        gainNode.gain.setValueAtTime(volume, fadeStart);
        gainNode.gain.linearRampToValueAtTime(0, fadeStart + options.fadeOut);
      }
    }

    return instanceId;
  }

  /**
   * Stop a specific sound instance
   */
  public stop(instanceId: string, fadeOut: number = 0): void {
    const instance = this.activeSounds.get(instanceId);
    if (!instance) {
      return;
    }

    const context = audioContextManager.getContext();
    if (!context) {
      return;
    }

    if (fadeOut > 0) {
      const currentGain = instance.gainNode.gain.value;
      instance.gainNode.gain.setValueAtTime(currentGain, context.currentTime);
      instance.gainNode.gain.linearRampToValueAtTime(0, context.currentTime + fadeOut);

      setTimeout(() => {
        instance.source.stop();
        this.activeSounds.delete(instanceId);
      }, fadeOut * 1000);
    } else {
      instance.source.stop();
      this.activeSounds.delete(instanceId);
    }
  }

  /**
   * Stop all sounds of a specific category
   */
  public stopCategory(category: SoundCategory, fadeOut: number = 0): void {
    this.activeSounds.forEach((instance, id) => {
      if (instance.category === category) {
        this.stop(id, fadeOut);
      }
    });
  }

  /**
   * Stop all sounds
   */
  public stopAll(fadeOut: number = 0): void {
    const instanceIds = Array.from(this.activeSounds.keys());
    instanceIds.forEach((id) => this.stop(id, fadeOut));
  }

  /**
   * Set volume for a channel
   */
  public setVolume(channel: 'master' | 'effects' | 'ambient', value: number): void {
    const clampedValue = Math.max(0, Math.min(1, value));
    this.volumeSettings[channel] = clampedValue;

    const context = audioContextManager.getContext();
    if (!context) {
      return;
    }

    // Apply to appropriate gain node
    if (channel === 'master' && this.masterGainNode) {
      this.masterGainNode.gain.setValueAtTime(clampedValue, context.currentTime);
    } else if (channel === 'effects' && this.effectsGainNode) {
      this.effectsGainNode.gain.setValueAtTime(clampedValue, context.currentTime);
    } else if (channel === 'ambient' && this.ambientGainNode) {
      this.ambientGainNode.gain.setValueAtTime(clampedValue, context.currentTime);
    }
  }

  /**
   * Get current volume settings
   */
  public getVolumeSettings(): VolumeSettings {
    return { ...this.volumeSettings };
  }

  /**
   * Mute/unmute all audio
   */
  public setMuted(muted: boolean): void {
    this.volumeSettings.muted = muted;

    if (this.masterGainNode) {
      const context = audioContextManager.getContext();
      if (context) {
        const targetValue = muted ? 0 : this.volumeSettings.master;
        this.masterGainNode.gain.setValueAtTime(targetValue, context.currentTime);
      }
    }
  }

  /**
   * Check if a sound is loaded
   */
  public isLoaded(id: string): boolean {
    const sound = this.sounds.get(id);
    return sound?.loaded ?? false;
  }

  /**
   * Get all loaded sounds
   */
  public getLoadedSounds(): string[] {
    return Array.from(this.sounds.entries())
      .filter(([_, sound]) => sound.loaded)
      .map(([id]) => id);
  }

  /**
   * Unload a sound
   */
  public unloadSound(id: string): void {
    // Stop any active instances of this sound
    this.activeSounds.forEach((instance, instanceId) => {
      if (instanceId.startsWith(id)) {
        this.stop(instanceId);
      }
    });

    this.sounds.delete(id);
  }

  /**
   * Cleanup and dispose
   */
  public dispose(): void {
    this.stopAll();
    this.sounds.clear();
    this.masterGainNode?.disconnect();
    this.effectsGainNode?.disconnect();
    this.ambientGainNode?.disconnect();
    this.masterGainNode = null;
    this.effectsGainNode = null;
    this.ambientGainNode = null;
  }

  /**
   * Create a panner node for spatial audio
   */
  private createPannerNode(context: AudioContext, position: { x: number; y: number; z: number }): PannerNode {
    const panner = context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = this.config.distanceModel;
    panner.maxDistance = this.config.maxDistance;
    panner.refDistance = this.config.refDistance;
    panner.rolloffFactor = this.config.rolloffFactor;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;

    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    return panner;
  }

  /**
   * Stop the oldest playing sound to make room for new ones
   */
  private stopOldestSound(): void {
    let oldestTime = Infinity;
    let oldestId: string | null = null;

    this.activeSounds.forEach((instance, id) => {
      if (!instance.loop && instance.startTime < oldestTime) {
        oldestTime = instance.startTime;
        oldestId = id;
      }
    });

    if (oldestId) {
      this.stop(oldestId);
    }
  }
}

// Export singleton instance
export const soundManager = SoundManager.getInstance();
