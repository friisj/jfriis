import * as Tone from 'tone';

// Core interfaces for the new color layer system
export interface ColorLayer {
  id: string;
  name: string;
  enabled: boolean;
  volume: number;        // 0-100 (maps to -60dB to -10dB)
  density: number;       // 0-100 (activity/timing)
  character: number;     // 0-100 (layer-specific parameter)
  sendLevels: {
    chorus: number;      // 0-100
    reverb: number;      // 0-100
    delay?: number;      // Optional delay send
  };
  harmonicMode: 'follow' | 'independent' | 'complement';
  rhythmSync: boolean;
  characterLabel: string; // UI label for the character parameter
  // Wash-specific stereo panning controls
  panSpeed?: number;     // 0-100 (wash layer only: stereo movement speed)
  panDepth?: number;     // 0-100 (wash layer only: pan modulation depth, default 90%)
}

// Audio nodes for each layer
export interface LayerAudioNodes {
  synth: Tone.Synth | Tone.PolySynth | Tone.Noise;
  gainNode: Tone.Gain;
  chorusSend?: Tone.Gain;
  reverbSend?: Tone.Gain;
  delaySend?: Tone.Gain;
}

// Layer metrics for visual feedback
export interface LayerMetrics {
  rmsLevel: number;        // Current RMS level in dB
  peakLevel: number;       // Peak level in dB  
  activity: number;        // 0-100 activity percentage
  harmonicContent: number; // Harmonic richness measure
}

// Modulation matrix for connecting main drone to color layers
export interface ModulationTarget {
  target: 'volume' | 'density' | 'character' | 'sendLevels.reverb' | 'sendLevels.chorus';
  amount: number;    // -100 to +100
  layerId: string;
}

export interface ModulationMatrix {
  intensity: ModulationTarget[];
  atmosphere: ModulationTarget[];
}

// Parameter mapping functions for each layer type
export type ParameterMapper = {
  volume: (val: number) => number;
  density: (val: number) => any;
  character: (val: number) => any;
};

// Layer definitions with default settings
export const layerDefinitions: Record<string, Omit<ColorLayer, 'enabled' | 'volume' | 'density' | 'character'>> = {
  arpeggiator: {
    id: 'arpeggiator',
    name: 'Crystalline Arpeggios',
    characterLabel: 'Pattern Complexity',
    sendLevels: { chorus: 20, reverb: 80 },
    harmonicMode: 'complement',
    rhythmSync: true
  },
  strings: {
    id: 'strings',
    name: 'ARP Solina Strings',
    characterLabel: 'Phaser Depth',
    sendLevels: { chorus: 60, reverb: 70 },
    harmonicMode: 'follow',
    rhythmSync: false
  },
  sparkle: {
    id: 'sparkle',
    name: 'Crystal Sparkles',
    characterLabel: 'Brightness Range',
    sendLevels: { chorus: 10, reverb: 90 },
    harmonicMode: 'complement',
    rhythmSync: true
  },
  whistle: {
    id: 'whistle',
    name: 'Celtic Whistle',
    characterLabel: 'Phrase Ornament',
    sendLevels: { chorus: 40, reverb: 85 },
    harmonicMode: 'complement',
    rhythmSync: true
  },
  wash: {
    id: 'wash',
    name: 'Ambient Wash',
    characterLabel: 'Texture Filter',
    sendLevels: { chorus: 0, reverb: 95 },
    harmonicMode: 'complement',
    rhythmSync: true
  }
};

// Parameter mapping functions for each layer type
export const layerParameterMaps: Record<string, ParameterMapper> = {
  arpeggiator: {
    volume: (val) => -60 + (val/100) * 50,    // dB mapping
    density: (val) => 200 + (val/100) * 600,  // 200-800ms intervals  
    character: (val) => {                     // Pattern complexity
      if (val < 33) return 'ascending';
      if (val < 66) return 'descending'; 
      return 'cascade';
    }
  },
  strings: {
    volume: (val) => -60 + (val/100) * 50,
    density: (val) => val / 100,              // Attack time multiplier
    character: (val) => ({                    // Voicing spread
      detune: val * 0.1,                      // 0-10 cents
      spread: Math.floor(val/25) + 3          // 3-7 note voicings
    })
  },
  sparkle: {
    volume: (val) => -60 + (val/100) * 50,
    density: (val) => 500 + (val/100) * 2500, // 500-3000ms intervals
    character: (val) => ({                     // Frequency range
      minFreq: 1000 + (val/100) * 2000,       // 1000-3000Hz
      maxFreq: 3000 + (val/100) * 3000        // 3000-6000Hz
    })
  },
  whistle: {
    volume: (val) => -60 + (val/100) * 50,
    density: (val) => 2000 + (val/100) * 6000, // 2000-8000ms intervals
    character: (val) => {                       // Phrase complexity
      if (val < 25) return 'simple';
      if (val < 50) return 'ornament';
      if (val < 75) return 'cascade';
      return 'complex';
    }
  },
  wash: {
    volume: (val) => -60 + (val/100) * 50,
    density: (val) => val / 100,               // Filter cutoff multiplier
    character: (val) => ({                     // Texture characteristics
      cutoff: 200 + (val/100) * 800,          // 200-1000Hz filter
      resonance: val / 100 * 5                // 0-5 resonance
    })
  }
};

// Default modulation matrix
export const defaultModulationMatrix: ModulationMatrix = {
  intensity: [
    { target: 'density', amount: 30, layerId: 'sparkle' },
    { target: 'character', amount: 25, layerId: 'arpeggiator' },
    { target: 'volume', amount: 15, layerId: 'strings' }
  ],
  atmosphere: [
    { target: 'sendLevels.reverb', amount: 40, layerId: 'whistle' },
    { target: 'sendLevels.chorus', amount: 25, layerId: 'strings' },
    { target: 'character', amount: -20, layerId: 'wash' }
  ]
};