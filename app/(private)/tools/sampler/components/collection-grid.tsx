'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SamplerEngine } from '@/lib/sampler-engine';
import { updatePad, expandGrid } from '@/lib/sampler';
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.repeat) return;

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
  }, [pads, collection.grid_cols, gridRows]);

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

    // For trigger pads, clear playing state after a short delay
    if (pad.pad_type === 'trigger') {
      const duration = pad.sound?.duration_ms ?? 500;
      setTimeout(() => {
        setPlayingPads((prev) => {
          const next = new Set(prev);
          next.delete(pad.id);
          return next;
        });
      }, Math.min(duration, 3000));
    }
  }, []);

  const releasePad = useCallback((pad: PadWithSound) => {
    const engine = engineRef.current;
    if (!engine) return;

    // Only gate pads respond to release
    if (pad.pad_type !== 'gate') return;

    engine.release(pad.id);
    setPlayingPads((prev) => {
      const next = new Set(prev);
      next.delete(pad.id);
      return next;
    });
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

  function handleSoundUpdated(sound: SamplerSound) {
    setPads((prev) =>
      prev.map((p) => (p.sound_id === sound.id ? { ...p, sound } : p))
    );
  }

  const selectedPad = pads.find((p) => p.id === selectedPadId) ?? null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Batch Status Banner */}
      {batchItems && (
        <BatchStatus
          items={batchItems}
          onCancel={cancelBatch}
          onDismiss={dismissBatch}
        />
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Grid */}
        <div
          className="flex-1 grid gap-2 min-h-0"
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
                onTrigger={triggerPad}
                onRelease={releasePad}
                onSelect={(p) => setSelectedPadId(p.id === selectedPadId ? null : p.id)}
              />
            ))}
        </div>

        {/* Config Panel */}
        {selectedPad && (
          <div className="w-72 border-l shrink-0">
            <PadConfigPanel
              key={selectedPad.id}
              pad={selectedPad}
              getBuffer={getBuffer}
              onPadUpdated={handlePadUpdated}
              onEffectsChange={handleEffectsChange}
              onSoundUpdated={handleSoundUpdated}
              onClose={() => setSelectedPadId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
