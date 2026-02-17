/**
 * SpatialAudio - 3D sound positioning system
 *
 * Features:
 * - Camera-relative 3D sound positioning
 * - Distance-based attenuation
 * - Directional audio with PannerNode
 * - Integration with SoundManager
 * - Listener (camera) position management
 *
 * Usage:
 * ```typescript
 * const spatialAudio = SpatialAudio.getInstance();
 * await spatialAudio.initialize();
 *
 * // Update listener position when camera moves
 * spatialAudio.updateListenerPosition(camera.position);
 *
 * // Play sound at 3D position
 * spatialAudio.playSoundAtPosition('dice_roll', { x: 5, y: 1, z: -2 });
 * ```
 */

import { Vector3 } from 'three';
import { audioContextManager } from './AudioContextManager';
import { soundManager } from './SoundManager';
import { PlaybackOptions } from './types';

// Legacy AudioListener interface for Safari compatibility
interface LegacyAudioListener extends AudioListener {
  setPosition(x: number, y: number, z: number): void;
  setOrientation(x: number, y: number, z: number, xUp: number, yUp: number, zUp: number): void;
}

interface SpatialPosition {
  x: number;
  y: number;
  z: number;
}

interface SpatialConfig {
  distanceModel: DistanceModelType;
  maxDistance: number;
  refDistance: number;
  rolloffFactor: number;
  panningModel: PanningModelType;
  coneInnerAngle: number;
  coneOuterAngle: number;
  coneOuterGain: number;
}

class SpatialAudio {
  private static instance: SpatialAudio;
  private listenerPosition: Vector3 = new Vector3(0, 0, 0);
  private listenerOrientation: { forward: Vector3; up: Vector3 } = {
    forward: new Vector3(0, 0, -1),
    up: new Vector3(0, 1, 0),
  };
  private isInitialized = false;

