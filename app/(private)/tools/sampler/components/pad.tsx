'use client';

import { useState, useRef, useCallback } from 'react';
import { IconPlus, IconSettings, IconVolume, IconCopy, IconMicrophone, IconSparkles, IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { PadWithSound } from '@/lib/types/sampler';
import { BorderBeam } from './border-beam';

function formatElapsed(ms: number) {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins}:${s.toString().padStart(2, '0')}`;
}

interface PadProps {
  pad: PadWithSound;
  isPlaying: boolean;
  isSelected: boolean;
  recordingState?: 'recording' | 'saving';
  recordingElapsed?: number;
  getPlaybackProgress: () => number | null;
  onTrigger: (pad: PadWithSound) => void;
  onRelease: (pad: PadWithSound) => void;
  onSelect: (pad: PadWithSound) => void;
  onDuplicate?: (pad: PadWithSound) => void;
  onSample?: (pad: PadWithSound) => void;
  onGenerate?: (pad: PadWithSound) => void;
  onStopRecording?: (pad: PadWithSound) => void;
  onXYModulate?: (pad: PadWithSound, x: number, y: number) => void;
  onXYRelease?: (pad: PadWithSound) => void;
}

export function Pad({
  pad, isPlaying, isSelected, recordingState, recordingElapsed, getPlaybackProgress,
  onTrigger, onRelease, onSelect, onDuplicate, onSample, onGenerate, onStopRecording,
  onXYModulate, onXYRelease,
}: PadProps) {
  const hasSound = !!pad.sound;
  const isRecording = recordingState === 'recording';
  const isSaving = recordingState === 'saving';
  const xyEnabled = !!pad.effects.xyPad?.enabled && hasSound;
  const [xyPos, setXyPos] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!xyEnabled || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height)); // invert Y
    setXyPos({ x, y });
    onXYModulate?.(pad, x, y);
  }, [xyEnabled, pad, onXYModulate]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          ref={buttonRef}
          type="button"
          className={cn(
            'relative rounded-lg border m-1 transition-all select-none',
            'flex flex-col items-center justify-center gap-1 p-2',
            'touch-action-none cursor-pointer',
            "shadow-md",
            'active:scale-98 active:brightness-98',
            isRecording
              ? 'bg-red-500/10 border-red-500/40'
              : isSaving
                ? 'bg-muted'
                : hasSound
                  ? 'bg-muted hover:bg-muted/80'
                  : 'bg-background hover:bg-muted/30',
            isSelected && !recordingState && 'ring-2 ring-primary ring-offset-2',
            isPlaying && ''
          )}
          style={{
            backgroundColor: recordingState ? undefined : (pad.color || undefined),
            gridRow: `${pad.row + 1} / span ${pad.row_span}`,
            gridColumn: `${pad.col + 1} / span ${pad.col_span}`,
            touchAction: 'none',
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            if (isRecording) {
              onStopRecording?.(pad);
            } else if (!recordingState && hasSound) {
              onTrigger(pad);
            }
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            if (xyEnabled) {
              onXYRelease?.(pad);
              setXyPos(null);
            }
            if (!recordingState && hasSound) onRelease(pad);
          }}
          onPointerLeave={() => {
            if (xyEnabled) {
              onXYRelease?.(pad);
              setXyPos(null);
            }
            if (!recordingState && hasSound) onRelease(pad);
          }}
          aria-label={
            isRecording ? 'Click to stop recording'
            : isSaving ? 'Saving sample...'
            : pad.label || pad.sound?.name || `Pad ${pad.row + 1},${pad.col + 1}`
          }
        >
          {isPlaying && hasSound && (
            <BorderBeam
              getProgress={getPlaybackProgress}
              colorFrom={pad.color ? `${pad.color}cc` : '#3b82f6'}
              colorTo={pad.color ? `${pad.color}66` : '#8b5cf6'}
            />
          )}
          {isRecording ? (
            <div className="flex flex-col items-center gap-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-xs font-mono tabular-nums text-red-600 dark:text-red-400">
                {formatElapsed(recordingElapsed ?? 0)}
              </span>
            </div>
          ) : isSaving ? (
            <div className="flex flex-col items-center gap-1">
              <IconLoader2 size={16} className="animate-spin text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Saving…</span>
            </div>
          ) : hasSound ? (
            <span className="text-xs font-semibold w-full text-center line-clamp-1">
              {pad.label || pad.sound!.name}
            </span>
          ) : (
            <IconPlus size={16} className="text-muted-foreground" />
          )}
          {xyPos && (
            <span
              className="absolute w-1.5 h-1.5 rounded-full bg-white/70 pointer-events-none"
              style={{
                left: `${xyPos.x * 100}%`,
                top: `${(1 - xyPos.y) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onSelect(pad)}>
          <IconSettings size={16} className="mr-2" />
          Configure
        </ContextMenuItem>
        {hasSound && (
          <ContextMenuItem onClick={() => onTrigger(pad)}>
            <IconVolume size={16} className="mr-2" />
            Play
          </ContextMenuItem>
        )}
        {hasSound && onDuplicate && (
          <ContextMenuItem onClick={() => onDuplicate(pad)}>
            <IconCopy size={16} className="mr-2" />
            Duplicate
          </ContextMenuItem>
        )}
        {onSample && (
          <ContextMenuItem onClick={() => onSample(pad)}>
            <IconMicrophone size={16} className="mr-2" />
            Sample
          </ContextMenuItem>
        )}
        {onGenerate && (
          <ContextMenuItem onClick={() => onGenerate(pad)}>
            <IconSparkles size={16} className="mr-2" />
            Generate
          </ContextMenuItem>
        )}
        {!hasSound && (
          <ContextMenuItem onClick={() => onSelect(pad)}>
            <IconPlus size={16} className="mr-2" />
            Assign Sound
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
