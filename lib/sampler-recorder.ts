/**
 * TabRecorder — lossless PCM capture from a browser tab via getDisplayMedia.
 *
 * Bypasses MediaRecorder entirely. Instead, pipes the tab's audio stream
 * through a Web Audio ScriptProcessorNode to collect raw Float32 samples,
 * then encodes them as a WAV blob on stop.
 *
 * State machine: idle → requesting → recording → stopped
 */

import { encodeInterleavedWav } from './sampler-wav';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped';

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
}

export class TabRecorder {
  static isSupported(): boolean {
    return typeof navigator !== 'undefined'
      && !!navigator.mediaDevices?.getDisplayMedia;
  }

  private _state: RecorderState = 'idle';
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private channelCount = 2;
  private sampleRate = 48000;
  private startTime = 0;

  onStateChange?: (state: RecorderState) => void;

  get state(): RecorderState {
    return this._state;
  }

  private setState(state: RecorderState) {
    this._state = state;
    this.onStateChange?.(state);
  }

  /**
   * Prompt the user to pick a tab and start recording its audio.
   * Captures raw PCM — no lossy encoding.
   */
  async startRecording(): Promise<void> {
    if (this._state !== 'idle') return;
    this.setState('requesting');

    try {
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as MediaTrackConstraints,
        video: true, // required by spec; we stop video tracks immediately
      });

      if (this.mediaStream.getAudioTracks().length === 0) {
        this.cleanup();
        throw new Error('No audio track — make sure "Share tab audio" is checked.');
      }

      // Stop video tracks we don't need
      for (const track of this.mediaStream.getVideoTracks()) {
        track.stop();
      }

      // Set up Web Audio pipeline for raw PCM capture
      this.audioCtx = new AudioContext();
      this.sampleRate = this.audioCtx.sampleRate;
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.channelCount = this.sourceNode.channelCount || 2;

      // ScriptProcessorNode for sample-by-sample capture
      const bufferSize = 4096;
      this.processorNode = this.audioCtx.createScriptProcessor(
        bufferSize,
        this.channelCount,
        this.channelCount
      );

      this.chunks = [];

      this.processorNode.onaudioprocess = (e) => {
        // Interleave channels into a single Float32Array
        const length = e.inputBuffer.length;
        const interleaved = new Float32Array(length * this.channelCount);
        for (let ch = 0; ch < this.channelCount; ch++) {
          const channelData = e.inputBuffer.getChannelData(ch);
          for (let i = 0; i < length; i++) {
            interleaved[i * this.channelCount + ch] = channelData[i];
          }
        }
        this.chunks.push(interleaved);
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioCtx.destination);

      // If the user stops sharing from the browser UI
      this.mediaStream.getAudioTracks()[0].onended = () => {
        if (this._state === 'recording') {
          this.setState('stopped');
        }
      };

      this.startTime = Date.now();
      this.setState('recording');
    } catch (err) {
      this.cleanup();
      this.setState('idle');
      throw err;
    }
  }

  /**
   * Stop recording and return the captured audio as a lossless WAV blob.
   */
  stopRecording(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (this._state !== 'recording') {
        reject(new Error('Not recording'));
        return;
      }

      const durationMs = Date.now() - this.startTime;

      // Disconnect audio nodes to stop capturing
      this.processorNode?.disconnect();
      this.sourceNode?.disconnect();

      // Merge all chunks into a single interleaved buffer
      const totalSamples = this.chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of this.chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // Encode as 16-bit WAV
      const wavBlob = encodeInterleavedWav(merged, this.sampleRate, this.channelCount);

      this.cleanup();
      this.setState('stopped');
      resolve({ blob: wavBlob, durationMs });
    });
  }

  /**
   * Cancel recording and discard all data.
   */
  cancelRecording() {
    this.cleanup();
    this.setState('idle');
  }

  /**
   * Reset back to idle (call after consuming the result).
   */
  reset() {
    this.cleanup();
    this.setState('idle');
  }

  private cleanup() {
    this.processorNode?.disconnect();
    this.sourceNode?.disconnect();
    this.processorNode = null;
    this.sourceNode = null;

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }

    this.chunks = [];
    this.startTime = 0;
  }
}

