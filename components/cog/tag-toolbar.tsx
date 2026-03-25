'use client';

import { useState, useMemo, useCallback } from 'react';
import { IconFilter } from '@tabler/icons-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { TagFilterBar } from './tag-filter-bar';
import { cn } from '@/lib/utils';
import type { CogTagWithGroup } from '@/lib/types/cog';

interface TagToolbarProps {
  enabledTags: CogTagWithGroup[];
  activeTags: Set<string>;
  fixedTags?: Set<string>;
  onToggle: (tagId: string) => void;
  onClear: () => void;
  /** Optional content to render before the funnel button (e.g., upload button) */
  leading?: React.ReactNode;
}

export function TagToolbar({
  enabledTags,
  activeTags,
  fixedTags,
  onToggle,
  onClear,
  leading,
}: TagToolbarProps) {
  const fixedSet = fixedTags ?? new Set<string>();
  const [visibleTagIds, setVisibleTagIds] = useState<Set<string>>(
    () => {
      // Start with fixed + active + first few enabled
      const initial = new Set([...fixedSet, ...activeTags]);
      // If nothing explicitly set, show first 10 tags
      if (initial.size === 0) {
        for (const tag of enabledTags.slice(0, 10)) {
          initial.add(tag.id);
        }
      }
      return initial;
    }
  );

  const visibleTags = useMemo(
    () => enabledTags.filter((t) => visibleTagIds.has(t.id)),
    [enabledTags, visibleTagIds],
  );

  const handleToggleVisibility = useCallback((tagId: string) => {
    setVisibleTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
        // Also deactivate if it was active
        if (activeTags.has(tagId)) onToggle(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, [activeTags, onToggle]);

  if (enabledTags.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {leading}

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="shrink-0 flex items-center justify-center size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Manage visible tags"
          >
            <IconFilter size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2 max-h-64 overflow-y-auto">
          <p className="text-[10px] font-medium text-muted-foreground px-1 mb-1.5">Show in filter bar</p>
          {enabledTags.map((tag) => {
            const isFixed = fixedSet.has(tag.id);
            const isVisible = visibleTagIds.has(tag.id);
            const color = tag.color || tag.group?.color || '#888';
            return (
              <button
                key={tag.id}
                type="button"
                disabled={isFixed}
                onClick={() => handleToggleVisibility(tag.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-1.5 py-1 rounded text-xs transition-colors',
                  isFixed ? 'opacity-50 cursor-default' : 'hover:bg-accent cursor-pointer',
                )}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="flex-1 text-left truncate">{tag.name}</span>
                {(isVisible || isFixed) && <span className="text-[10px] text-muted-foreground">visible</span>}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      <TagFilterBar
        enabledTags={visibleTags}
        activeTags={activeTags}
        fixedTags={fixedSet.size > 0 ? fixedSet : undefined}
        onToggle={onToggle}
        onClear={onClear}
      />
    </div>
  );
}
