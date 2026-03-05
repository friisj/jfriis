'use client';

import { Plus, Settings, Volume2, Copy, Mic, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { PadWithSound } from '@/lib/types/sampler';
import { BorderBeam } from './border-beam';

function getEffectiveDurationMs(pad: PadWithSound): number {
  const baseDuration = pad.effects.trim
    ? pad.effects.trim.endMs - pad.effects.trim.startMs
    : pad.sound?.duration_ms ?? 500;
  const rate = Math.pow(2, (pad.effects.pitch ?? 0) / 12);
  return baseDuration / rate;
}

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
  onTrigger: (pad: PadWithSound) => void;
  onRelease: (pad: PadWithSound) => void;
  onSelect: (pad: PadWithSound) => void;
  onDuplicate?: (pad: PadWithSound) => void;
  onSample?: (pad: PadWithSound) => void;
  onGenerate?: (pad: PadWithSound) => void;
  onStopRecording?: (pad: PadWithSound) => void;
}

export function Pad({
  pad, isPlaying, isSelected, recordingState, recordingElapsed,
  onTrigger, onRelease, onSelect, onDuplicate, onSample, onGenerate, onStopRecording,
}: PadProps) {
  const hasSound = !!pad.sound;
  const isRecording = recordingState === 'recording';
  const isSaving = recordingState === 'saving';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
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
          onPointerUp={(e) => {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            if (!recordingState && hasSound) onRelease(pad);
          }}
          onPointerLeave={() => {
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
              duration={getEffectiveDurationMs(pad) / 1000}
              colorFrom={pad.color ? `${pad.color}cc` : '#3b82f6'}
              colorTo={pad.color ? `${pad.color}66` : '#8b5cf6'}
              loop={pad.pad_type !== 'trigger'}
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
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Saving…</span>
            </div>
          ) : hasSound ? (
            <span className="text-xs font-semibold w-full text-center line-clamp-1">
              {pad.label || pad.sound!.name}
            </span>
          ) : (
            <Plus className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onSelect(pad)}>
          <Settings className="mr-2 h-4 w-4" />
          Configure
        </ContextMenuItem>
        {hasSound && (
          <ContextMenuItem onClick={() => onTrigger(pad)}>
            <Volume2 className="mr-2 h-4 w-4" />
            Play
          </ContextMenuItem>
        )}
        {hasSound && onDuplicate && (
          <ContextMenuItem onClick={() => onDuplicate(pad)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </ContextMenuItem>
        )}
        {onSample && (
          <ContextMenuItem onClick={() => onSample(pad)}>
            <Mic className="mr-2 h-4 w-4" />
            Sample
          </ContextMenuItem>
        )}
        {onGenerate && (
          <ContextMenuItem onClick={() => onGenerate(pad)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate
          </ContextMenuItem>
        )}
        {!hasSound && (
          <ContextMenuItem onClick={() => onSelect(pad)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Sound
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
