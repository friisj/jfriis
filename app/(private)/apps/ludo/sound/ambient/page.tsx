'use client';

/**
 * Ambient Sound Design Page - /sound/ambient
 *
 * Test and configure harmonic progressions and ambient soundscapes.
 * Phase 5.0.11.8 - Ambient Soundscape UI
 */

import { useEffect, useState, useRef } from 'react';
import { AmbientSynthesizer, LayerType, LayerConfig } from '@/lib/studio/ludo/audio/AmbientSynthesizer';
import { CHORD_VOICINGS, getRelativeChord, brightenChord, darkenChord, calculateHarmonicDistance } from '@/lib/studio/ludo/audio/ChordTheory';
import { TransitionPolicy } from '@/lib/studio/ludo/audio/HarmonicBackgammonEngine';
import { Player } from '@/lib/studio/ludo/game/types';

type TabType = 'controls' | 'chords' | 'events' | 'advanced';

// Game state snapshot for simulation
interface GameStateSnapshot {
  momentum: number;    // -1 (losing) to 1 (winning)
  tension: number;     // 0 (calm) to 1 (tense)
  phase: 'opening' | 'middle' | 'bearoff' | 'endgame';
}

// Transition metrics
interface TransitionMetrics {
  totalRequests: number;
  acceptedTransitions: number;
  rejectedTransitions: number;
  pivotTransitions: number;
  lastDistance: number;
  lastPolicy: string;
}

