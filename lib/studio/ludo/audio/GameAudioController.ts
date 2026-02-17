/**
 * GameAudioController - Integrates ambient soundscape with backgammon gameplay
 *
 * Connects the harmonic engine and ambient synthesizer to game events,
 * creating a dynamic soundscape that responds to:
 * - Turn changes
 * - Checker hits
 * - Bear-offs
 * - Game momentum
 * - Victory/defeat
 *
 * Works alongside existing SoundManager for discrete sound effects.
 */

import { HarmonicBackgammonEngine } from './HarmonicBackgammonEngine';
import { AmbientSynthesizer, LayerType } from './AmbientSynthesizer';
import { soundManager } from './SoundManager';
import { BoardTheme } from '../three/variants';
import { Player } from '../game/types';

export interface GameStateSnapshot {
  currentPlayer: Player;
  whitePipCount: number;
  blackPipCount: number;
  turnNumber: number;
  phase: 'opening' | 'middle' | 'bearoff' | 'endgame';
}

/**
 * Game audio controller
 */
export class GameAudioController {
  private harmonicEngine: HarmonicBackgammonEngine;
  private synthesizer: AmbientSynthesizer;
  private currentTheme?: BoardTheme;
  private isEnabled: boolean = true;
  private isInitialized: boolean = false;
  private isPlaying: boolean = false;

  // Game state tracking
  private lastGameState?: GameStateSnapshot;
  private turnsSinceChordChange: number = 0;
  private chordChangeInterval: number = 3; // Change chord every N turns

  constructor() {
    this.harmonicEngine = new HarmonicBackgammonEngine();
    this.synthesizer = new AmbientSynthesizer();

    console.log('🎮 Game Audio Controller created');
  }

