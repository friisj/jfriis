'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DrumPadProps {
  label: string;
  onTrigger: (velocity: number) => void;
  color?: string;
}

export function DrumPad({ label, onTrigger, color = 'bg-zinc-700' }: DrumPadProps) {
  const [pressed, setPressed] = useState(false);

  const handleDown = useCallback(() => {
    setPressed(true);
    onTrigger(0.8);
  }, [onTrigger]);

  const handleUp = useCallback(() => {
    setPressed(false);
  }, []);

  return (
    <button
      type="button"
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      className={cn(
        'w-16 h-16 rounded-xl text-xs font-bold uppercase tracking-wider',
        'text-zinc-300 shadow-md select-none touch-none',
        'transition-all duration-75',
        'focus-visible:ring-2 focus-visible:ring-amber-400/50 outline-none',
        color,
        pressed ? 'scale-95 shadow-none brightness-125' : 'active:scale-95',
      )}
      aria-label={`${label} drum pad`}
    >
      {label}
    </button>
  );
}
