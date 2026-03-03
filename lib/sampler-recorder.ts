/**
 * TabRecorder — captures audio from a browser tab via getDisplayMedia + MediaRecorder.
 *
 * State machine: idle → requesting → recording → stopped
 */

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped';

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
}

export class TabRecorder {
  private _state: RecorderState = 'idle';
  private mediaStream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
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
   * Resolves once recording has begun (after the user grants permission).
   * Rejects if permission is denied or the API is unavailable.
   */
  async startRecording(): Promise<void> {
    if (this._state !== 'idle') return;
    this.setState('requesting');

    try {
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: false, // we only need audio — Chrome still captures video but we ignore it
      } as DisplayMediaStreamOptions);

      // If user shared a screen but no audio track came through
      if (this.mediaStream.getAudioTracks().length === 0) {
        this.cleanup();
        throw new Error('No audio track — make sure "Share tab audio" is checked.');
      }

      // Stop any video tracks we don't need
      for (const track of this.mediaStream.getVideoTracks()) {
        track.stop();
      }

      this.chunks = [];
      this.recorder = new MediaRecorder(this.mediaStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      // If the user stops sharing from the browser UI
      this.mediaStream.getAudioTracks()[0].onended = () => {
        if (this._state === 'recording') {
          this.recorder?.stop();
          this.setState('stopped');
        }
      };

      this.recorder.start();
      this.startTime = Date.now();
      this.setState('recording');
    } catch (err) {
      this.cleanup();
      this.setState('idle');
      throw err;
    }
  }

  /**
   * Stop recording and return the captured audio blob + duration.
   */
  stopRecording(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (this._state !== 'recording' || !this.recorder) {
        reject(new Error('Not recording'));
        return;
      }

      const durationMs = Date.now() - this.startTime;

      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm;codecs=opus' });
        this.cleanup();
        this.setState('stopped');
        resolve({ blob, durationMs });
      };

      this.recorder.stop();
    });
  }

  /**
   * Cancel recording and discard all data.
   */
  cancelRecording() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
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
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }
    this.recorder = null;
    this.chunks = [];
    this.startTime = 0;
  }
}