  /**
   * Initialize with a theme
   */
  async initialize(theme: BoardTheme): Promise<void> {
    if (!theme.sonic?.enabled) {
      console.log('🔇 Theme has no sonic configuration, ambient audio disabled');
      return;
    }

    try {
      console.log(`🎵 Initializing ambient audio for theme: ${theme.name}`);

      // Initialize synthesizer
      await this.synthesizer.initialize();

      // Configure harmonic engine from theme
      this.harmonicEngine.setProgression(
        theme.sonic.chordProgression,
        theme.sonic.keySignature
      );
      this.harmonicEngine.setTempo(theme.sonic.tempo);

      // Configure synthesizer layers from theme
      for (const [layerId, config] of Object.entries(theme.sonic.layers)) {
        this.synthesizer.setLayerConfig(
          layerId as LayerType,
          {
            volume: config.volume,
            density: config.density,
            character: config.character,
            enabled: true
          }
        );
      }

      // Set initial mood
      this.synthesizer.setMood(
        theme.sonic.mood.valence,
        theme.sonic.mood.energy,
        0 // Initial tension = 0
      );

      // Set tempo
      this.synthesizer.setTempo(theme.sonic.tempo);

      // Setup chord change listener
      this.harmonicEngine.onChordChange((chord) => {
        console.log(`🎹 Chord changed to: ${chord}`);
        this.synthesizer.playChord(chord, '2m', 2.0);
      });

      this.currentTheme = theme;
      this.isInitialized = true;

      console.log('✅ Game Audio Controller initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Game Audio Controller:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Start ambient soundscape
   * Must be called after user interaction
   */
  async start(): Promise<void> {
    if (!this.isInitialized || !this.isEnabled || this.isPlaying) {
      console.log('⏸️ Cannot start - initialized:', this.isInitialized, 'enabled:', this.isEnabled, 'playing:', this.isPlaying);
      return;
    }

    try {
      console.log('🎵 Starting ambient soundscape...');

      // Start synthesizer (will call Tone.start() internally)
      await this.synthesizer.start();

      // Start harmonic engine (automatic chord progression)
      this.harmonicEngine.start();

      // Play initial chord
      this.synthesizer.playChord(this.harmonicEngine.getCurrentChord(), '4m', 3.0);

      this.isPlaying = true;
      console.log('✅ Ambient soundscape started');
    } catch (error) {
      console.error('❌ Failed to start ambient soundscape:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
  }

  /**
   * Stop ambient soundscape
   */
  stop(): void {
    if (!this.isPlaying) return;

    this.synthesizer.stop();
    this.harmonicEngine.stop();
    this.isPlaying = false;

    console.log('⏹️ Ambient soundscape stopped');
  }

  /**
   * Fade out gracefully
   */
  fadeOut(duration: number = 3.0): void {
    this.synthesizer.fadeOut(duration);
    setTimeout(() => {
      this.harmonicEngine.stop();
      this.isPlaying = false;
    }, duration * 1000);
  }

  // ==================== GAME EVENT HANDLERS ====================

  /**
   * Handle turn start
   */
  onTurnStart(player: Player, gameState: GameStateSnapshot): void {
    if (!this.isEnabled || !this.isPlaying) return;

    // Update game state and momentum
    this.updateGameMomentum(gameState);

    // Track turn count
    this.turnsSinceChordChange++;

    // Advance chord every N turns
    if (this.turnsSinceChordChange >= this.chordChangeInterval) {
      this.harmonicEngine.advanceChord();
      this.turnsSinceChordChange = 0;

      // Vary chord change interval (2-4 turns)
      this.chordChangeInterval = 2 + Math.floor(Math.random() * 3);
    }

    // NOTE: Color layers disabled - will be used for sound effects later
    // // Occasional arpeggio on turn start (40% chance)
    // if (Math.random() < 0.4) {
    //   this.synthesizer.triggerArpeggio(this.harmonicEngine.getCurrentChord());
    // }

    this.lastGameState = gameState;
  }

  /**
   * Handle dice roll
   */
  onDiceRoll(_values: [number, number]): void {
    if (!this.isEnabled || !this.isPlaying) return;

    // NOTE: Color layers disabled - will be used for sound effects later
    // // Trigger sparkle for doubles
    // if (values[0] === values[1]) {
    //   this.synthesizer.triggerSparkle();
    // }
  }

  /**
   * Handle checker hit (opponent piece captured)
   */
  onCheckerHit(_player: Player, _point: number): void {
    if (!this.isEnabled || !this.isPlaying) return;

    // Play discrete hit sound (from existing SoundManager)
    soundManager.play('hit_impact');

    // Harmonic response: use suspended chord for tension
    const currentChord = this.harmonicEngine.getCurrentChord();
    const tensionChord = this.getTensionChord(currentChord);

    // Play short tension chord burst
    this.synthesizer.playChord(tensionChord, '4n', 0.8);

    console.log(`💥 Hit tension: ${currentChord} → ${tensionChord}`);

    // Modulate to relative minor after tension resolves
    setTimeout(() => {
      this.harmonicEngine.modulateToRelative();
    }, 300);

    // NOTE: Color layers disabled - will be used for sound effects later
    // // Trigger bass note for impact
    // this.synthesizer.triggerBass(this.harmonicEngine.getCurrentChord(), '4n');

    // Increase tension momentarily
    const currentState = this.harmonicEngine.getGameState();
    this.harmonicEngine.updateGameState({
      tension: Math.min(1.0, currentState.tension + 0.2)
    });

    // Decay tension over time
    setTimeout(() => {
      const state = this.harmonicEngine.getGameState();
      this.harmonicEngine.updateGameState({
        tension: Math.max(0, state.tension - 0.2)
      });
    }, 3000);
  }

  /**
   * Handle bear-off (remove checker from board)
   */
  onBearOff(_player: Player): void {
    if (!this.isEnabled || !this.isPlaying) return;

    // Play discrete bear-off sound
    soundManager.play('bear_off');

    // Harmonic response: use extended/bright chord
    const currentChord = this.harmonicEngine.getCurrentChord();
    const brightChord = this.getBrightChord(currentChord);

    // Play short bright chord flourish
    this.synthesizer.playChord(brightChord, '4n', 0.8);

    console.log(`✨ Bear-off brightness: ${currentChord} → ${brightChord}`);

    // Add brightness to harmonic engine
    setTimeout(() => {
      this.harmonicEngine.addBrightness();
    }, 300);

    // NOTE: Color layers disabled - will be used for sound effects later
    // // Trigger ascending sparkle
    // this.synthesizer.triggerSparkle();

    // Brief mood lift
    if (this.currentTheme?.sonic) {
      const mood = this.currentTheme.sonic.mood;
      this.synthesizer.setMood(
        Math.min(1.0, mood.valence + 0.1),
        mood.energy,
        0
      );
    }
  }

  /**
   * Handle game end
   */
  onGameEnd(winner: Player, currentPlayer: Player): void {
    if (!this.isEnabled || !this.isPlaying) return;

    const isWin = winner === currentPlayer;

    if (isWin) {
      this.playVictorySequence();
    } else {
      this.playDefeatSequence();
    }

    // Fade out after sequence
    setTimeout(() => {
      this.fadeOut(3.0);
    }, 2000);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Update game momentum based on pip count
   */
  private updateGameMomentum(gameState: GameStateSnapshot): void {
    const pipDiff = gameState.blackPipCount - gameState.whitePipCount;
    const momentum = Math.max(-1, Math.min(1, pipDiff / 50));

    // Calculate tension based on absolute pip difference
    const tension = Math.min(1.0, Math.abs(pipDiff) / 50);

    // Determine game phase
    const avgPips = (gameState.whitePipCount + gameState.blackPipCount) / 2;
    let phase: GameStateSnapshot['phase'] = 'middle';

    if (gameState.turnNumber < 10) {
      phase = 'opening';
    } else if (avgPips < 50) {
      phase = 'bearoff';
    } else if (avgPips < 30) {
      phase = 'endgame';
    }

    // Update harmonic engine game state
    this.harmonicEngine.updateGameState({
      momentum: gameState.currentPlayer === Player.WHITE ? momentum : -momentum,
      tension,
      phase
    });

    // Update synthesizer mood
    if (this.currentTheme?.sonic) {
      const baseMood = this.currentTheme.sonic.mood;

      // Modulate valence based on momentum
      const currentPlayerMomentum = gameState.currentPlayer === Player.WHITE ? momentum : -momentum;
      const moodValence = baseMood.valence + (currentPlayerMomentum * 0.3);

      this.synthesizer.setMood(
        Math.max(-1, Math.min(1, moodValence)),
        baseMood.energy,
        tension
      );
    }
  }

  /**
   * Play victory chord progression (onder-inspired)
   */
  private playVictorySequence(): void {
    const key = this.harmonicEngine.getProgression()[0];

    // Triumphant ascending progression using extended chords
    // Pattern: I → IV → V → I (with rich voicings)
    const victoryChords = this.buildVictoryProgression(key);

    victoryChords.forEach((chord, i) => {
      setTimeout(() => {
        // Longer duration for final chord
        const duration = i === victoryChords.length - 1 ? '2m' : '1m';
        this.synthesizer.playChord(chord, duration, 1.5);

        console.log(`🏆 Victory chord ${i + 1}/${victoryChords.length}: ${chord}`);
      }, i * 1000); // 1 second between chords
    });
  }

  /**
   * Play defeat progression (onder-inspired)
   */
  private playDefeatSequence(): void {
    // Descending to minor/darker progressions
    const defeatChords = this.buildDefeatProgression();

    defeatChords.forEach((chord, i) => {
      setTimeout(() => {
        this.synthesizer.playChord(chord, '1.5m', 2.0);
        console.log(`💔 Defeat chord ${i + 1}/${defeatChords.length}: ${chord}`);
      }, i * 1200); // 1.2 seconds between chords
    });
  }

  /**
   * Build triumphant victory progression
   */
  private buildVictoryProgression(baseKey: string): string[] {
    // Analyze base key to determine if major or minor
    const isMajor = !baseKey.includes('m') || baseKey.includes('maj');

    if (isMajor) {
      // Major key victory: I → IV → V → I (bright extended chords)
      return [
        baseKey,           // Start with tonic
        'Fmaj7',          // Subdominant (warm)
        'Gmaj7',          // Dominant (tension)
        'Cmaj9'           // Tonic resolution (triumph!)
      ];
    } else {
      // Minor key victory: modulate to relative major for triumph
      return [
        baseKey,           // Start with tonic minor
        'Fmaj7',          // Modulate to relative major
        'Gmaj7',          // Build tension
        'Cmaj9'           // Triumphant resolution
      ];
    }
  }

  /**
   * Build melancholic defeat progression
   */
  private buildDefeatProgression(): string[] {
    // Descending chromatic progression to minor
    return [
      'Am7',    // Start in minor
      'Fm7',    // Darker minor
      'Dm7',    // Even darker
      'Am'      // Resolve to plain minor (somber)
    ];
  }

  /**
   * Get tension chord for dramatic events (hits)
   * Uses suspended chords for unresolved tension
   */
  private getTensionChord(currentChord: string): string {
    // Map chords to suspended equivalents for tension
    const tensionMap: { [key: string]: string } = {
      'Cmaj7': 'Csus2',
      'Cmaj': 'Csus2',
      'C': 'Csus2',
      'Fmaj7': 'Fsus4',
      'Fmaj': 'Fsus4',
      'F': 'Fsus4',
      'Gmaj7': 'Gsus4',
      'Gmaj': 'Gsus4',
      'G': 'Gsus4',
      'Dmaj7': 'Dsus4',
      'Dmaj': 'Dsus4',
      'D': 'Dsus4',
      'Amaj7': 'Asus4',
      'Amaj': 'Asus4',
      'A': 'Asus4',
    };

    return tensionMap[currentChord] || 'Gsus4'; // Default to Gsus4 (dominant tension)
  }

  /**
   * Get bright chord for positive events (bear-offs)
   * Uses major 7th and 9th chords for brightness
   */
  private getBrightChord(currentChord: string): string {
    // Map chords to brighter extended equivalents
    const brightMap: { [key: string]: string } = {
      'Cmaj7': 'Cmaj9',
      'Cmaj': 'Cmaj7',
      'C': 'Cmaj7',
      'Fmaj7': 'Fmaj9',
      'Fmaj': 'Fmaj7',
      'F': 'Fmaj7',
      'Gmaj7': 'Gmaj9',
      'Gmaj': 'Gmaj7',
      'G': 'Gmaj7',
      'Dmaj7': 'Dmaj7',
      'Dmaj': 'Dmaj7',
      'D': 'Dmaj7',
      'Amaj7': 'Amaj7',
      'Amaj': 'Amaj7',
      'A': 'Amaj7',
      'Am7': 'Am9',
      'Am': 'Am7',
      'Dm7': 'Dm9',
      'Dm': 'Dm7',
    };

    return brightMap[currentChord] || 'Cmaj9'; // Default to Cmaj9 (bright!)
  }

  // ==================== CONTROL METHODS ====================

  /**
   * Enable/disable ambient audio
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;

    if (!enabled && this.isPlaying) {
      this.stop();
    }
  }

  /**
   * Check if enabled
   */
  isAmbientEnabled(): boolean {
    return this.isEnabled && this.isInitialized;
  }

  /**
   * Check if currently playing
   */
  isAmbientPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current chord
   */
  getCurrentChord(): string {
    return this.harmonicEngine.getCurrentChord();
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(_volume: number): void {
    // Apply to synthesizer master gain
    // (Would need to add this method to AmbientSynthesizer if needed)
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.harmonicEngine.dispose();
    this.synthesizer.dispose();
  }
}

// Export singleton instance
export const gameAudioController = new GameAudioController();
