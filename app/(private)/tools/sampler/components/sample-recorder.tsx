'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { TabRecorder, type RecordingResult } from '@/lib/sampler-recorder';
import { uploadAudio, createSound } from '@/lib/sampler';
import { Waveform } from './waveform';
import type { SamplerSound } from '@/lib/types/sampler';

interface SampleRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSampled: (sound: SamplerSound) => void;
}

type Phase = 'idle' | 'recording' | 'preview' | 'saving';

export function SampleRecorder({ open, onOpenChange, onSampled }: SampleRecorderProps) {
  const recorderRef = useRef<TabRecorder | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [previewBuffer, setPreviewBuffer] = useState<AudioBuffer | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lazy-init recorder
  const getRecorder = useCallback(() => {
    if (!recorderRef.current) {
      recorderRef.current = new TabRecorder();
    }
    return recorderRef.current;
  }, []);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.cancelRecording();
      setPhase('idle');
      setElapsed(0);
      setResult(null);
      setPreviewBuffer(null);
      setName('');
      setError(null);
    }
  }, [open]);

  async function handleStart() {
    setError(null);
    const recorder = getRecorder();
    try {
      await recorder.startRecording();
      setPhase('recording');
      setElapsed(0);
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - start);
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }

  async function handleStop() {
    if (timerRef.current) clearInterval(timerRef.current);
    const recorder = getRecorder();
    try {
      const res = await recorder.stopRecording();
      setResult(res);
      setName(`Sample ${new Date().toLocaleTimeString()}`);

      // Decode for waveform preview
      const arrayBuffer = await res.blob.arrayBuffer();
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      await audioCtx.close();
      setPreviewBuffer(decoded);

      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      setPhase('idle');
    }
  }

  function handleDiscard() {
    getRecorder().reset();
    setResult(null);
    setPreviewBuffer(null);
    setPhase('idle');
    setError(null);
  }

  async function handleSave() {
    if (!result) return;
    setPhase('saving');
    setError(null);

    try {
      const fileName = `sample-${Date.now()}.webm`;
      const file = new File([result.blob], fileName, { type: 'audio/webm;codecs=opus' });
      const audioUrl = await uploadAudio(file, `samples/${fileName}`);

      const durationMs = previewBuffer
        ? Math.round(previewBuffer.duration * 1000)
        : result.durationMs;

      const sound = await createSound({
        name: name.trim() || `Sample ${Date.now()}`,
        type: 'file',
        audio_url: audioUrl,
        duration_ms: durationMs,
        tags: ['sampled'],
        source_config: { source: 'tab-capture' },
      });

      getRecorder().reset();
      onSampled(sound);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sample');
      setPhase('preview');
    }
  }

  function formatTime(ms: number) {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sample from Tab</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Idle */}
          {phase === 'idle' && (
            <>
              <p className="text-sm text-muted-foreground">
                Records audio from another browser tab. Your browser will ask which tab to capture.
              </p>
              <Button onClick={handleStart} className="w-full">
                Start Recording
              </Button>
            </>
          )}

          {/* Recording */}
          {phase === 'recording' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 py-6">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-2xl font-mono tabular-nums">
                  {formatTime(elapsed)}
                </span>
              </div>
              <Button variant="destructive" onClick={handleStop} className="w-full">
                Stop Recording
              </Button>
            </div>
          )}

          {/* Preview */}
          {phase === 'preview' && (
            <div className="space-y-4">
              <Waveform buffer={previewBuffer} editable={false} />
              <div className="space-y-2">
                <Label htmlFor="sample-name">Name</Label>
                <Input
                  id="sample-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sample name"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDiscard} className="flex-1">
                  Discard
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Saving */}
          {phase === 'saving' && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Uploading sample...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
