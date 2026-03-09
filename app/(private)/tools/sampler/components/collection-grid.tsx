'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IconSquare } from '@tabler/icons-react';
import { SamplerEngine } from '@/lib/sampler-engine';
import { updatePad, expandGrid, uploadAudio, createSound } from '@/lib/sampler';
import { encodeWav } from '@/lib/sampler-wav';
import { TabRecorder } from '@/lib/sampler-recorder';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import type {
  CollectionWithPads,
  PadWithSound,
  PadEffects,
  BatchSpec,
  BatchItem,
  SamplerSound,
} from '@/lib/types/sampler';
import { Pad } from './pad';
import { PadConfigPanel } from './pad-config-panel';
import { BatchStatus } from './batch-status';
import { SoundGenerateModal } from './sound-generate-modal';

// Keyboard mapping: number row + qwerty row for first 16 pads
const KEY_MAP = '1234567890qwertyuiop';

interface CollectionGridProps {
  collection: CollectionWithPads;
}

export function CollectionGrid({ collection }: CollectionGridProps) {
  const [pads, setPads] = useState<PadWithSound[]>(collection.pads);
  const [gridRows, setGridRows] = useState(collection.grid_rows);
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  const [playingPads, setPlayingPads] = useState<Set<string>>(new Set());
  const [batchItems, setBatchItems] = useState<BatchItem[] | null>(null);
  const engineRef = useRef<SamplerEngine | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Inline recording state
  const [recordingPadId, setRecordingPadId] = useState<string | null>(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [recordingSaving, setRecordingSaving] = useState(false);
  const recorderRef = useRef<TabRecorder | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate-from-pad state
  const [generatePadId, setGeneratePadId] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  // Initialize engine and preload
  useEffect(() => {
    const engine = new SamplerEngine();
    engineRef.current = engine;
    engine.preload(pads);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for batch spec in sessionStorage on mount
  useEffect(() => {
    const key = `sampler-batch-${collection.id}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    sessionStorage.removeItem(key);

    try {
      const spec: BatchSpec = JSON.parse(raw);
      startBatch(spec);
    } catch {
      // Invalid spec, ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startBatch(spec: BatchSpec) {
    const emptyPads = pads.filter((p) => !p.sound_id);
    let allPads = [...pads];
    let currentRows = gridRows;

    // Expand grid if needed
    if (spec.prompts.length > emptyPads.length) {
      const needed = spec.prompts.length - emptyPads.length;
      const additionalRows = Math.ceil(needed / collection.grid_cols);
      try {
        const newPads = await expandGrid(
          collection.id,
          currentRows,
          collection.grid_cols,
          additionalRows
        );
        const newPadsWithSound: PadWithSound[] = newPads.map((p) => ({ ...p, sound: null }));
        allPads = [...allPads, ...newPadsWithSound];
        currentRows = currentRows + additionalRows;
        setPads(allPads);
        setGridRows(currentRows);
      } catch (err) {
        console.error('Failed to expand grid:', err);
      }
    }

    // Initialize batch items
    const items: BatchItem[] = spec.prompts.map((p) => ({
      ...p,
      status: 'pending',
    }));
    setBatchItems(items);

    // Run concurrent generation
    const concurrency = spec.method === 'elevenlabs' ? 2 : 4;
    const controller = new AbortController();
    abortRef.current = controller;

    const emptyPadIds = allPads.filter((p) => !p.sound_id).map((p) => p.id);
    let padIndex = 0;

    async function processItem(item: BatchItem) {
      if (controller.signal.aborted) return;

      setBatchItems((prev) =>
        prev?.map((i) => (i.index === item.index ? { ...i, status: 'generating' } : i)) ?? null
      );

      try {
        const endpoint =
          spec.method === 'elevenlabs' ? '/api/sampler/generate' : '/api/sampler/synthesize';
        const body =
          spec.method === 'elevenlabs'
            ? { text: item.prompt, duration_seconds: 2, prompt_influence: 0.3 }
            : { text: item.prompt };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Generation failed');
        }

        const sound: SamplerSound = await res.json();

        // Assign to next empty pad
        const targetPadId = emptyPadIds[padIndex++];
        if (targetPadId) {
          await updatePad(targetPadId, {
            sound_id: sound.id,
            label: item.label || null,
          });

          // Update local state
          setPads((prev) =>
            prev.map((p) =>
              p.id === targetPadId ? { ...p, sound_id: sound.id, sound, label: item.label || p.label } : p
            )
          );

          // Preload audio buffer
          if (sound.audio_url) {
            engineRef.current?.loadBuffer(sound.audio_url);
          }
        }

        setBatchItems((prev) =>
          prev?.map((i) =>
            i.index === item.index ? { ...i, status: 'done', soundId: sound.id } : i
          ) ?? null
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        setBatchItems((prev) =>
          prev?.map((i) =>
            i.index === item.index
              ? { ...i, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
              : i
          ) ?? null
        );
      }
    }

    // Semaphore-based concurrency
    const queue = [...items];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0 && !controller.signal.aborted) {
        const item = queue.shift();
        if (item) await processItem(item);
      }
    });

    await Promise.allSettled(workers);
    abortRef.current = null;
  }

  function cancelBatch() {
    abortRef.current?.abort();
    setBatchItems((prev) =>
      prev?.map((i) => (i.status === 'pending' ? { ...i, status: 'error', error: 'Cancelled' } : i)) ?? null
    );
  }

  function dismissBatch() {
    setBatchItems(null);
  }

  const stopAll = useCallback(() => {
    engineRef.current?.stopAll();
    setPlayingPads(new Set());
  }, []);

  const togglePlaySelected = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !selectedPadId) return;
    const pad = pads.find((p) => p.id === selectedPadId);
    if (!pad?.sound) return;

    if (engine.isPlaying(pad.id)) {
      engine.stop(pad.id);
      setPlayingPads((prev) => {
        const next = new Set(prev);
        next.delete(pad.id);
        return next;
      });
    } else {
      engine.trigger(pad);
      setPlayingPads((prev) => new Set(prev).add(pad.id));
    }
  }, [selectedPadId, pads]);

  // Keyboard mapping
  useEffect(() => {
    function findPadByKey(key: string): PadWithSound | undefined {
      const keyIndex = KEY_MAP.indexOf(key.toLowerCase());
      if (keyIndex === -1) return undefined;
      const row = Math.floor(keyIndex / collection.grid_cols);
      const col = keyIndex % collection.grid_cols;
      if (row >= gridRows) return undefined;
      return pads.find((p) => p.row === row && p.col === col);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.repeat) return;

      if (e.key === 'Escape') {
        stopAll();
        return;
      }

      if (e.key === ' ' && selectedPadId) {
        e.preventDefault();
        togglePlaySelected();
        return;
      }

      const pad = findPadByKey(e.key);
      if (pad?.sound) {
        e.preventDefault();
        triggerPad(pad);
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const pad = findPadByKey(e.key);
      if (pad?.sound) {
        releasePad(pad);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pads, collection.grid_cols, gridRows, stopAll, selectedPadId, togglePlaySelected]);

  const triggerPad = useCallback((pad: PadWithSound) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (pad.pad_type === 'toggle' && engine.isPlaying(pad.id)) {
      engine.stop(pad.id);
      setPlayingPads((prev) => {
        const next = new Set(prev);
        next.delete(pad.id);
        return next;
      });
      return;
    }

    // Choke group: stop other pads in the same group before triggering
    if (pad.choke_group != null) {
      setPads((current) => {
        for (const other of current) {
          if (
            other.id !== pad.id &&
            other.choke_group === pad.choke_group &&
            engine.isPlaying(other.id)
          ) {
            engine.release(other.id);
            setPlayingPads((prev) => {
              const next = new Set(prev);
              next.delete(other.id);
              return next;
            });
          }
        }
        return current; // no mutation
      });
    }

    engine.trigger(pad);
    setPlayingPads((prev) => new Set(prev).add(pad.id));

    // For trigger pads, clear playing state after effective playback duration
    if (pad.pad_type === 'trigger') {
      const trimDuration = pad.effects.trim
        ? pad.effects.trim.endMs - pad.effects.trim.startMs
        : pad.sound?.duration_ms ?? 500;
      const rate = Math.pow(2, (pad.effects.pitch ?? 0) / 12);
      const effectiveMs = trimDuration / rate;
      setTimeout(() => {
        setPlayingPads((prev) => {
          const next = new Set(prev);
          next.delete(pad.id);
          return next;
        });
      }, Math.min(effectiveMs, 5000));
    }
  }, []);

  const releasePad = useCallback((pad: PadWithSound) => {
    const engine = engineRef.current;
    if (!engine) return;

    // Reset XY modulation on release regardless of pad type
    if (pad.effects.xyPad?.enabled) {
      engine.resetModulation(pad.id, pad.effects);
    }

    // Only gate pads respond to release
    if (pad.pad_type !== 'gate') return;

    engine.release(pad.id);
    setPlayingPads((prev) => {
      const next = new Set(prev);
      next.delete(pad.id);
      return next;
    });
  }, []);

  const handleXYModulate = useCallback((pad: PadWithSound, x: number, y: number) => {
    engineRef.current?.modulateXY(pad.id, x, y, pad.effects.xyPad, pad.effects);
  }, []);

  const handleXYRelease = useCallback((pad: PadWithSound) => {
    engineRef.current?.resetModulation(pad.id, pad.effects);
  }, []);

  function handlePadUpdated(updatedPad: PadWithSound) {
    setPads((prev) =>
      prev.map((p) => (p.id === updatedPad.id ? updatedPad : p))
    );

    // If a new sound was assigned, preload it
    if (updatedPad.sound?.audio_url) {
      engineRef.current?.loadBuffer(updatedPad.sound.audio_url);
    }
  }

  function handleEffectsChange(padId: string, effects: PadEffects) {
    engineRef.current?.updateEffects(padId, effects);
    setPads((prev) =>
      prev.map((p) => (p.id === padId ? { ...p, effects } : p))
    );
  }

  const getBuffer = useCallback(
    (url: string): AudioBuffer | null => engineRef.current?.getBuffer(url) ?? null,
    []
  );

  const getPlaybackPosition = useCallback(
    (padId: string) => () => engineRef.current?.getPlaybackPosition(padId) ?? null,
    []
  );

  const getPlaybackCycleProgress = useCallback(
    (padId: string) => () => engineRef.current?.getPlaybackCycleProgress(padId) ?? null,
    []
  );

  async function duplicatePad(source: PadWithSound) {
    // Find first empty pad in row-major order
    const sorted = [...pads].sort((a, b) => a.row - b.row || a.col - b.col);
    const target = sorted.find((p) => !p.sound_id && p.id !== source.id);
    if (!target) return;

    try {
      await updatePad(target.id, {
        sound_id: source.sound_id,
        effects: source.effects,
        label: source.label,
        color: source.color,
        pad_type: source.pad_type,
        choke_group: source.choke_group,
      });

      setPads((prev) =>
        prev.map((p) =>
          p.id === target.id
            ? { ...p, sound_id: source.sound_id, sound: source.sound, effects: source.effects, label: source.label, color: source.color, pad_type: source.pad_type, choke_group: source.choke_group }
            : p
        )
      );

      if (source.sound?.audio_url) {
        engineRef.current?.loadBuffer(source.sound.audio_url);
      }
    } catch (err) {
      console.error('Failed to duplicate pad:', err);
    }
  }

  // --- Inline recording ---
  async function startRecording(padId: string) {
    try {
      if (!recorderRef.current) {
        recorderRef.current = new TabRecorder();
      }
      const recorder = recorderRef.current;
      recorder.reset();
      await recorder.startRecording();
      setRecordingPadId(padId);
      setRecordingElapsed(0);
      setRecordingSaving(false);
      const start = Date.now();
      elapsedTimerRef.current = setInterval(() => {
        setRecordingElapsed(Date.now() - start);
      }, 100);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setRecordingPadId(null);
    }
  }

  async function stopRecording() {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    const padId = recordingPadId;
    if (!recorder || !padId) return;

    try {
      const result = await recorder.stopRecording();
      setRecordingSaving(true);

      const fileName = `sample-${Date.now()}.wav`;
      const file = new File([result.blob], fileName, { type: 'audio/wav' });
      const audioUrl = await uploadAudio(file, `samples/${fileName}`);

      const sound = await createSound({
        name: `Sample ${new Date().toLocaleTimeString()}`,
        type: 'file',
        audio_url: audioUrl,
        duration_ms: result.durationMs,
        tags: ['sampled'],
        source_config: { source: 'tab-capture' },
      });

      await updatePad(padId, { sound_id: sound.id });

      setPads((prev) =>
        prev.map((p) =>
          p.id === padId ? { ...p, sound_id: sound.id, sound } : p
        )
      );

      if (sound.audio_url) {
        engineRef.current?.loadBuffer(sound.audio_url);
      }
    } catch (err) {
      console.error('Failed to save recording:', err);
    } finally {
      recorder.reset();
      setRecordingPadId(null);
      setRecordingElapsed(0);
      setRecordingSaving(false);
    }
  }

  // --- Generate from pad ---
  function openGenerate(padId: string) {
    setGeneratePadId(padId);
    setGenerateOpen(true);
  }

  async function handleGeneratedForPad(sound: SamplerSound) {
    const padId = generatePadId;
    if (!padId) return;

    try {
      await updatePad(padId, { sound_id: sound.id });
      setPads((prev) =>
        prev.map((p) =>
          p.id === padId ? { ...p, sound_id: sound.id, sound } : p
        )
      );
      if (sound.audio_url) {
        engineRef.current?.loadBuffer(sound.audio_url);
      }
    } catch (err) {
      console.error('Failed to assign generated sound:', err);
    }

    setGeneratePadId(null);
    setGenerateOpen(false);
  }

  async function cropSound(padId: string) {
    const engine = engineRef.current;
    if (!engine) return;

    const pad = pads.find((p) => p.id === padId);
    if (!pad?.sound?.audio_url || !pad.effects.trim) return;

    const { trim } = pad.effects;
    const result = engine.getTrimmedChannels(pad.sound.audio_url, trim.startMs, trim.endMs);
    if (!result) return;

    try {
      const blob = encodeWav(result.channels, result.sampleRate);
      const file = new File([blob], `${pad.sound.name}-cropped.wav`, { type: 'audio/wav' });
      const path = `cropped/${Date.now()}-${file.name}`;
      const audioUrl = await uploadAudio(file, path);
      const durationMs = trim.endMs - trim.startMs;

      const newSound = await createSound({
        name: `${pad.sound.name} (cropped)`,
        type: 'file',
        audio_url: audioUrl,
        duration_ms: durationMs,
      });

      const newEffects = { ...pad.effects };
      delete newEffects.trim;

      await updatePad(padId, { sound_id: newSound.id, effects: newEffects });

      setPads((prev) =>
        prev.map((p) =>
          p.id === padId
            ? { ...p, sound_id: newSound.id, sound: newSound, effects: newEffects }
            : p
        )
      );

      await engine.loadBuffer(audioUrl);
    } catch (err) {
      console.error('Failed to crop sound:', err);
    }
  }

  function handleSoundUpdated(sound: SamplerSound) {
    setPads((prev) =>
      prev.map((p) => (p.sound_id === sound.id ? { ...p, sound } : p))
    );
  }

  const selectedPad = pads.find((p) => p.id === selectedPadId) ?? null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Grid + Config via Resizable Panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel minSize={40} className="flex">
          <div className="w-10 shrink-0 flex flex-col items-center pt-1 gap-1 border-r">
            <button
              onClick={stopAll}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Stop all (Esc)"
            >
              <IconSquare size={16}  />
            </button>
          </div>
          <div className="flex-1 h-full flex flex-col">
            {batchItems && (
              <BatchStatus
                items={batchItems}
                onCancel={cancelBatch}
                onDismiss={dismissBatch}
              />
            )}
            <SoundGenerateModal
              open={generateOpen}
              onOpenChange={(open) => {
                setGenerateOpen(open);
                if (!open) setGeneratePadId(null);
              }}
              onGenerated={handleGeneratedForPad}
            />
            <div
              className="grid p-1 flex-1"
              style={{
                gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                gridTemplateColumns: `repeat(${collection.grid_cols}, 1fr)`,
              }}
            >
              {pads.map((pad) => (
                <Pad
                  key={pad.id}
                  pad={pad}
                  isPlaying={playingPads.has(pad.id)}
                  isSelected={pad.id === selectedPadId}
                  recordingState={
                    pad.id === recordingPadId
                      ? recordingSaving ? 'saving' : 'recording'
                      : undefined
                  }
                  recordingElapsed={pad.id === recordingPadId ? recordingElapsed : undefined}
                  getPlaybackProgress={getPlaybackCycleProgress(pad.id)}
                  onTrigger={triggerPad}
                  onRelease={releasePad}
                  onSelect={(p) => setSelectedPadId(p.id === selectedPadId ? null : p.id)}
                  onDuplicate={duplicatePad}
                  onSample={(p) => startRecording(p.id)}
                  onGenerate={(p) => openGenerate(p.id)}
                  onStopRecording={() => stopRecording()}
                  onXYModulate={handleXYModulate}
                  onXYRelease={handleXYRelease}
                />
              ))}
            </div>
          </div>
        </ResizablePanel>

        {selectedPad && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <PadConfigPanel
                key={selectedPad.id}
                pad={selectedPad}
                getBuffer={getBuffer}
                onPadUpdated={handlePadUpdated}
                onEffectsChange={handleEffectsChange}
                onSoundUpdated={handleSoundUpdated}
                onCropSound={cropSound}
                onClose={() => setSelectedPadId(null)}
                isPlaying={playingPads.has(selectedPad.id)}
                onTogglePlay={togglePlaySelected}
                getPlaybackPosition={getPlaybackPosition(selectedPad.id)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
