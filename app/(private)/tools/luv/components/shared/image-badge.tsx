'use client';

import { cn } from '@/lib/utils';

interface ImageBadgeProps {
  index: number;
  /** Called when user taps the badge to insert a reference */
  onInsertReference?: (index: number) => void;
  className?: string;
}

/**
 * Small numbered badge overlay on images in chat.
 * Tapping inserts [N] as a text reference in the input.
 */
export function ImageBadge({ index, onInsertReference, className }: ImageBadgeProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onInsertReference?.(index);
      }}
      className={cn(
        'absolute bottom-1 left-1 z-10',
        'flex items-center justify-center',
        'min-w-[20px] h-5 px-1 rounded-full',
        'bg-black/70 text-white text-[10px] font-mono font-medium',
        'hover:bg-primary/90 transition-colors cursor-pointer',
        'backdrop-blur-sm',
        className,
      )}
      title={`Image [${index}] — tap to reference`}
    >
      {index}
    </button>
  );
}
