/**
 * AudioContextManager - Singleton manager for Web Audio API AudioContext
 *
 * Handles browser autoplay policies, context state management,
 * and provides a single AudioContext instance for the entire application.
 *
 * Key Features:
 * - Singleton pattern ensures only one AudioContext exists
 * - Automatic context resumption when suspended by browser
 * - User interaction handling for autoplay policy compliance
 * - Proper cleanup and disposal
 */

import { AudioContextState } from './types';

class AudioContextManager {
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private resumeAttempts = 0;
  private maxResumeAttempts = 5;

  // Private constructor for singleton pattern
  private constructor() {
    // Bind methods to preserve context
    this.handleUserInteraction = this.handleUserInteraction.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  /**
   * Initialize the AudioContext
   * Should be called after user interaction to comply with autoplay policies
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized && this.audioContext) {
      // Already initialized, just ensure it's running
      await this.resume();
      return;
    }

    try {
      // Create AudioContext (use webkitAudioContext for Safari fallback)
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        console.error('Web Audio API not supported in this browser');
        return;
      }

      this.audioContext = new AudioContextClass();
      this.isInitialized = true;

      console.log('[AudioContext] Initialized', {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate,
        destination: this.audioContext.destination.channelCount,
      });

      // Resume if suspended (common on mobile)
      if (this.audioContext.state === 'suspended') {
        await this.resume();
      }

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('[AudioContext] Failed to initialize:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Get the AudioContext instance
   */
  public getContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Resume the AudioContext (required for autoplay policy compliance)
   */
  public async resume(): Promise<void> {
    if (!this.audioContext) {
      console.warn('[AudioContext] Cannot resume - not initialized');
      return;
    }

    if (this.audioContext.state === 'running') {
      return; // Already running
    }

    try {
      await this.audioContext.resume();
      this.resumeAttempts = 0;
      console.log('[AudioContext] Resumed successfully');
    } catch (error) {
      this.resumeAttempts++;
      console.error(`[AudioContext] Failed to resume (attempt ${this.resumeAttempts}):`, error);

      // Retry with exponential backoff
      if (this.resumeAttempts < this.maxResumeAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.resumeAttempts), 5000);
        setTimeout(() => this.resume(), delay);
      }
    }
  }

  /**
   * Suspend the AudioContext to save resources
   */
  public async suspend(): Promise<void> {
    if (!this.audioContext || this.audioContext.state !== 'running') {
      return;
    }

    try {
      await this.audioContext.suspend();
      console.log('[AudioContext] Suspended');
    } catch (error) {
      console.error('[AudioContext] Failed to suspend:', error);
    }
  }

  /**
   * Close the AudioContext and cleanup
   */
  public async dispose(): Promise<void> {
    this.removeEventListeners();

    if (!this.audioContext) {
      return;
    }

    try {
      await this.audioContext.close();
      this.audioContext = null;
      this.isInitialized = false;
      console.log('[AudioContext] Disposed');
    } catch (error) {
      console.error('[AudioContext] Failed to dispose:', error);
    }
  }

  /**
   * Get current AudioContext state
   */
  public getState(): AudioContextState {
    if (!this.audioContext) {
      return AudioContextState.CLOSED;
    }

    return this.audioContext.state as AudioContextState;
  }

  /**
   * Check if AudioContext is ready for playback
   */
  public isReady(): boolean {
    return this.isInitialized && this.audioContext !== null && this.audioContext.state === 'running';
  }

  /**
   * Get current time from AudioContext
   */
  public getCurrentTime(): number {
    return this.audioContext?.currentTime ?? 0;
  }

  /**
   * Setup event listeners for automatic context management
   */
  private setupEventListeners(): void {
    // Resume on user interaction (required for many browsers)
    document.addEventListener('click', this.handleUserInteraction);
    document.addEventListener('keydown', this.handleUserInteraction);
    document.addEventListener('touchstart', this.handleUserInteraction);

    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    document.removeEventListener('click', this.handleUserInteraction);
    document.removeEventListener('keydown', this.handleUserInteraction);
    document.removeEventListener('touchstart', this.handleUserInteraction);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Handle user interaction - resume context if needed
   */
  private handleUserInteraction(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.resume();
    }
  }

  /**
   * Handle visibility change - suspend when hidden, resume when visible
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.suspend();
    } else {
      this.resume();
    }
  }
}

// Export singleton instance
export const audioContextManager = AudioContextManager.getInstance();