export default function AmbientPage() {
  const [activeTab, setActiveTab] = useState<TabType>('controls');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [currentChord, setCurrentChord] = useState('Cmaj7');

  // Mood parameters
  const [valence, setValence] = useState(0); // -1 to 1
  const [energy, setEnergy] = useState(0.5); // 0 to 1
  const [tension, setTension] = useState(0.3); // 0 to 1

  // Layer configs
  const [padEnabled, setPadEnabled] = useState(true);
  const [padVolume, setPadVolume] = useState(75);
  const [bassEnabled, setBassEnabled] = useState(true);
  const [bassVolume, setBassVolume] = useState(50);
  const [arpeggioEnabled, setArpeggioEnabled] = useState(false);
  const [arpeggioVolume, setArpeggioVolume] = useState(40);
  const [sparkleEnabled, setSparkleEnabled] = useState(false);
  const [sparkleVolume, setSparkleVolume] = useState(20);
  const [washEnabled, setWashEnabled] = useState(false);
  const [washVolume, setWashVolume] = useState(30);

  // Transition intelligence toggle
  const [transitionIntelligenceEnabled, setTransitionIntelligenceEnabled] = useState(true);

  // Transition metrics
  const [metrics, setMetrics] = useState<TransitionMetrics>({
    totalRequests: 0,
    acceptedTransitions: 0,
    rejectedTransitions: 0,
    pivotTransitions: 0,
    lastDistance: 0,
    lastPolicy: 'none'
  });

  const synthRef = useRef<AmbientSynthesizer | null>(null);

  // Game simulation state
  const [gameState, setGameState] = useState<GameStateSnapshot>({
    momentum: 0,
    tension: 0.3,
    phase: 'opening'
  });
  const [turnCount, setTurnCount] = useState(0);

  // Get available chords from voicings
  const chords = Object.keys(CHORD_VOICINGS);

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, []);

  const handleInitialize = async () => {
    if (synthRef.current) return;

    try {
      const synth = new AmbientSynthesizer();
      await synth.initialize();
      synthRef.current = synth;
      setIsInitialized(true);
      console.log('✅ Ambient Synthesizer initialized');
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
    }
  };

  const handleStart = async () => {
    if (!synthRef.current) return;

    try {
      await synthRef.current.start();
      setIsPlaying(true);

      // Play initial chord
      synthRef.current.playChord(currentChord);

      console.log('▶️ Ambient soundscape started');
    } catch (error) {
      console.error('❌ Failed to start:', error);
    }
  };

  const handleStop = () => {
    if (!synthRef.current) return;

    synthRef.current.stop();
    setIsPlaying(false);
    console.log('⏹️ Ambient soundscape stopped');
  };

  const handleTempoChange = (newTempo: number) => {
    setTempo(newTempo);
    if (synthRef.current && isInitialized) {
      synthRef.current.setTempo(newTempo);
    }
  };

  const handleMoodChange = (newValence: number, newEnergy: number, newTension: number) => {
    setValence(newValence);
    setEnergy(newEnergy);
    setTension(newTension);

    if (synthRef.current && isInitialized) {
      synthRef.current.setMood(newValence, newEnergy, newTension);
    }
  };

  const handleLayerConfigChange = (layerId: LayerType, config: Partial<LayerConfig>) => {
    if (synthRef.current && isInitialized) {
      synthRef.current.setLayerConfig(layerId, config);
    }
  };

  const handlePlayChord = () => {
    if (synthRef.current && isPlaying) {
      synthRef.current.playChord(currentChord);
      console.log(`🎹 Playing chord: ${currentChord}`);
    }
  };

  /**
   * Request chord change with policy and update metrics
   */
  const requestChordChange = (toChord: string, policy: TransitionPolicy): boolean => {
    if (!synthRef.current || !isPlaying) return false;

    const fromChord = currentChord;
    const distance = calculateHarmonicDistance(fromChord, toChord);

    // Update metrics
    setMetrics(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
      lastDistance: distance,
      lastPolicy: policy
    }));

    // If transition intelligence disabled, always allow
    if (!transitionIntelligenceEnabled) {
      setCurrentChord(toChord);
      synthRef.current.playChord(toChord);
      setMetrics(prev => ({ ...prev, acceptedTransitions: prev.acceptedTransitions + 1 }));
      console.log(`✅ Transition allowed (intelligence OFF): ${fromChord} → ${toChord}`);
      return true;
    }

    // Check distance threshold (0.5)
    const threshold = 0.5;

    // IMMEDIATE and BRIDGE policies override distance check
    if (policy === TransitionPolicy.IMMEDIATE || policy === TransitionPolicy.BRIDGE) {
      setCurrentChord(toChord);
      synthRef.current.playChord(toChord);
      setMetrics(prev => ({ ...prev, acceptedTransitions: prev.acceptedTransitions + 1 }));
      console.log(`✅ Transition forced (${policy}): ${fromChord} → ${toChord}`);
      return true;
    }

    // Check if distance too large
    if (distance > threshold) {
      // Try pivot chord for PIVOT policy
      if (policy === TransitionPolicy.PIVOT) {
        const pivotChord = findPivotChord(fromChord, toChord);
        if (pivotChord) {
          // Use pivot
          setCurrentChord(pivotChord);
          synthRef.current.playChord(pivotChord, '4n', 0.8);
          console.log(`🎯 Pivot: ${fromChord} → ${pivotChord} → ${toChord}`);

          setMetrics(prev => ({
            ...prev,
            acceptedTransitions: prev.acceptedTransitions + 1,
            pivotTransitions: prev.pivotTransitions + 1
          }));

          // Schedule final transition
          setTimeout(() => {
            setCurrentChord(toChord);
            synthRef.current!.playChord(toChord);
            console.log(`🎯 Resolved to target: ${toChord}`);
          }, 800);
          return true;
        }
      }

      // Reject transition
      setMetrics(prev => ({ ...prev, rejectedTransitions: prev.rejectedTransitions + 1 }));
      console.log(`❌ Transition rejected: distance ${distance.toFixed(2)} > ${threshold}`);
      return false;
    }

    // Distance OK, allow transition
    setCurrentChord(toChord);
    synthRef.current.playChord(toChord);
    setMetrics(prev => ({ ...prev, acceptedTransitions: prev.acceptedTransitions + 1 }));
    console.log(`✅ Transition allowed: ${fromChord} → ${toChord} (distance: ${distance.toFixed(2)})`);
    return true;
  };

  /**
   * Find pivot chord between distant chords
   */
  const findPivotChord = (fromChord: string, toChord: string): string | null => {
    // Try relative major/minor
    const relativeChord = getRelativeChord(fromChord);
    const distanceToRelative = calculateHarmonicDistance(fromChord, relativeChord);
    const distanceRelativeToTarget = calculateHarmonicDistance(relativeChord, toChord);

    if (distanceToRelative < 0.3 && distanceRelativeToTarget < 0.4) {
      return relativeChord;
    }

    // Try suspended chords
    const root = fromChord.replace(/[^A-G#b]/g, '');
    if (root) {
      const suspendedChords = [`${root}sus2`, `${root}sus4`];
      for (const susChord of suspendedChords) {
        const distanceToSus = calculateHarmonicDistance(fromChord, susChord);
        const distanceSusToTarget = calculateHarmonicDistance(susChord, toChord);

        if (distanceToSus < 0.3 && distanceSusToTarget < 0.4) {
          return susChord;
        }
      }
    }

    return null;
  };

  const handleTriggerArpeggio = () => {
    if (synthRef.current && isPlaying) {
      synthRef.current.triggerArpeggio(currentChord);
      console.log(`🎵 Triggered arpeggio: ${currentChord}`);
    }
  };

  const handleTriggerSparkle = () => {
    if (synthRef.current && isPlaying) {
      synthRef.current.triggerSparkle(currentChord);
      console.log(`✨ Triggered sparkle: ${currentChord}`);
    }
  };

  const handleTriggerBass = () => {
    if (synthRef.current && isPlaying) {
      synthRef.current.triggerBass(currentChord);
      console.log(`🎸 Triggered bass: ${currentChord}`);
    }
  };

  // ==================== GAME EVENT SIMULATIONS ====================

  const simulateDiceRoll = () => {
    if (!synthRef.current || !isPlaying) return;

    const roll: [number, number] = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];

    console.log(`🎲 Simulated dice roll: ${roll[0]}, ${roll[1]}`);

    // Trigger sparkle for doubles
    if (roll[0] === roll[1]) {
      synthRef.current.triggerSparkle(currentChord);
      console.log('✨ Doubles! Triggered sparkle');
    }

    // Advance chord occasionally (every 2-4 turns) using DEFER policy (low priority)
    if (Math.random() < 0.3) {
      const currentIndex = chords.indexOf(currentChord);
      const nextIndex = (currentIndex + 1) % chords.length;
      const nextChord = chords[nextIndex];
      // Use DEFER policy - wait for natural musical boundary
      requestChordChange(nextChord, TransitionPolicy.DEFER);
    }
  };

  const simulateTurnStart = () => {
    if (!synthRef.current || !isPlaying) return;

    setTurnCount(prev => prev + 1);

    // Update game phase based on turn count
    let phase: GameStateSnapshot['phase'] = 'opening';
    if (turnCount > 30) phase = 'bearoff';
    else if (turnCount > 20) phase = 'endgame';
    else if (turnCount > 10) phase = 'middle';

    // Random momentum shift
    const newMomentum = Math.max(-1, Math.min(1, gameState.momentum + (Math.random() - 0.5) * 0.3));

    setGameState({
      momentum: newMomentum,
      tension: gameState.tension,
      phase
    });

    // Update mood based on game state
    synthRef.current.setMood(
      valence + (newMomentum * 0.2),
      energy,
      gameState.tension
    );

    // Occasional arpeggio on turn start
    if (Math.random() < 0.4) {
      synthRef.current.triggerArpeggio(currentChord);
      console.log('🎵 Turn start arpeggio');
    }

    console.log(`🔄 Turn ${turnCount + 1} - Phase: ${phase}, Momentum: ${newMomentum.toFixed(2)}`);
  };

  const simulateCheckerHit = () => {
    if (!synthRef.current || !isPlaying) return;

    console.log('💥 Simulated checker hit!');

    // Trigger bass for immediate impact
    synthRef.current.triggerBass(currentChord, '4n');

    // Use PIVOT policy to transition to darker/relative minor
    const relativeChord = getRelativeChord(currentChord);
    const success = requestChordChange(relativeChord, TransitionPolicy.PIVOT);

    if (!success) {
      console.log('💥 Pivot transition rejected, staying on current chord');
    }

    // Increase tension
    const newTension = Math.min(1.0, gameState.tension + 0.2);
    setGameState({ ...gameState, tension: newTension });
    synthRef.current.setMood(valence, energy, newTension);

    // Decay tension after 3 seconds
    setTimeout(() => {
      const decayedTension = Math.max(0, gameState.tension - 0.1);
      setGameState({ ...gameState, tension: decayedTension });
      synthRef.current?.setMood(valence, energy, decayedTension);
    }, 3000);
  };

  const simulateBearOff = () => {
    if (!synthRef.current || !isPlaying) return;

    console.log('🏁 Simulated bear-off!');

    // Get bright chord (extended/major 7/9)
    const brightChord = brightenChord(currentChord);

    // Trigger ascending sparkle
    synthRef.current.triggerSparkle();

    // Use SMOOTH policy for gradual brightening
    requestChordChange(brightChord, TransitionPolicy.SMOOTH);

    // Brief mood lift
    synthRef.current.setMood(
      Math.min(1.0, valence + 0.1),
      energy,
      gameState.tension
    );
  };

  const simulateVictory = () => {
    if (!synthRef.current || !isPlaying) return;

    console.log('🏆 Simulated victory sequence!');

    // Triumphant ascending progression: I → IV → V → I
    // Use BRIDGE policy for dramatic, overriding transitions
    const victoryChords = ['Cmaj7', 'Fmaj7', 'Gmaj7', 'Cmaj9'];

    victoryChords.forEach((chord, i) => {
      setTimeout(() => {
        // Use BRIDGE policy - override any distance gating
        requestChordChange(chord, TransitionPolicy.BRIDGE);

        // Trigger sparkles on each chord
        synthRef.current!.triggerSparkle(chord);
        console.log(`🏆 Victory chord ${i + 1}/${victoryChords.length}: ${chord}`);
      }, i * 1200);
    });

    // Increase brightness and energy
    synthRef.current.setMood(1.0, 1.0, 0);
  };

  const simulateDefeat = () => {
    if (!synthRef.current || !isPlaying) return;

    console.log('💔 Simulated defeat sequence!');

    // Descending to minor/darker progressions
    // Use IMMEDIATE policy for abrupt emotional impact
    const defeatChords = ['Am7', 'Fm7', 'Dm7', 'Am'];

    defeatChords.forEach((chord, i) => {
      setTimeout(() => {
        // Use IMMEDIATE policy - abrupt shift acceptable for emotional impact
        requestChordChange(chord, TransitionPolicy.IMMEDIATE);
        console.log(`💔 Defeat chord ${i + 1}/${defeatChords.length}: ${chord}`);
      }, i * 1200);
    });

    // Decrease brightness and energy
    synthRef.current.setMood(-0.5, 0.3, 0.8);
  };

  // Helper function to get tension chord
  const getTensionChord = (chord: string): string => {
    const tensionMap: { [key: string]: string } = {
      'Cmaj7': 'Csus2', 'Cmaj': 'Csus2', 'C': 'Csus2',
      'Fmaj7': 'Fsus4', 'Fmaj': 'Fsus4', 'F': 'Fsus4',
      'Gmaj7': 'Gsus4', 'Gmaj': 'Gsus4', 'G': 'Gsus4',
      'Dmaj7': 'Dsus4', 'Dmaj': 'Dsus4', 'D': 'Dsus4',
      'Amaj7': 'Asus4', 'Amaj': 'Asus4', 'A': 'Asus4',
    };
    return tensionMap[chord] || 'Gsus4';
  };

  // Update layer configs when UI controls change
  useEffect(() => {
    if (!isInitialized) return;
    handleLayerConfigChange('pad', { enabled: padEnabled, volume: padVolume });
  }, [padEnabled, padVolume, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    handleLayerConfigChange('arpeggio', { enabled: arpeggioEnabled, volume: arpeggioVolume });
  }, [arpeggioEnabled, arpeggioVolume, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    handleLayerConfigChange('sparkle', { enabled: sparkleEnabled, volume: sparkleVolume });
  }, [sparkleEnabled, sparkleVolume, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    handleLayerConfigChange('wash', { enabled: washEnabled, volume: washVolume });
  }, [washEnabled, washVolume, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    handleLayerConfigChange('bass', { enabled: bassEnabled, volume: bassVolume });
  }, [bassEnabled, bassVolume, isInitialized]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Ambient Soundscape Testing</h1>
        <p className="text-slate-400">
          Test and tune the 6-layer harmonic ambient system with game-reactive chord progressions
        </p>
      </div>

      {/* Initialization Controls */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">🎛️ Audio System</h2>
        <div className="flex gap-3">
          <button
            onClick={handleInitialize}
            disabled={isInitialized}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium transition"
          >
            {isInitialized ? '✓ Initialized' : 'Initialize Audio'}
          </button>

          <button
            onClick={handleStart}
            disabled={!isInitialized || isPlaying}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium transition"
          >
            ▶️ Start
          </button>

          <button
            onClick={handleStop}
            disabled={!isPlaying}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium transition"
          >
            ⏹️ Stop
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-400">Status:</span>
            <span className={`text-sm font-medium ${isPlaying ? 'text-green-400' : 'text-slate-500'}`}>
              {isPlaying ? '● Playing' : '○ Stopped'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-4">
          {[
            { id: 'controls', label: '🎚️ Controls', desc: 'Real-time parameters' },
            { id: 'chords', label: '🎹 Chords', desc: 'Test chord voicings' },
            { id: 'events', label: '🎮 Events', desc: 'Game event simulation' },
            { id: 'advanced', label: '⚙️ Advanced', desc: 'Effects chain' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-3 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="text-sm font-medium">{tab.label}</div>
              <div className="text-xs text-slate-500">{tab.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'controls' && (
          <div className="space-y-6">
            {/* Tempo Control */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">⏱️ Tempo</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">BPM</label>
                  <span className="text-sm text-slate-400">{tempo}</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={tempo}
                  onChange={(e) => handleTempoChange(Number(e.target.value))}
                  disabled={!isInitialized}
                  className="w-full"
                />
              </div>
            </div>

            {/* Transition Intelligence Toggle (A/B Testing) */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🎯 Transition Intelligence (A/B Testing)</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={transitionIntelligenceEnabled}
                    onChange={(e) => setTransitionIntelligenceEnabled(e.target.checked)}
                    disabled={!isInitialized}
                    className="w-4 h-4"
                  />
                  <label className="text-sm font-medium">
                    Enable Transition Intelligence (Phase 5.0.11.9)
                  </label>
                </div>
                <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3">
                  <div className="text-xs text-blue-400">
                    <strong>A/B Test:</strong> Compare smooth, musically coherent transitions (ON) vs. direct chord changes (OFF)
                  </div>
                </div>

                {/* Metrics Display */}
                <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
                  <div className="text-sm font-bold mb-3 text-slate-300">Transition Metrics</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Total Requests</div>
                      <div className="text-lg font-mono text-blue-400">{metrics.totalRequests}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Accepted</div>
                      <div className="text-lg font-mono text-green-400">{metrics.acceptedTransitions}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Rejected</div>
                      <div className="text-lg font-mono text-red-400">{metrics.rejectedTransitions}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Via Pivot</div>
                      <div className="text-lg font-mono text-purple-400">{metrics.pivotTransitions}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Last Distance</div>
                      <div className="text-lg font-mono text-yellow-400">{metrics.lastDistance.toFixed(3)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Last Policy</div>
                      <div className="text-lg font-mono text-cyan-400 capitalize">{metrics.lastPolicy}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="text-xs text-slate-400">Acceptance Rate</div>
                    <div className="text-lg font-mono text-slate-300">
                      {metrics.totalRequests > 0
                        ? `${((metrics.acceptedTransitions / metrics.totalRequests) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mood Controls */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🎭 Mood Parameters</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Valence (dark ← → bright)</label>
                    <span className="text-sm text-slate-400">{valence.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={valence}
                    onChange={(e) => handleMoodChange(Number(e.target.value), energy, tension)}
                    disabled={!isInitialized}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Energy (calm ← → intense)</label>
                    <span className="text-sm text-slate-400">{energy.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={energy}
                    onChange={(e) => handleMoodChange(valence, Number(e.target.value), tension)}
                    disabled={!isInitialized}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Tension (relaxed ← → tense)</label>
                    <span className="text-sm text-slate-400">{tension.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={tension}
                    onChange={(e) => handleMoodChange(valence, energy, Number(e.target.value))}
                    disabled={!isInitialized}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Layer Controls */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🎹 Synthesis Layers</h3>
              <div className="space-y-6">
                {/* Pad Layer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={padEnabled}
                      onChange={(e) => setPadEnabled(e.target.checked)}
                      disabled={!isInitialized}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium">Pad (6-layer multi-oscillator)</label>
                  </div>
                  <div className="pl-7 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Volume</span>
                      <span className="text-xs text-slate-400">{padVolume}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={padVolume}
                      onChange={(e) => setPadVolume(Number(e.target.value))}
                      disabled={!isInitialized || !padEnabled}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Bass Layer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={bassEnabled}
                      onChange={(e) => setBassEnabled(e.target.checked)}
                      disabled={!isInitialized}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium">Bass (harmonic foundation)</label>
                  </div>
                  <div className="pl-7 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Volume</span>
                      <span className="text-xs text-slate-400">{bassVolume}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bassVolume}
                      onChange={(e) => setBassVolume(Number(e.target.value))}
                      disabled={!isInitialized || !bassEnabled}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Arpeggio Layer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={arpeggioEnabled}
                      onChange={(e) => setArpeggioEnabled(e.target.checked)}
                      disabled={!isInitialized}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium">Arpeggio (melodic patterns)</label>
                  </div>
                  <div className="pl-7 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Volume</span>
                      <span className="text-xs text-slate-400">{arpeggioVolume}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={arpeggioVolume}
                      onChange={(e) => setArpeggioVolume(Number(e.target.value))}
                      disabled={!isInitialized || !arpeggioEnabled}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Sparkle Layer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sparkleEnabled}
                      onChange={(e) => setSparkleEnabled(e.target.checked)}
                      disabled={!isInitialized}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium">Sparkle (high crystalline tones)</label>
                  </div>
                  <div className="pl-7 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Volume</span>
                      <span className="text-xs text-slate-400">{sparkleVolume}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sparkleVolume}
                      onChange={(e) => setSparkleVolume(Number(e.target.value))}
                      disabled={!isInitialized || !sparkleEnabled}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Wash Layer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={washEnabled}
                      onChange={(e) => setWashEnabled(e.target.checked)}
                      disabled={!isInitialized}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium">Wash (ambient texture)</label>
                  </div>
                  <div className="pl-7 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Volume</span>
                      <span className="text-xs text-slate-400">{washVolume}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={washVolume}
                      onChange={(e) => setWashVolume(Number(e.target.value))}
                      disabled={!isInitialized || !washEnabled}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chords' && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🎹 Chord Testing</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Chord</label>
                  <select
                    value={currentChord}
                    onChange={(e) => setCurrentChord(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm"
                  >
                    {chords.map(chord => (
                      <option key={chord} value={chord}>{chord}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePlayChord}
                    disabled={!isPlaying}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition"
                  >
                    🎹 Play Chord
                  </button>

                  <button
                    onClick={handleTriggerArpeggio}
                    disabled={!isPlaying || !arpeggioEnabled}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition"
                  >
                    🎵 Trigger Arpeggio
                  </button>

                  <button
                    onClick={handleTriggerSparkle}
                    disabled={!isPlaying || !sparkleEnabled}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition"
                  >
                    ✨ Trigger Sparkle
                  </button>

                  <button
                    onClick={handleTriggerBass}
                    disabled={!isPlaying || !bassEnabled}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition"
                  >
                    🎸 Trigger Bass
                  </button>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
                  <div className="text-sm">
                    <div><span className="text-slate-400">Current Chord:</span> <span className="font-mono text-blue-400">{currentChord}</span></div>
                    <div><span className="text-slate-400">Voicing:</span> <span className="font-mono text-xs text-slate-500">{CHORD_VOICINGS[currentChord]?.notes.join(', ')}</span></div>
                    <div><span className="text-slate-400">Bass Note:</span> <span className="font-mono text-xs text-slate-500">{CHORD_VOICINGS[currentChord]?.bass}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Chord Progressions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🎼 Quick Progressions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const progression = ['Cmaj7', 'Fmaj7', 'Gmaj7', 'Cmaj7'];
                    let i = 0;
                    const interval = setInterval(() => {
                      setCurrentChord(progression[i]);
                      handlePlayChord();
                      i++;
                      if (i >= progression.length) clearInterval(interval);
                    }, 2000);
                  }}
                  disabled={!isPlaying}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700 disabled:text-slate-500 border border-slate-700 rounded text-sm transition"
                >
                  <div className="font-medium">I-IV-V-I (C Major)</div>
                  <div className="text-xs text-slate-400 mt-1">Classic resolution</div>
                </button>

                <button
                  onClick={() => {
                    const progression = ['Am7', 'Dm7', 'G7', 'Cmaj7'];
                    let i = 0;
                    const interval = setInterval(() => {
                      setCurrentChord(progression[i]);
                      handlePlayChord();
                      i++;
                      if (i >= progression.length) clearInterval(interval);
                    }, 2000);
                  }}
                  disabled={!isPlaying}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700 disabled:text-slate-500 border border-slate-700 rounded text-sm transition"
                >
                  <div className="font-medium">vi-ii-V-I</div>
                  <div className="text-xs text-slate-400 mt-1">Jazz turnaround</div>
                </button>

                <button
                  onClick={() => {
                    const progression = ['Cmaj7', 'Am7', 'Fmaj7', 'Gmaj7'];
                    let i = 0;
                    const interval = setInterval(() => {
                      setCurrentChord(progression[i]);
                      handlePlayChord();
                      i++;
                      if (i >= progression.length) clearInterval(interval);
                    }, 2000);
                  }}
                  disabled={!isPlaying}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700 disabled:text-slate-500 border border-slate-700 rounded text-sm transition"
                >
                  <div className="font-medium">I-vi-IV-V</div>
                  <div className="text-xs text-slate-400 mt-1">Pop progression</div>
                </button>

                <button
                  onClick={() => {
                    const progression = ['Cmaj7', 'Cmin', 'Cmaj7'];
                    let i = 0;
                    const interval = setInterval(() => {
                      setCurrentChord(progression[i]);
                      handlePlayChord();
                      i++;
                      if (i >= progression.length) clearInterval(interval);
                    }, 2000);
                  }}
                  disabled={!isPlaying}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700 disabled:text-slate-500 border border-slate-700 rounded text-sm transition"
                >
                  <div className="font-medium">Major → Minor → Major</div>
                  <div className="text-xs text-slate-400 mt-1">Mood shift test</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Game State Display */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">📊 Simulated Game State</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded p-3">
                  <div className="text-xs text-slate-400 mb-1">Turn Count</div>
                  <div className="text-2xl font-bold text-blue-400">{turnCount}</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded p-3">
                  <div className="text-xs text-slate-400 mb-1">Game Phase</div>
                  <div className="text-2xl font-bold text-purple-400 capitalize">{gameState.phase}</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded p-3">
                  <div className="text-xs text-slate-400 mb-1">Momentum</div>
                  <div className={`text-2xl font-bold ${gameState.momentum > 0 ? 'text-green-400' : gameState.momentum < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {gameState.momentum > 0 ? '+' : ''}{gameState.momentum.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Event Simulation Buttons */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🎮 Game Event Simulation</h3>
              <div className="bg-blue-900/20 border border-blue-700/50 rounded p-4 mb-6">
                <div className="text-sm text-blue-400 space-y-2">
                  <div><strong>Test harmonic reactivity:</strong> These buttons simulate game events with intelligent transition policies.</div>
                  <div className="text-xs space-y-1 mt-2 text-slate-300">
                    <div>• <strong>DEFER:</strong> Low-priority events (dice roll) wait for musical boundaries</div>
                    <div>• <strong>SMOOTH:</strong> Standard transitions (bear-off) use voice-leading optimization</div>
                    <div>• <strong>PIVOT:</strong> Dramatic events (checker hit) insert pivot chords for smooth transitions</div>
                    <div>• <strong>BRIDGE:</strong> Triumphant sequences (victory) override distance gating</div>
                    <div>• <strong>IMMEDIATE:</strong> Emotional impact (defeat) allows abrupt shifts</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={simulateDiceRoll}
                  disabled={!isPlaying}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-500 border border-slate-700 rounded text-sm transition"
                >
                  <div className="font-medium">🎲 Dice Roll</div>
                  <div className="text-xs text-slate-400 mt-1">Sparkle on doubles, DEFER policy</div>
                  <div className="text-xs text-blue-400 mt-1">Policy: DEFER (wait for beat boundary)</div>
                </button>

                <button
                  onClick={simulateTurnStart}
                  disabled={!isPlaying}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-500 border border-slate-700 rounded text-sm transition"
                >
                  <div className="font-medium">🔄 Turn Start</div>
                  <div className="text-xs text-slate-400 mt-1">Update momentum, occasional arpeggio</div>
                  <div className="text-xs text-blue-400 mt-1">Policy: N/A (mood update only)</div>
                </button>

                <button
                  onClick={simulateCheckerHit}
                  disabled={!isPlaying}
                  className="px-4 py-3 bg-red-900/30 hover:bg-red-900/40 disabled:bg-slate-800 disabled:text-slate-500 border border-red-700/50 rounded text-sm transition"
                >
                  <div className="font-medium">💥 Checker Hit</div>
                  <div className="text-xs text-slate-400 mt-1">Pivot to relative minor via suspended chord</div>
                  <div className="text-xs text-orange-400 mt-1">Policy: PIVOT (insert intermediate chord)</div>
                </button>

                <button
                  onClick={simulateBearOff}
                  disabled={!isPlaying}
                  className="px-4 py-3 bg-green-900/30 hover:bg-green-900/40 disabled:bg-slate-800 disabled:text-slate-500 border border-green-700/50 rounded text-sm transition"
                >
                  <div className="font-medium">🏁 Bear Off</div>
                  <div className="text-xs text-slate-400 mt-1">Gradual brightening with voice leading</div>
                  <div className="text-xs text-green-400 mt-1">Policy: SMOOTH (voice-led transition)</div>
                </button>

                <button
                  onClick={simulateVictory}
                  disabled={!isPlaying}
                  className="px-4 py-3 bg-yellow-900/30 hover:bg-yellow-900/40 disabled:bg-slate-800 disabled:text-slate-500 border border-yellow-700/50 rounded text-sm transition"
                >
                  <div className="font-medium">🏆 Victory</div>
                  <div className="text-xs text-slate-400 mt-1">Triumphant I-IV-V-I progression</div>
                  <div className="text-xs text-yellow-400 mt-1">Policy: BRIDGE (override all gating)</div>
                </button>

                <button
                  onClick={simulateDefeat}
                  disabled={!isPlaying}
                  className="px-4 py-3 bg-purple-900/30 hover:bg-purple-900/40 disabled:bg-slate-800 disabled:text-slate-500 border border-purple-700/50 rounded text-sm transition"
                >
                  <div className="font-medium">💔 Defeat</div>
                  <div className="text-xs text-slate-400 mt-1">Abrupt descending minor progression</div>
                  <div className="text-xs text-purple-400 mt-1">Policy: IMMEDIATE (abrupt shift for impact)</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            {/* Effects Chain Architecture */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🎚️ Effects Chain Architecture (Onder-Style)</h3>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-4 mb-4">
                <div className="font-mono text-sm text-slate-300">
                  <div className="mb-2 text-blue-400">Signal Flow:</div>
                  <div className="pl-4 space-y-1 text-xs">
                    <div>1. 6-Layer Pad → <span className="text-yellow-400">Filter (800Hz lowpass)</span></div>
                    <div>2. Filter → <span className="text-green-400">Chorus (0.5Hz, depth 0.3, 180° spread)</span></div>
                    <div>3. Chorus → <span className="text-purple-400">Reverb (12s decay, 0.6 wet)</span></div>
                    <div>4. Reverb → <span className="text-orange-400">Delay (8n, feedback 0.3, 0.15 wet)</span></div>
                    <div>5. Delay → <span className="text-red-400">Compressor (-24dB thresh, 6:1 ratio)</span></div>
                    <div>6. Compressor → <span className="text-pink-400">Limiter (-6dB)</span></div>
                    <div>7. Limiter → <span className="text-cyan-400">Master Gain (-10dB)</span></div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded p-4">
                <div className="text-sm text-blue-400">
                  <strong>Note:</strong> These parameters are currently hardcoded in AmbientSynthesizer.ts based on onder's cathedral-quality settings. Direct runtime control would require extending the API with getter/setter methods for each effect parameter.
                </div>
              </div>
            </div>

            {/* Effects Parameters (Read-Only) */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">📋 Current Effects Parameters</h3>
              <div className="space-y-4">
                {/* Filter */}
                <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-yellow-400 font-bold">🎛️ Filter (Lowpass)</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Frequency</div>
                      <div className="font-mono text-yellow-400">800 Hz</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Type</div>
                      <div className="font-mono text-yellow-400">lowpass</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Rolloff</div>
                      <div className="font-mono text-yellow-400">-24 dB/oct</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Modulated by Energy parameter (400-1600 Hz range)
                  </div>
                </div>

                {/* Chorus */}
                <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-green-400 font-bold">🌊 Chorus</div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Frequency</div>
                      <div className="font-mono text-green-400">0.5 Hz</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Delay Time</div>
                      <div className="font-mono text-green-400">8 ms</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Depth</div>
                      <div className="font-mono text-green-400">0.3</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Spread</div>
                      <div className="font-mono text-green-400">180°</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Onder-style: wider spread + longer delay = lush ensemble
                  </div>
                </div>

                {/* Reverb */}
                <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-purple-400 font-bold">🏛️ Reverb (Cathedral)</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Decay</div>
                      <div className="font-mono text-purple-400">12 seconds</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Wet Mix</div>
                      <div className="font-mono text-purple-400">0.6 (60%)</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Modulated by Tension parameter (6-16s decay, 0.3-0.7 wet)
                  </div>
                </div>

                {/* Delay */}
                <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-orange-400 font-bold">⏱️ Feedback Delay</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Delay Time</div>
                      <div className="font-mono text-orange-400">8n (eighth note)</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Feedback</div>
                      <div className="font-mono text-orange-400">0.3</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Wet Mix</div>
                      <div className="font-mono text-orange-400">0.15 (15%)</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Modulated by Tension parameter (0.1-0.5 feedback)
                  </div>
                </div>

                {/* Compressor */}
                <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-red-400 font-bold">📉 Compressor</div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Threshold</div>
                      <div className="font-mono text-red-400">-24 dB</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Ratio</div>
                      <div className="font-mono text-red-400">6:1</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Attack</div>
                      <div className="font-mono text-red-400">0.001 s</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Release</div>
                      <div className="font-mono text-red-400">0.2 s</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Aggressive compression for smooth, polished output
                  </div>
                </div>

                {/* Limiter & Master */}
                <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-pink-400 font-bold">🔒 Limiter & Master Gain</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Limiter Threshold</div>
                      <div className="font-mono text-pink-400">-6 dB</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Master Gain</div>
                      <div className="font-mono text-cyan-400">-10 dB</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Master gain modulated by Energy parameter (-20 to -5 dB)
                  </div>
                </div>
              </div>
            </div>

            {/* Bass Processing Chain */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">🎸 Bass Processing Chain (Separate)</h3>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
                <div className="font-mono text-sm text-slate-300 space-y-2">
                  <div className="text-orange-400">Bass Synth → Bass Filter → Bass Reverb → Main Compressor</div>
                  <div className="text-xs text-slate-400 mt-2 space-y-1">
                    <div>• Bass Filter: 400Hz lowpass, -12dB/oct</div>
                    <div>• Bass Reverb: 4s decay, 0.4 wet (shorter than pads)</div>
                    <div>• Bass Volume: -30dB (adjustable via layer controls)</div>
                    <div>• Oscillator: Pure sine wave for deep sub foundation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <h4 className="text-sm font-bold mb-2">💡 Testing Tips</h4>
        <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
          <li>Start with just <strong>Pad + Bass</strong> enabled to hear the core harmonic foundation</li>
          <li>Gradually enable <strong>Arpeggio</strong>, <strong>Sparkle</strong>, and <strong>Wash</strong> to test layer balance</li>
          <li>Test mood parameters: <strong>Valence</strong> (brightness), <strong>Energy</strong> (intensity), <strong>Tension</strong> (atmosphere)</li>
          <li>Try chord progressions to test smooth transitions and harmonic movement</li>
          <li>Open browser console (F12) to see detailed logging of audio events</li>
        </ul>
      </div>
    </div>
  );
}
