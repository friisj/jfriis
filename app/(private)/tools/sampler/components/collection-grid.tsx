'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SamplerEngine } from '@/lib/sampler-engine';
import type { CollectionWithPads, PadWithSound, PadEffects } from '@/lib/types/sampler';
import { Pad } from './pad';
import { PadConfigPanel } from './pad-config-panel';

// Keyboard mapping: number row + qwerty row for first 16 pads
const KEY_MAP = '1234567890qwertyuiop';

interface CollectionGridProps {
  collection: CollectionWithPads;
}

export function CollectionGrid({ collection }: CollectionGridProps) {
  const [pads, setPads] = useState<PadWithSound[]>(collection.pads);
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  const [playingPads, setPlayingPads] = useState<Set<string>>(new Set());
  const engineRef = useRef<SamplerEngine | null>(null);

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

  // Keyboard mapping
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.repeat) return;

      const keyIndex = KEY_MAP.indexOf(e.key.toLowerCase());
      if (keyIndex === -1) return;

      // Map key index to grid position (row-major order)
      const row = Math.floor(keyIndex / collection.grid_cols);
      const col = keyIndex % collection.grid_cols;
      if (row >= collection.grid_rows) return;

      const pad = pads.find((p) => p.row === row && p.col === col);
      if (pad?.sound) {
        e.preventDefault();
        triggerPad(pad);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pads, collection.grid_cols, collection.grid_rows]);

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

  const selectedPad = pads.find((p) => p.id === selectedPadId) ?? null;

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* Grid */}
      <div
        className="flex-1 grid gap-2 min-h-0"
        style={{
          gridTemplateRows: `repeat(${collection.grid_rows}, 1fr)`,
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
            onPadUpdated={handlePadUpdated}
            onEffectsChange={handleEffectsChange}
          />
        </div>
      )}
    </div>
  );
}
