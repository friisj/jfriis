import * as Tone from 'tone';
import { ColorLayer, LayerAudioNodes, LayerMetrics } from './color-layers';

export class ColorLayerBus {
  private bus: Tone.Gain;
  private chorus: Tone.Chorus;
  private reverb: Tone.Reverb;
  private delay: Tone.PingPongDelay;
  private compressor: Tone.Compressor;
  private analyzer: Tone.Analyser;
  
  // Connected layers
  private connectedLayers: Map<string, LayerAudioNodes> = new Map();
  
  // Master color level (0-100)
  private _masterLevel: number = 70;

  constructor() {
    console.log('🎵 Initializing ColorLayerBus');
    
    // Master bus gain - initialized with master level
    this.bus = new Tone.Gain(this._masterLevel / 100);
    
    // Effects chain
    this.chorus = new Tone.Chorus({
      frequency: 0.5,
      delayTime: 8,
      depth: 0.3,
      spread: 180,
      type: 'sine'
    }).start();

    this.reverb = new Tone.Reverb({
      decay: 8,
      wet: 0.4
    });

    this.delay = new Tone.PingPongDelay({
      delayTime: '8n',
      feedback: 0.3,
      wet: 0.1
    });

    this.compressor = new Tone.Compressor({
      threshold: -18,
      ratio: 2,
      attack: 0.1,
      release: 0.5
    });

    // Analyzer for visual feedback
    this.analyzer = new Tone.Analyser('waveform', 1024);
    
    // Chain: Bus -> Chorus -> Delay -> Reverb -> Compressor -> Analyzer -> Output
    this.bus.chain(
      this.chorus,
      this.delay, 
      this.reverb,
      this.compressor,
      this.analyzer
    );
    
    this.compressor.toDestination();
    
    console.log('🎵 ColorLayerBus initialized with effects chain');
  }

  get masterLevel(): number {
    return this._masterLevel;
  }

  set masterLevel(level: number) {
    const oldLevel = this._masterLevel;
    this._masterLevel = Math.max(0, Math.min(100, level));
    const newGain = this._masterLevel / 100;
    
    // Use smooth ramping for audible changes
    this.bus.gain.rampTo(newGain, 0.1);
    
    console.log(`🎵 ColorLayerBus master level: ${oldLevel}% → ${this._masterLevel}% (gain: ${newGain.toFixed(2)})`);
  }

  // Connect a layer to the bus with individual processing
  connectLayer(layerId: string, synth: Tone.Synth | Tone.PolySynth | Tone.Noise, layer: ColorLayer): LayerAudioNodes {
    console.log(`🎵 Connecting layer: ${layerId}`);
    console.log(`🔍 Layer details:`, {
      id: layerId,
      volume: layer.volume,
      enabled: layer.enabled,
      chorus: layer.sendLevels.chorus,
      reverb: layer.sendLevels.reverb
    });
    
    // Create layer's gain node
    const gainValue = this.volumeToGain(layer.volume);
    const gainNode = new Tone.Gain(gainValue);
    console.log(`🎵 Created gain node with value: ${gainValue.toFixed(4)}`);
    
    // Connect synth to gain node
    synth.connect(gainNode);
    
    // Connect gain node to main bus
    gainNode.connect(this.bus);
    console.log(`🎵 Connected ${layerId}: synth -> gainNode -> bus`);
    
    // Create auxiliary send nodes for individual effect control
    const chorusSend = new Tone.Gain(layer.sendLevels.chorus / 100);
    const reverbSend = new Tone.Gain(layer.sendLevels.reverb / 100);
    
    // Connect sends
    gainNode.connect(chorusSend);
    gainNode.connect(reverbSend);
    
    // Connect sends to their respective effects
    chorusSend.connect(this.chorus);
    reverbSend.connect(this.reverb);
    
    const audioNodes: LayerAudioNodes = {
      synth,
      gainNode,
      chorusSend,
      reverbSend
    };
    
    this.connectedLayers.set(layerId, audioNodes);
    
    console.log(`🎵 Layer ${layerId} connected with volume: ${layer.volume}%, chorus: ${layer.sendLevels.chorus}%, reverb: ${layer.sendLevels.reverb}%`);
    console.log(`🔍 Total connected layers: ${this.connectedLayers.size}`);
    console.log(`🔍 Bus master level: ${this._masterLevel}% (gain: ${this.bus.gain.value})`);
    
    return audioNodes;
  }

  // Get layer audio nodes (for inserting effects)
  getLayerNodes(layerId: string): LayerAudioNodes | undefined {
    return this.connectedLayers.get(layerId);
  }

  // Disconnect a layer from the bus
  disconnectLayer(layerId: string): void {
    const audioNodes = this.connectedLayers.get(layerId);
    if (!audioNodes) return;

    console.log(`🎵 Disconnecting layer: ${layerId}`);

    // Dispose of all nodes
    audioNodes.gainNode.dispose();
    audioNodes.chorusSend?.dispose();
    audioNodes.reverbSend?.dispose();
    audioNodes.delaySend?.dispose();

    this.connectedLayers.delete(layerId);
  }

