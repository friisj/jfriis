'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, Zap } from 'lucide-react';

interface FlowEngineProps {
  isPlaying: boolean;
  currentChord: string;
  onChordChange: (chord: string) => void;
  onLayerToggle: (layerId: string) => void;
  availableChords: string[];
  onFlowStateChange?: (state: { upcomingLayers: string[]; decayingLayers: string[] }) => void;
  getCurrentLayerStates?: () => Array<{id: string, enabled: boolean}>;
}

interface FlowState {
  harmonicDrift: boolean;
  layerEvolution: boolean;
  driftProbability: number;
  evolutionProbability: number;
  chaosFactor: number;
  pace: 'slow' | 'medium' | 'fast';
  sessionMemory: string[];
  currentFlow: string;
  upcomingLayers: string[];
  decayingLayers: string[];
}

const CHORD_RELATIONSHIPS = {
  // Major chords - using actual chord names from chordDefinitions
  'Cmaj': ['Fmaj', 'Gmaj', 'Amin', 'Dmin'],
  'Fmaj': ['Cmaj', 'Bmaj', 'Dmin', 'Amin'],
  'Gmaj': ['Cmaj', 'Em', 'Amin', 'Dmaj'],
  'Dmaj': ['Gmaj', 'Amaj', 'Bmin', 'Em'],
  'Amaj': ['Dmaj', 'Emaj', 'F#min', 'Bmin'],
  'Emaj': ['Amaj', 'Bmaj', 'C#min', 'F#min'],
  'Bmaj': ['Emaj', 'F#min', 'C#min', 'Gmaj'],

  // Minor chords - using actual chord names from chordDefinitions
  'Amin': ['Cmaj', 'Fmaj', 'Dmin', 'Em'],
  'Dmin': ['Fmaj', 'Bmaj', 'Amin', 'Cmaj'],
  'Em': ['Gmaj', 'Cmaj', 'Amin', 'Dmaj'],
  'Bmin': ['Dmaj', 'Gmaj', 'Em', 'Amaj'],
  'F#min': ['Amaj', 'Emaj', 'Bmin', 'C#min'],
  'C#min': ['Emaj', 'Bmaj', 'F#min', 'Amin'],

  // Extended chords - using actual chord names from chordDefinitions
  'Cmaj7': ['Fmaj7', 'Am7', 'Dm7', 'Gmaj'],
  'Fmaj7': ['Cmaj7', 'Dm7', 'Am7', 'Bmaj'],
  'Am7': ['Cmaj7', 'Fmaj7', 'Dm7', 'Em'],
  'Dm7': ['Fmaj7', 'Cmaj7', 'Am7', 'Gmaj'],

  // Suspended chords - using actual chord names from chordDefinitions
  'Csus2': ['Fsus4', 'Gsus4', 'Amin', 'Dmin'],
  'Fsus4': ['Csus2', 'Bmaj', 'Dmin', 'Amin'],
  'Gsus4': ['Csus2', 'Em', 'Amin', 'Dmaj']
};

const PACE_INTERVALS = {
  slow: { min: 30000, max: 60000 }, // 30s-1min for testing
  medium: { min: 15000, max: 30000 }, // 15-30s for testing
  fast: { min: 5000, max: 15000 } // 5-15s for testing
};

const COLOR_LAYERS = [
  'arpeggiator', 'strings', 'sparkle', 'whistle', 'wash'
];

