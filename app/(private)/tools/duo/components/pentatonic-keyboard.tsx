'use client';

import { cn } from '@/lib/utils';
import { getScaleNotes } from '@/lib/duo/scales';

const KEY_COLORS = [
  'bg-red-500 hover:bg-red-400 active:bg-red-600',
  'bg-orange-500 hover:bg-orange-400 active:bg-orange-600',
  'bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600',
  'bg-green-500 hover:bg-green-400 active:bg-green-600',
  'bg-blue-500 hover:bg-blue-400 active:bg-blue-600',
  'bg-red-400 hover:bg-red-300 active:bg-red-500',
  'bg-orange-400 hover:bg-orange-300 active:bg-orange-500',
  'bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500',
  'bg-green-400 hover:bg-green-300 active:bg-green-500',
  'bg-blue-400 hover:bg-blue-300 active:bg-blue-500',
];

interface PentatonicKeyboardProps {
  transpose: number;
  onNotePress: (note: string) => void;
  activeNote?: string | null;
}

export function PentatonicKeyboard({ transpose, onNotePress, activeNote }: PentatonicKeyboardProps) {
  const notes = getScaleNotes(transpose);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-5 gap-1.5">
        {notes.map((note, i) => (
          <button
            key={`${note}-${i}`}
            type="button"
            onClick={() => onNotePress(note)}
            className={cn(
              'h-20 rounded-lg text-sm font-mono font-bold text-background shadow-sm',
              'transition-all duration-75 active:scale-95 active:shadow-none',
              'focus-visible:ring-2 focus-visible:ring-amber-400/50 outline-none',
              KEY_COLORS[i],
              activeNote === note && 'ring-2 ring-white/60 scale-95',
            )}
            aria-label={`Note ${note}`}
          >
            {note}
          </button>
        ))}
      </div>
    </div>
  );
}