  // Update layer parameters
  updateLayerVolume(layerId: string, volume: number): void {
    const audioNodes = this.connectedLayers.get(layerId);
    if (!audioNodes) return;
    
    audioNodes.gainNode.gain.value = this.volumeToGain(volume);
    console.log(`🎵 Updated ${layerId} volume: ${volume}% (${this.volumeToGain(volume).toFixed(2)} gain)`);
  }

  updateLayerSends(layerId: string, sendLevels: ColorLayer['sendLevels']): void {
    const audioNodes = this.connectedLayers.get(layerId);
    if (!audioNodes) return;
    
    if (audioNodes.chorusSend) {
      audioNodes.chorusSend.gain.value = sendLevels.chorus / 100;
    }
    if (audioNodes.reverbSend) {
      audioNodes.reverbSend.gain.value = sendLevels.reverb / 100;
    }
    
    console.log(`🎵 Updated ${layerId} sends - chorus: ${sendLevels.chorus}%, reverb: ${sendLevels.reverb}%`);
  }

  // Get layer metrics for visual feedback
  getLayerMetrics(layerId: string): LayerMetrics | null {
    const audioNodes = this.connectedLayers.get(layerId);
    if (!audioNodes) return null;
    
    // Get current gain value and convert to dB
    const gainValue = audioNodes.gainNode.gain.value;
    const dbLevel = gainValue > 0 ? 20 * Math.log10(gainValue) : -60;
    
    // Calculate activity based on recent gain changes (simplified)
    const activity = Math.min(100, Math.max(0, (gainValue + 0.1) * 500));
    
    // Harmonic content estimation (simplified)
    const harmonicContent = Math.random() * 100; // TODO: Replace with actual harmonic analysis
    
    return {
      rmsLevel: dbLevel,
      peakLevel: dbLevel + 3, // Simplified peak calculation
      activity,
      harmonicContent
    };
  }

  // Get overall bus metrics
  getBusMetrics(): { level: number; waveform: Float32Array } {
    const waveform = this.analyzer.getValue() as Float32Array;
    
    // Calculate RMS level from waveform
    let sum = 0;
    for (let i = 0; i < waveform.length; i++) {
      sum += waveform[i] * waveform[i];
    }
    const rms = Math.sqrt(sum / waveform.length);
    const level = rms > 0 ? 20 * Math.log10(rms) : -60;
    
    return { level, waveform };
  }

  // Debug function to check connected layers and bus state
  debugBusState(): void {
    console.log('🔍 ColorLayerBus Debug State:');
    console.log(`  Master Level: ${this._masterLevel}% (gain: ${this.bus.gain.value.toFixed(3)})`);
    console.log(`  Connected Layers: ${this.connectedLayers.size}`);
    
    this.connectedLayers.forEach((nodes, layerId) => {
      const layerGain = nodes.gainNode.gain.value;
      const layerDb = layerGain > 0 ? 20 * Math.log10(layerGain) : -60;
      console.log(`    ${layerId}: ${layerDb.toFixed(1)}dB (gain: ${layerGain.toFixed(3)})`);
    });
  }

  // Update global effects based on main drone parameters
  updateEffectsFromDrone(intensity: number, atmosphere: number): void {
    // Intensity affects chorus depth and delay feedback
    this.chorus.depth = 0.2 + (intensity / 100) * 0.3;
    this.delay.feedback.value = 0.1 + (intensity / 100) * 0.3;
    
    // Atmosphere affects reverb parameters
    this.reverb.decay = 6 + (atmosphere / 100) * 8;
    this.reverb.wet.value = 0.4 + (atmosphere / 100) * 0.4;
    
    console.log(`🎵 Updated effects - intensity: ${intensity}%, atmosphere: ${atmosphere}%`);
  }

  // Utility function to convert 0-100 volume to gain
  private volumeToGain(volume: number): number {
    // 0-100 maps to -60dB to -10dB, then convert to linear gain
    const db = -60 + (volume / 100) * 50;
    const gain = db <= -60 ? 0 : Math.pow(10, db / 20);
    
    // Debug log for volume conversion
    console.log(`🎵 Volume ${volume}% → ${db.toFixed(1)}dB → gain: ${gain.toFixed(4)}`);
    
    return gain;
  }

  // Clean up all resources
  dispose(): void {
    console.log('🎵 Disposing ColorLayerBus');
    
    // Disconnect all layers
    this.connectedLayers.forEach((_, layerId) => {
      this.disconnectLayer(layerId);
    });
    
    // Dispose of effects
    this.bus.dispose();
    this.chorus.dispose();
    this.reverb.dispose();
    this.delay.dispose();
    this.compressor.dispose();
    this.analyzer.dispose();
  }
}