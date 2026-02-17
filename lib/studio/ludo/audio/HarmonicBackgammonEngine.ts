/**
 * HarmonicBackgammonEngine - Procedural chord progression for backgammon gameplay
 *
 * Generates dynamic harmonic progressions that respond to game state:
 * - Turn-based chord changes
 * - Momentum-driven brightness/darkness
 * - Tension-aware harmonic choices
 * - Drift system for musical variation
 *
 * Ported and adapted from onder2's HarmonicEngine
 */

import {
  ChordTransition,
  buildKeyChordRelationships,
  brightenChord,
  darkenChord,
  getRelativeChord,
  calculateHarmonicDistance,
} from './ChordTheory';

/**
 * Transition Policy - Inspired by iMUSE (LucasArts, 1991)
 * Controls how chord changes are executed
 */
export enum TransitionPolicy {
  IMMEDIATE = 'immediate',   // Hard cut (dramatic events: hits, defeats)
  SMOOTH = 'smooth',         // Cross-fade with voice leading (standard transitions)
  PIVOT = 'pivot',           // Insert pivot chord (distant harmonies)
  BRIDGE = 'bridge',         // Short melodic bridge (iMUSE-style)
  DEFER = 'defer',           // Wait for next beat/bar boundary
  INHERIT = 'inherit'        // Use current transition state
}

export interface GameState {
  momentum: number;      // -1 (losing badly) to 1 (winning)
  tension: number;       // 0 (calm) to 1 (high stakes)
  phase: 'opening' | 'middle' | 'bearoff' | 'endgame';
}

export interface DriftSettings {
  enabled: boolean;
  probability: number;     // 0-1, chance of drifting vs following progression
  pace: 'glacial' | 'slow' | 'medium' | 'fast' | 'frenetic';
  memoryBias: number;      // 0-1, tendency to avoid recently played chords
}

/**
 * Transition settings
 */
export interface TransitionSettings {
  enabled: boolean;              // Enable transition intelligence
  harmonicDistanceThreshold: number; // 0-1, max distance for direct transition (default: 0.5)
  useVoiceLeading: boolean;      // Optimize 6-layer pad voicings
  usePivotChords: boolean;       // Insert pivot chords for distant transitions
  beatSynchronized: boolean;     // Sync transitions to beat boundaries
}

/**
 * Harmonic engine for procedural chord generation
 */
export class HarmonicBackgammonEngine {
  private chordProgression: string[] = ['Cmaj7', 'Am7', 'Fmaj7', 'G7'];
  private keySignature = 'C';
  private currentChord = 'Cmaj7';
  private progressionIndex = 0;
  private tempo = 120;

  private gameState: GameState = {
    momentum: 0,
    tension: 0,
    phase: 'opening'
  };

  private driftSettings: DriftSettings = {
    enabled: true,
    probability: 0.3,
    pace: 'medium',
    memoryBias: 0.7
  };

  private transitionSettings: TransitionSettings = {
    enabled: true,
    harmonicDistanceThreshold: 0.5,  // iMUSE-inspired: gate distant transitions
    useVoiceLeading: true,            // Classical music theory optimization
    usePivotChords: true,             // Insert intermediates for smooth transitions
    beatSynchronized: true            // Sync to musical boundaries
  };

  private chordHistory: string[] = [];
  private chordRelationships: Map<string, ChordTransition[]> = new Map();
  private isActive = false;
  private progressionTimer?: NodeJS.Timeout;

  // Event listeners
  private chordChangeListeners: Array<(chord: string, policy?: TransitionPolicy) => void> = [];

  constructor() {
    console.log('🎹 Initializing Harmonic Backgammon Engine...');
    this.initializeDefaultRelationships();
  }

  /**
   * Set chord progression and key from theme
   */
  setProgression(progression: string[], keySignature: string): void {
    this.chordProgression = [...progression];
    this.keySignature = keySignature;
    this.progressionIndex = 0;

    if (progression.length > 0) {
      this.currentChord = progression[0];
    }

    this.buildChordRelationships();
    console.log(`🎵 Progression set: ${progression.join(' → ')} in ${keySignature}`);
  }

  /**
   * Configure drift behavior
   */
  setDriftSettings(settings: Partial<DriftSettings>): void {
    this.driftSettings = { ...this.driftSettings, ...settings };
    console.log(`🌊 Drift: ${(this.driftSettings.probability * 100).toFixed(0)}% at ${this.driftSettings.pace} pace`);
  }