  // Default spatial audio configuration
  private config: SpatialConfig = {
    distanceModel: 'inverse',
    maxDistance: 100,
    refDistance: 1,
    rolloffFactor: 1,
    panningModel: 'HRTF',
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0,
  };

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): SpatialAudio {
    if (!SpatialAudio.instance) {
      SpatialAudio.instance = new SpatialAudio();
    }
    return SpatialAudio.instance;
  }

  /**
   * Initialize the spatial audio system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await audioContextManager.initialize();
    const context = audioContextManager.getContext();

    if (!context) {
      console.error('[SpatialAudio] Failed to initialize - no AudioContext');
      return;
    }

    // Set initial listener position and orientation
    this.updateListenerPositionAndOrientation(
      this.listenerPosition,
      this.listenerOrientation.forward,
      this.listenerOrientation.up
    );

    this.isInitialized = true;
    console.log('[SpatialAudio] Initialized', {
      distanceModel: this.config.distanceModel,
      maxDistance: this.config.maxDistance,
    });
  }

  /**
   * Update listener (camera) position
   * Call this whenever the camera moves
   */
  public updateListenerPosition(position: Vector3 | SpatialPosition): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    this.listenerPosition.set(
      'x' in position ? position.x : 0,
      'y' in position ? position.y : 0,
      'z' in position ? position.z : 0
    );

    // Update AudioListener position
    if (context.listener.positionX) {
      // Modern API (Chrome, Firefox)
      context.listener.positionX.value = this.listenerPosition.x;
      context.listener.positionY.value = this.listenerPosition.y;
      context.listener.positionZ.value = this.listenerPosition.z;
    } else {
      // Legacy API (Safari)
      (context.listener as LegacyAudioListener).setPosition(
        this.listenerPosition.x,
        this.listenerPosition.y,
        this.listenerPosition.z
      );
    }
  }

  /**
   * Update listener orientation (where the camera is looking)
   * Call this when camera rotation changes
   */
  public updateListenerOrientation(forward: Vector3, up: Vector3): void {
    const context = audioContextManager.getContext();
    if (!context) return;

    this.listenerOrientation.forward.copy(forward);
    this.listenerOrientation.up.copy(up);

    // Update AudioListener orientation
    if (context.listener.forwardX) {
      // Modern API
      context.listener.forwardX.value = forward.x;
      context.listener.forwardY.value = forward.y;
      context.listener.forwardZ.value = forward.z;
      context.listener.upX.value = up.x;
      context.listener.upY.value = up.y;
      context.listener.upZ.value = up.z;
    } else {
      // Legacy API
      (context.listener as LegacyAudioListener).setOrientation(
        forward.x,
        forward.y,
        forward.z,
        up.x,
        up.y,
        up.z
      );
    }
  }

  /**
   * Update both listener position and orientation at once
   */
  public updateListenerPositionAndOrientation(
    position: Vector3 | SpatialPosition,
    forward: Vector3,
    up: Vector3
  ): void {
    this.updateListenerPosition(position);
    this.updateListenerOrientation(forward, up);
  }

  /**
   * Play a sound at a specific 3D position
   * @param soundId Sound identifier
   * @param position 3D position in world space
   * @param options Additional playback options
   * @returns Instance ID for controlling the sound later
   */
  public playSoundAtPosition(
    soundId: string,
    position: SpatialPosition,
    options: Omit<PlaybackOptions, 'position'> = {}
  ): string | null {
    if (!this.isInitialized) {
      console.warn('[SpatialAudio] Not initialized');
      return null;
    }

    // Merge position into options
    const spatialOptions: PlaybackOptions = {
      ...options,
      position,
    };

    return soundManager.play(soundId, spatialOptions);
  }

  /**
   * Update the position of an already playing sound
   * Useful for moving sound sources (e.g., animated checkers)
   */
  public updateSoundPosition(instanceId: string, position: SpatialPosition): void {
    const instance = soundManager['activeSounds'].get(instanceId);
    if (!instance || !instance.pannerNode) {
      return;
    }

    const panner = instance.pannerNode;

    // Update panner position
    if (panner.positionX) {
      // Modern API
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
    } else {
      // Legacy API
      panner.setPosition(position.x, position.y, position.z);
    }
  }

  /**
   * Calculate distance from listener to a position
   */
  public calculateDistance(position: SpatialPosition): number {
    const dx = position.x - this.listenerPosition.x;
    const dy = position.y - this.listenerPosition.y;
    const dz = position.z - this.listenerPosition.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Check if a position is within audible range
   */
  public isAudible(position: SpatialPosition): boolean {
    const distance = this.calculateDistance(position);
    return distance <= this.config.maxDistance;
  }

  /**
   * Get volume multiplier based on distance
   * Useful for manual volume adjustment without spatial audio
   */
  public getDistanceVolume(position: SpatialPosition): number {
    const distance = this.calculateDistance(position);

    if (distance >= this.config.maxDistance) {
      return 0;
    }

    // Calculate volume based on distance model
    switch (this.config.distanceModel) {
      case 'linear':
        return 1 - (distance / this.config.maxDistance);

      case 'inverse':
        return this.config.refDistance / (this.config.refDistance + this.config.rolloffFactor * (distance - this.config.refDistance));

      case 'exponential':
        return Math.pow(distance / this.config.refDistance, -this.config.rolloffFactor);

      default:
        return 1;
    }
  }

  /**
   * Update spatial audio configuration
   */
  public updateConfig(config: Partial<SpatialConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    console.log('[SpatialAudio] Config updated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): SpatialConfig {
    return { ...this.config };
  }

  /**
   * Get current listener position
   */
  public getListenerPosition(): Vector3 {
    return this.listenerPosition.clone();
  }

  /**
   * Get current listener orientation
   */
  public getListenerOrientation(): { forward: Vector3; up: Vector3 } {
    return {
      forward: this.listenerOrientation.forward.clone(),
      up: this.listenerOrientation.up.clone(),
    };
  }

  /**
   * Dispose and cleanup
   */
  public dispose(): void {
    this.isInitialized = false;
    this.listenerPosition.set(0, 0, 0);
    this.listenerOrientation.forward.set(0, 0, -1);
    this.listenerOrientation.up.set(0, 1, 0);
  }
}

// Export singleton instance
export const spatialAudio = SpatialAudio.getInstance();