export function FlowEngine({
  isPlaying,
  currentChord,
  onChordChange,
  onLayerToggle,
  availableChords,
  onFlowStateChange,
  getCurrentLayerStates
}: FlowEngineProps) {
  const driftIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const evolutionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [flowState, setFlowState] = useState<FlowState>({
    harmonicDrift: false,
    layerEvolution: false,
    driftProbability: 30,
    evolutionProbability: 15,
    chaosFactor: 5,
    pace: 'slow',
    sessionMemory: [],
    currentFlow: 'Ready to explore harmonic territories...',
    upcomingLayers: [],
    decayingLayers: []
  });

  // Get related chords based on music theory relationships
  const getRelatedChords = useCallback((chord: string): string[] => {
    const relationships = CHORD_RELATIONSHIPS[chord as keyof typeof CHORD_RELATIONSHIPS] || [];
    // Filter to only include chords that exist in our available set
    return relationships.filter(relatedChord => availableChords.includes(relatedChord));
  }, [availableChords]);

  // Add chord to session memory (simple pattern learning)
  const addToMemory = useCallback((chord: string) => {
    setFlowState(prev => {
      const newMemory = [...prev.sessionMemory, chord];
      // Keep only last 20 chords to prevent memory overflow
      if (newMemory.length > 20) {
        newMemory.shift();
      }
      return { ...prev, sessionMemory: newMemory };
    });
  }, []);

  // Get memory-biased related chords (prefer recently used progressions)
  const getMemoryBiasedChords = useCallback((chord: string, sessionMemory: string[]): string[] => {
    const relatedChords = getRelatedChords(chord);

    if (sessionMemory.length === 0) return relatedChords;

    // Weight chords that appear in recent memory more heavily
    const weightedChords: string[] = [];
    relatedChords.forEach(relatedChord => {
      const memoryCount = sessionMemory.filter(c => c === relatedChord).length;
      // Add chord multiple times based on how often it appears in memory
      for (let i = 0; i <= memoryCount; i++) {
        weightedChords.push(relatedChord);
      }
    });

    return weightedChords.length > 0 ? weightedChords : relatedChords;
  }, [getRelatedChords]); // Removed flowState dependency

  // Generate random interval based on pace with chaos factor
  const getRandomInterval = useCallback(() => {
    const baseInterval = PACE_INTERVALS[flowState.pace];
    const range = baseInterval.max - baseInterval.min;
    const chaosVariation = (range * flowState.chaosFactor / 100) * (Math.random() - 0.5);

    return baseInterval.min + (Math.random() * range) + chaosVariation;
  }, [flowState.pace, flowState.chaosFactor]);

  // Update flow description (removed circular dependency)
  const updateFlowDescription = useCallback((action: string, chord?: string, force = false) => {
    const descriptions = [
      `Gently ${action} around ${chord || currentChord}...`,
      `Exploring harmonic territories near ${chord || currentChord}...`,
      `Drifting through ${chord || currentChord} with subtle variations...`,
      `Organic evolution around ${chord || currentChord}...`,
      `Finding new paths from ${chord || currentChord}...`
    ];

    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    setFlowState(prev => ({ ...prev, currentFlow: description }));
  }, [currentChord]); // Removed flowState.currentFlow dependency

  // Main harmonic drift effect
  useEffect(() => {
    console.log(`🌊 Flow Engine useEffect: isPlaying=${isPlaying}, drift=${flowState.harmonicDrift}, currentChord=${currentChord}`);

    // Clear existing interval
    if (driftIntervalRef.current) {
      console.log(`🌊 Flow Engine: Clearing existing drift interval`);
      clearInterval(driftIntervalRef.current);
      driftIntervalRef.current = null;
    }

    if (!isPlaying || !flowState.harmonicDrift) {
      setFlowState(prev => ({ ...prev, currentFlow: 'Flow paused - ready when you are...' }));
      return;
    }

    setFlowState(prev => ({ ...prev, currentFlow: 'Drift active - listening for chord changes...' }));

    const intervalTime = getRandomInterval();
    console.log(`🌊 Flow Engine: Setting up NEW drift interval for ${intervalTime}ms`);

    const executeDrift = () => {
      console.log(`🌊 Flow Engine: *** EXECUTE DRIFT CALLED ***`);

      const randomCheck = Math.random() * 100;
      console.log(`🌊 Flow Engine: Random roll: ${randomCheck.toFixed(1)} vs ${flowState.driftProbability}%`);

      if (randomCheck < flowState.driftProbability) {
        console.log(`🌊 Flow Engine: DRIFT TRIGGERED! Starting chord analysis...`);

        const directRelated = getRelatedChords(currentChord);
        console.log(`🌊 Flow Engine: Direct related chords for ${currentChord}:`, directRelated);

        const relatedChords = getMemoryBiasedChords(currentChord, flowState.sessionMemory);
        console.log(`🌊 Flow Engine: Memory-biased chords for ${currentChord}:`, relatedChords);

        if (relatedChords.length > 0) {
          const newChord = relatedChords[Math.floor(Math.random() * relatedChords.length)];
          console.log(`🌊 Flow Engine: DRIFTING from ${currentChord} → ${newChord}`);

          onChordChange(newChord);
          addToMemory(newChord);
          setFlowState(prev => ({ ...prev, currentFlow: `Drifted → ${newChord}` }));
        } else {
          console.log(`🌊 Flow Engine: No related chords found, trying random chord`);
          const otherChords = availableChords.filter(chord => chord !== currentChord);
          if (otherChords.length > 0) {
            const randomChord = otherChords[Math.floor(Math.random() * otherChords.length)];
            console.log(`🌊 Flow Engine: FALLBACK DRIFT from ${currentChord} → ${randomChord}`);
            onChordChange(randomChord);
            addToMemory(randomChord);
            setFlowState(prev => ({ ...prev, currentFlow: `Fallback drift → ${randomChord}` }));
          }
        }
      } else {
        console.log(`🌊 Flow Engine: No drift this time (${randomCheck.toFixed(1)} >= ${flowState.driftProbability})`);
      }
    };

    driftIntervalRef.current = setInterval(executeDrift, intervalTime);

    return () => {
      if (driftIntervalRef.current) {
        console.log(`🌊 Flow Engine: Cleaning up drift interval`);
        clearInterval(driftIntervalRef.current);
        driftIntervalRef.current = null;
      }
    };
  }, [
    isPlaying,
    flowState.harmonicDrift
  ]);

  // Layer evolution effect
  useEffect(() => {
    console.log(`🎨 Layer Evolution useEffect: isPlaying=${isPlaying}, evolution=${flowState.layerEvolution}`);

    if (!isPlaying || !flowState.layerEvolution) return;

    const intervalTime = getRandomInterval() * 0.5;
    console.log(`🎨 Layer Evolution: Setting up interval for ${intervalTime}ms`);

    const executeEvolution = () => {
      setFlowState(currentFlowState => {
        const randomCheck = Math.random() * 100;
        console.log(`🎨 Layer Evolution: Check triggered. Roll: ${randomCheck.toFixed(1)} vs ${currentFlowState.evolutionProbability}%`);

        if (randomCheck < currentFlowState.evolutionProbability) {
          const randomLayer = COLOR_LAYERS[Math.floor(Math.random() * COLOR_LAYERS.length)];
          console.log(`🎨 Flow Engine: ================= LAYER EVOLUTION TRIGGERED =================`);
          console.log(`🎨 Flow Engine: Selected random layer: ${randomLayer}`);
          console.log(`🎨 Flow Engine: Available layers: ${COLOR_LAYERS.join(', ')}`);

          if (getCurrentLayerStates) {
            const currentStates = getCurrentLayerStates();
            console.log(`🎨 Flow Engine: Current layer states:`, currentStates.map(l => `${l.id}=${l.enabled}`).join(', '));
          }

          console.log(`🎨 Flow Engine: Evolution will execute in 1 second...`);

          // Wait a bit then actually toggle the layer
          setTimeout(() => {
            console.log(`🎨 Flow Engine: =================== LAYER TOGGLE EXECUTING ===================`);
            console.log(`🎨 Flow Engine: Target layer: ${randomLayer}`);
            console.log(`🎨 Flow Engine: Calling onLayerToggle(${randomLayer})`);
            onLayerToggle(randomLayer);
            console.log(`🎨 Flow Engine: onLayerToggle call completed for ${randomLayer}`);
            console.log(`🎨 Flow Engine: ================================================================`);

            // Move to decaying list
            setFlowState(prev => {
              const newState = {
                ...prev,
                upcomingLayers: prev.upcomingLayers.filter(l => l !== randomLayer),
                decayingLayers: [...prev.decayingLayers.filter(l => l !== randomLayer), randomLayer].slice(-2)
              };

              // Report state change
              onFlowStateChange?.({
                upcomingLayers: newState.upcomingLayers,
                decayingLayers: newState.decayingLayers
              });

              return newState;
            });
          }, 1000);

          // Clear from decaying after delay
          setTimeout(() => {
            setFlowState(prev => {
              const newState = {
                ...prev,
                decayingLayers: prev.decayingLayers.filter(l => l !== randomLayer)
              };

              // Report state change
              onFlowStateChange?.({
                upcomingLayers: newState.upcomingLayers,
                decayingLayers: newState.decayingLayers
              });

              return newState;
            });
          }, 5000);

          // Add to upcoming list for visual feedback
          const newState = {
            ...currentFlowState,
            upcomingLayers: [...currentFlowState.upcomingLayers.filter(l => l !== randomLayer), randomLayer].slice(-2),
            currentFlow: `Layer evolving: ${randomLayer}`
          };

          // Report state change
          onFlowStateChange?.({
            upcomingLayers: newState.upcomingLayers,
            decayingLayers: newState.decayingLayers
          });

          return newState;
        } else {
          console.log(`🎨 Layer Evolution: No evolution this time (${randomCheck.toFixed(1)} >= ${currentFlowState.evolutionProbability})`);
        }

        return currentFlowState; // Return unchanged if no evolution
      });
    };

    const interval = setInterval(executeEvolution, intervalTime);
    return () => {
      console.log(`🎨 Layer Evolution: Cleaning up interval`);
      clearInterval(interval);
    };
  }, [
    isPlaying,
    flowState.layerEvolution,
    onLayerToggle
  ]);

  // Clear session memory
  const clearMemory = useCallback(() => {
    setFlowState(prev => ({
      ...prev,
      sessionMemory: [],
      currentFlow: 'Memory cleared - exploring with fresh perspective...'
    }));
    console.log('🧠 Flow Engine: Session memory cleared');
  }, []);

  // Nudge functions (temporary boost)
  const nudgeHarmonicDrift = useCallback(() => {
    console.log('⚡ NUDGE BUTTON CLICKED!');
    console.log(`⚡ isPlaying: ${isPlaying}, currentChord: ${currentChord}`);

    if (!isPlaying) {
      console.log('⚡ Flow Engine: Cannot nudge - not playing');
      return;
    }

    console.log('⚡ Flow Engine: Harmonic drift nudged');
    const relatedChords = getMemoryBiasedChords(currentChord, flowState.sessionMemory);
    console.log('⚡ Related chords:', relatedChords);

    if (relatedChords.length > 0) {
      const newChord = relatedChords[Math.floor(Math.random() * relatedChords.length)];
      console.log(`⚡ NUDGING: ${currentChord} → ${newChord}`);
      onChordChange(newChord);
      addToMemory(newChord);
      setFlowState(prev => ({ ...prev, currentFlow: `Nudged → ${newChord}` }));
    } else {
      console.log('⚡ No related chords found, trying random chord for nudge');
      // Fallback: pick any available chord except current one
      const otherChords = availableChords.filter(chord => chord !== currentChord);
      if (otherChords.length > 0) {
        const randomChord = otherChords[Math.floor(Math.random() * otherChords.length)];
        console.log(`⚡ FALLBACK NUDGE: ${currentChord} → ${randomChord}`);
        onChordChange(randomChord);
        addToMemory(randomChord);
        setFlowState(prev => ({ ...prev, currentFlow: `Fallback nudge → ${randomChord}` }));
      } else {
        console.log('⚡ No other chords available for nudge');
      }
    }
  }, [isPlaying, currentChord, flowState.sessionMemory, getMemoryBiasedChords, onChordChange, addToMemory]);

  return (
    <Card className="bg-black/40 backdrop-blur-lg border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          🌊 Flow Engine
        </CardTitle>
        <p className="text-cyan-200 text-sm">
          Gentle evolution of chords and layers over time
        </p>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Main Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Drift Toggle */}
          <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
            <div>
              <div className="text-cyan-200 font-medium">Drift</div>
              <div className="text-xs text-gray-400">Harmonic wandering</div>
            </div>
            <Switch
              checked={flowState.harmonicDrift}
              onCheckedChange={(checked) =>
                setFlowState(prev => ({ ...prev, harmonicDrift: checked }))
              }
            />
          </div>

          {/* Pace Selector */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-cyan-200 font-medium mb-2">Pace</div>
            <div className="grid grid-cols-3 gap-1">
              {(['slow', 'medium', 'fast'] as const).map((pace) => (
                <Button
                  key={pace}
                  size="sm"
                  variant={flowState.pace === pace ? "default" : "outline"}
                  className={`text-xs ${
                    flowState.pace === pace
                      ? 'bg-cyan-600 hover:bg-cyan-700'
                      : 'bg-white/5 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20'
                  }`}
                  onClick={() => setFlowState(prev => ({ ...prev, pace }))}
                >
                  {pace}
                </Button>
              ))}
            </div>
          </div>

          {/* Memory Control */}
          <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
            <div>
              <div className="text-cyan-200 font-medium">Memory</div>
              <div className="text-xs text-gray-400">{flowState.sessionMemory.length} patterns</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="bg-white/5 border-red-500/30 text-red-200 hover:bg-red-500/20"
              onClick={clearMemory}
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>

        </div>

        {/* Probability Sliders */}
        <div className="space-y-4">

          {/* Harmonic Drift */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-cyan-200 font-medium">Harmonic Drift</label>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-sm w-10">{flowState.driftProbability}%</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/5 border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/20 px-2"
                  onClick={nudgeHarmonicDrift}
                  disabled={!isPlaying}
                >
                  <Zap className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Slider
              value={[flowState.driftProbability]}
              onValueChange={([value]) =>
                setFlowState(prev => ({ ...prev, driftProbability: value }))
              }
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Layer Evolution */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-cyan-200 font-medium">Layer Evolution</label>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-sm w-10">{flowState.evolutionProbability}%</span>
                <Switch
                  checked={flowState.layerEvolution}
                  onCheckedChange={(checked) =>
                    setFlowState(prev => ({ ...prev, layerEvolution: checked }))
                  }
                  disabled={!isPlaying}
                />
              </div>
            </div>
            <Slider
              value={[flowState.evolutionProbability]}
              onValueChange={([value]) =>
                setFlowState(prev => ({ ...prev, evolutionProbability: value }))
              }
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Chaos Factor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-cyan-200 font-medium">Chaos Factor</label>
              <span className="text-cyan-400 text-sm w-10">{flowState.chaosFactor}%</span>
            </div>
            <Slider
              value={[flowState.chaosFactor]}
              onValueChange={([value]) =>
                setFlowState(prev => ({ ...prev, chaosFactor: value }))
              }
              max={20}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">Adds timing randomness to prevent mechanical feel</div>
          </div>

        </div>

        {/* Layer Activity */}
        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-2">Color Layer Activity</div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-yellow-300 mb-1">📈 Upcoming</div>
              <div className="space-y-1">
                {flowState.upcomingLayers.length > 0 ?
                  flowState.upcomingLayers.map(layer => (
                    <div key={layer} className="text-yellow-200 bg-yellow-500/10 px-2 py-1 rounded">
                      {layer}
                    </div>
                  )) :
                  <div className="text-gray-500">None</div>
                }
              </div>
            </div>

            <div>
              <div className="text-blue-300 mb-1">📉 Recently Changed</div>
              <div className="space-y-1">
                {flowState.decayingLayers.length > 0 ?
                  flowState.decayingLayers.map(layer => (
                    <div key={layer} className="text-blue-200 bg-blue-500/10 px-2 py-1 rounded">
                      {layer}
                    </div>
                  )) :
                  <div className="text-gray-500">None</div>
                }
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400">
              {flowState.harmonicDrift && isPlaying
                ? `Drift active - listening for chord changes...`
                : `Drift paused - enable above to start evolution`
              }
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