  /**
   * Configure transition intelligence
   */
  setTransitionSettings(settings: Partial<TransitionSettings>): void {
    this.transitionSettings = { ...this.transitionSettings, ...settings };
    console.log(`🎯 Transition Intelligence: ${settings.enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Get transition settings
   */
  getTransitionSettings(): TransitionSettings {
    return { ...this.transitionSettings };
  }

  /**
   * Set tempo (BPM)
   */
  setTempo(bpm: number): void {
    this.tempo = Math.max(60, Math.min(200, bpm));
  }

  /**
   * Update game state (affects harmonic choices)
   */
  updateGameState(state: Partial<GameState>): void {
    this.gameState = { ...this.gameState, ...state };

    // Adjust drift probability based on tension
    if (state.tension !== undefined) {
      const baseProbability = this.driftSettings.probability;
      const tensionInfluence = state.tension * 0.2; // Up to 20% more drift when tense
      this.driftSettings.probability = Math.min(0.8, baseProbability + tensionInfluence);
    }
  }

  /**
   * Start automatic chord progression
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('▶️ Harmonic Engine started');
    this.scheduleNextChord();
  }

  /**
   * Stop chord progression
   */
  stop(): void {
    this.isActive = false;
    if (this.progressionTimer) {
      clearTimeout(this.progressionTimer);
      this.progressionTimer = undefined;
    }
    console.log('⏹️ Harmonic Engine stopped');
  }

  /**
   * Manually advance to next chord with optional policy
   */
  advanceChord(policy?: TransitionPolicy): void {
    this.processChordChange(policy);
  }

  /**
   * Request chord change with specific policy
   * Returns true if transition allowed, false if rejected by distance gating
   */
  requestChordChange(toChord: string, policy: TransitionPolicy = TransitionPolicy.SMOOTH): boolean {
    if (!this.transitionSettings.enabled) {
      // Transition intelligence disabled, allow any change
      this.setCurrentChord(toChord, policy);
      return true;
    }

    // Check harmonic distance
    const distance = calculateHarmonicDistance(this.currentChord, toChord);
    console.log(`🎵 Harmonic distance ${this.currentChord} → ${toChord}: ${distance.toFixed(2)}`);

    // Immediate and Bridge policies override distance check
    if (policy === TransitionPolicy.IMMEDIATE || policy === TransitionPolicy.BRIDGE) {
      this.setCurrentChord(toChord, policy);
      return true;
    }

    // Check if transition is too distant
    if (distance > this.transitionSettings.harmonicDistanceThreshold) {
      console.log(`⚠️ Transition rejected: distance ${distance.toFixed(2)} > threshold ${this.transitionSettings.harmonicDistanceThreshold}`);

      // If pivot chords enabled, try to insert one
      if (this.transitionSettings.usePivotChords && policy === TransitionPolicy.PIVOT) {
        const pivotChord = this.findPivotChord(this.currentChord, toChord);
        if (pivotChord) {
          console.log(`🎯 Using pivot chord: ${this.currentChord} → ${pivotChord} → ${toChord}`);
          // First transition to pivot
          this.setCurrentChord(pivotChord, TransitionPolicy.SMOOTH);
          // Schedule final transition after delay
          setTimeout(() => {
            this.setCurrentChord(toChord, TransitionPolicy.SMOOTH);
          }, 800); // 800ms between pivot and target
          return true;
        }
      }

      return false; // Reject transition
    }

    // Distance OK, allow transition
    this.setCurrentChord(toChord, policy);
    return true;
  }

  /**
   * Force brightness (for positive events like bear-offs)
   */
  addBrightness(): void {
    const brighterChord = brightenChord(this.currentChord);
    if (brighterChord !== this.currentChord) {
      this.setCurrentChord(brighterChord);
    }
  }

  /**
   * Add darkness (for negative events like hits)
   */
  addDarkness(): void {
    const darkerChord = darkenChord(this.currentChord);
    if (darkerChord !== this.currentChord) {
      this.setCurrentChord(darkerChord);
    }
  }

  /**
   * Modulate to relative minor/major (for tension moments)
   */
  modulateToRelative(): void {
    const relativeChord = getRelativeChord(this.currentChord);
    this.setCurrentChord(relativeChord);
  }

  /**
   * Get current chord
   */
  getCurrentChord(): string {
    return this.currentChord;
  }

  /**
   * Get current progression
   */
  getProgression(): string[] {
    return [...this.chordProgression];
  }

  /**
   * Add chord change listener
   */
  onChordChange(callback: (chord: string) => void): void {
    this.chordChangeListeners.push(callback);
  }

  /**
   * Remove chord change listener
   */
  removeChordChangeListener(callback: (chord: string) => void): void {
    const index = this.chordChangeListeners.indexOf(callback);
    if (index >= 0) {
      this.chordChangeListeners.splice(index, 1);
    }
  }

  /**
   * Get current game state
   */
  getGameState(): GameState {
    return { ...this.gameState };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Schedule next chord change
   */
  private scheduleNextChord(): void {
    if (!this.isActive) return;

    const duration = this.calculateChordDuration();

    this.progressionTimer = setTimeout(() => {
      if (this.isActive) {
        this.processChordChange();
        this.scheduleNextChord();
      }
    }, duration);
  }

  /**
   * Process chord change with drift logic and transition intelligence
   */
  private processChordChange(policy?: TransitionPolicy): void {
    let nextChord: string;

    // Decide whether to drift or follow progression
    if (this.driftSettings.enabled && Math.random() < this.driftSettings.probability) {
      nextChord = this.selectDriftChord();
    } else {
      nextChord = this.getNextProgressionChord();
    }

    // Apply game state modifiers
    nextChord = this.applyGameStateModifiers(nextChord);

    // Use SMOOTH policy by default for automatic changes
    const transitionPolicy = policy || TransitionPolicy.SMOOTH;

    // Attempt transition with policy
    this.requestChordChange(nextChord, transitionPolicy);
  }

  /**
   * Select chord using drift logic and music theory
   */
  private selectDriftChord(): string {
    const relationships = this.chordRelationships.get(this.currentChord) || [];

    if (relationships.length === 0) {
      return this.getNextProgressionChord();
    }

    // Apply memory bias (avoid recently played chords)
    const memoryInfluence = this.calculateMemoryInfluence();
    const adjustedRelationships = relationships.map(rel => {
      const recentlyPlayed = this.chordHistory.slice(-8).includes(rel.toChord);
      const memoryPenalty = recentlyPlayed ? (1 - this.driftSettings.memoryBias) : 1;

      return {
        ...rel,
        probability: rel.probability * memoryPenalty * (1 + memoryInfluence)
      };
    });

    // Weighted random selection
    const totalWeight = adjustedRelationships.reduce((sum, rel) => sum + rel.probability, 0);
    let random = Math.random() * totalWeight;

    for (const rel of adjustedRelationships) {
      random -= rel.probability;
      if (random <= 0) {
        return rel.toChord;
      }
    }

    return this.getNextProgressionChord();
  }

  /**
   * Calculate memory bias influence
   */
  private calculateMemoryInfluence(): number {
    const recentHistory = this.chordHistory.slice(-8);
    if (recentHistory.length === 0) return 0;

    const uniqueChords = new Set(recentHistory);
    const diversity = uniqueChords.size / recentHistory.length;

    // Favor diversity
    return (1 - diversity) * this.driftSettings.memoryBias;
  }

  /**
   * Get next chord in progression sequence
   */
  private getNextProgressionChord(): string {
    if (this.chordProgression.length === 0) return this.currentChord;

    this.progressionIndex = (this.progressionIndex + 1) % this.chordProgression.length;
    return this.chordProgression[this.progressionIndex];
  }

  /**
   * Apply game state modifiers to chord selection
   */
  private applyGameStateModifiers(chord: string): string {
    // Apply momentum: brighter when winning, darker when losing
    if (Math.abs(this.gameState.momentum) > 0.5) {
      if (this.gameState.momentum > 0.5 && Math.random() < 0.3) {
        return brightenChord(chord);
      } else if (this.gameState.momentum < -0.5 && Math.random() < 0.3) {
        return darkenChord(chord);
      }
    }

    return chord;
  }

  /**
   * Set current chord and notify listeners with policy
   */
  private setCurrentChord(chord: string, policy?: TransitionPolicy): void {
    if (this.currentChord !== chord) {
      this.currentChord = chord;
      this.addToHistory(chord);
      this.notifyChordChange(chord, policy);
    }
  }

  /**
   * Find pivot chord for smooth transition between distant chords
   * Returns intermediate chord that's close to both, or null if none found
   */
  private findPivotChord(fromChord: string, toChord: string): string | null {
    // Try relative major/minor as pivot
    const relativeChord = getRelativeChord(fromChord);
    const distanceToRelative = calculateHarmonicDistance(fromChord, relativeChord);
    const distanceRelativeToTarget = calculateHarmonicDistance(relativeChord, toChord);

    if (distanceToRelative < 0.3 && distanceRelativeToTarget < 0.4) {
      return relativeChord;
    }

    // Try suspended chord as pivot (for tension)
    const suspendedPivots = this.getSuspendedChord(fromChord);
    for (const susChord of suspendedPivots) {
      const distanceToSus = calculateHarmonicDistance(fromChord, susChord);
      const distanceSusToTarget = calculateHarmonicDistance(susChord, toChord);

      if (distanceToSus < 0.3 && distanceSusToTarget < 0.4) {
        return susChord;
      }
    }

    return null; // No suitable pivot found
  }

  /**
   * Get suspended chord variants for tension
   */
  private getSuspendedChord(chord: string): string[] {
    // Extract root note
    const root = chord.replace(/[^A-G#b]/g, '');
    if (!root) return [];

    return [`${root}sus2`, `${root}sus4`];
  }

  /**
   * Calculate chord duration based on tempo and drift pace
   */
  private calculateChordDuration(): number {
    const baseBeat = 60000 / this.tempo; // ms per beat
    const baseChordLength = baseBeat * 4; // 4 beats

    let multiplier: number;
    switch (this.driftSettings.pace) {
      case 'glacial': multiplier = 8; break;
      case 'slow': multiplier = 4; break;
      case 'medium': multiplier = 2; break;
      case 'fast': multiplier = 1; break;
      case 'frenetic': multiplier = 0.5; break;
      default: multiplier = 2;
    }

    // Add variation (±20%)
    const variation = (Math.random() - 0.5) * 0.4;
    return baseChordLength * multiplier * (1 + variation);
  }

  /**
   * Build chord relationships from progression and key
   */
  private buildChordRelationships(): void {
    this.chordRelationships.clear();

    // Build relationships from key
    const keyRelationships = buildKeyChordRelationships(this.keySignature);
    keyRelationships.forEach((transitions, chord) => {
      this.chordRelationships.set(chord, transitions);
    });

    // Add progression-specific relationships
    for (let i = 0; i < this.chordProgression.length; i++) {
      const currentChord = this.chordProgression[i];
      const nextChord = this.chordProgression[(i + 1) % this.chordProgression.length];

      if (!this.chordRelationships.has(currentChord)) {
        this.chordRelationships.set(currentChord, []);
      }

      const existing = this.chordRelationships.get(currentChord)!;
      const alreadyExists = existing.some(t => t.toChord === nextChord);

      if (!alreadyExists) {
        existing.push({
          fromChord: currentChord,
          toChord: nextChord,
          probability: 0.8,
          context: 'tonic'
        });
      }
    }

    console.log(`🔗 Built ${this.chordRelationships.size} chord relationships`);
  }

  /**
   * Initialize default chord relationships (fallback)
   */
  private initializeDefaultRelationships(): void {
    const defaultRelationships: { [chord: string]: ChordTransition[] } = {
      'C': [
        { fromChord: 'C', toChord: 'Am', probability: 0.7, context: 'relative' },
        { fromChord: 'C', toChord: 'F', probability: 0.6, context: 'subdominant' },
        { fromChord: 'C', toChord: 'G', probability: 0.8, context: 'dominant' }
      ],
      'Am': [
        { fromChord: 'Am', toChord: 'F', probability: 0.7, context: 'subdominant' },
        { fromChord: 'Am', toChord: 'C', probability: 0.6, context: 'relative' },
        { fromChord: 'Am', toChord: 'G', probability: 0.5, context: 'dominant' }
      ],
      'F': [
        { fromChord: 'F', toChord: 'C', probability: 0.6, context: 'tonic' },
        { fromChord: 'F', toChord: 'G', probability: 0.8, context: 'dominant' },
        { fromChord: 'F', toChord: 'Am', probability: 0.5, context: 'relative' }
      ],
      'G': [
        { fromChord: 'G', toChord: 'C', probability: 0.9, context: 'tonic' },
        { fromChord: 'G', toChord: 'Am', probability: 0.5, context: 'relative' },
        { fromChord: 'G', toChord: 'F', probability: 0.4, context: 'subdominant' }
      ]
    };

    for (const [chord, transitions] of Object.entries(defaultRelationships)) {
      this.chordRelationships.set(chord, transitions);
    }
  }

  /**
   * Add chord to history
   */
  private addToHistory(chord: string): void {
    this.chordHistory.push(chord);

    // Keep history limited to last 16 chords
    if (this.chordHistory.length > 16) {
      this.chordHistory = this.chordHistory.slice(-16);
    }
  }

  /**
   * Notify listeners of chord change with transition policy
   */
  private notifyChordChange(chord: string, policy?: TransitionPolicy): void {
    this.chordChangeListeners.forEach(callback => {
      try {
        callback(chord, policy);
      } catch (error) {
        console.error('Error in chord change listener:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.chordChangeListeners.length = 0;
    this.chordRelationships.clear();
    this.chordHistory.length = 0;
  }
}
