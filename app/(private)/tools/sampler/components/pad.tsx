'use client';

import { Plus, Settings, Volume2, Trash2 } from 'lucide-react';
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
  onSelect: (pad: PadWithSound) => void;
}

export function Pad({ pad, isPlaying, isSelected, onTrigger, onSelect }: PadProps) {
  const hasSound = !!pad.sound;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative rounded-lg border-2 transition-all select-none',
            'flex flex-col items-center justify-center gap-1 p-2',
            'touch-action-none cursor-pointer',
            'active:scale-95 active:brightness-110',
            hasSound
              ? 'bg-muted hover:bg-muted/80'
              : 'bg-background border-dashed hover:bg-muted/30',
            isSelected && 'ring-2 ring-primary ring-offset-2',
            isPlaying && 'brightness-125 shadow-lg shadow-primary/20'
          )}
          style={{
            backgroundColor: pad.color || undefined,
            gridRow: `${pad.row + 1} / span ${pad.row_span}`,
            gridColumn: `${pad.col + 1} / span ${pad.col_span}`,
            touchAction: 'none',
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            if (hasSound) onTrigger(pad);
          }}
          aria-label={pad.label || pad.sound?.name || `Pad ${pad.row + 1},${pad.col + 1}`}
        >
          {hasSound ? (
            <>
              {pad.label && (
                <span className="text-xs font-semibold truncate w-full text-center">
                  {pad.label}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {pad.sound!.name}
              </span>
            </>
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
