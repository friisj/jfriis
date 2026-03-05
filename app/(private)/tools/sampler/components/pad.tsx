'use client';

import { Plus, Settings, Volume2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { PadWithSound } from '@/lib/types/sampler';

interface PadProps {
  pad: PadWithSound;
  isPlaying: boolean;
  isSelected: boolean;
  onTrigger: (pad: PadWithSound) => void;
  onRelease: (pad: PadWithSound) => void;
  onSelect: (pad: PadWithSound) => void;
  onDuplicate?: (pad: PadWithSound) => void;
}

export function Pad({ pad, isPlaying, isSelected, onTrigger, onRelease, onSelect, onDuplicate }: PadProps) {
  const hasSound = !!pad.sound;

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
            hasSound
              ? 'bg-muted hover:bg-muted/80'
              : 'bg-background hover:bg-muted/30',
            isSelected && 'ring-2 ring-primary ring-offset-2',
            isPlaying && ''
          )}
          style={{
            backgroundColor: pad.color || undefined,
            gridRow: `${pad.row + 1} / span ${pad.row_span}`,
            gridColumn: `${pad.col + 1} / span ${pad.col_span}`,
            touchAction: 'none',
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            if (hasSound) onTrigger(pad);
          }}
          onPointerUp={(e) => {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            if (hasSound) onRelease(pad);
          }}
          onPointerLeave={() => {
            if (hasSound) onRelease(pad);
          }}
          aria-label={pad.label || pad.sound?.name || `Pad ${pad.row + 1},${pad.col + 1}`}
        >
          {hasSound ? (
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
