'use client';

import { cn } from '@/lib/utils';
import type { CogTagWithGroup } from '@/lib/types/cog';

interface TagFilterBarProps {
  enabledTags: CogTagWithGroup[];
  activeTags: Set<string>;
  onToggle: (tagId: string) => void;
  onClear: () => void;
}

export function TagFilterBar({ enabledTags, activeTags, onToggle, onClear }: TagFilterBarProps) {
  if (enabledTags.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto py-2">
      <button
        type="button"
        onClick={onClear}
        className={cn(
          'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
          activeTags.size === 0
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent',
        )}
      >
        All
      </button>
      {enabledTags.map((tag) => {
        const isActive = activeTags.has(tag.id);
        const color = tag.color || tag.group?.color || '#888';
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors flex items-center gap-1.5',
              isActive
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
