'use client';

import { IconPhoto, IconPencil, IconMicroscope, IconSearch, IconBrain } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { TOOL_HINTS, type ToolHint } from '../tool-hints';

const ICON_MAP = {
  photo: IconPhoto,
  pencil: IconPencil,
  microscope: IconMicroscope,
  search: IconSearch,
  brain: IconBrain,
} as const;

interface ToolHintBarProps {
  selected: string | null;
  onSelect: (toolName: string | null) => void;
  compact?: boolean;
}

/**
 * Toolbar of favourite tools the user can select to force a specific tool.
 * Selecting a hint sends tool_choice to the server, bypassing agent routing.
 * Click again to deselect (returns to agent-routed mode).
 */
export function ToolHintBar({ selected, onSelect, compact = false }: ToolHintBarProps) {
  return (
    <div className={cn('flex items-center gap-1', compact ? 'gap-0.5' : 'gap-1')}>
      {TOOL_HINTS.map((hint) => (
        <ToolHintButton
          key={hint.toolName}
          hint={hint}
          active={selected === hint.toolName}
          compact={compact}
          onClick={() => onSelect(selected === hint.toolName ? null : hint.toolName)}
        />
      ))}
    </div>
  );
}

function ToolHintButton({ hint, active, compact, onClick }: {
  hint: ToolHint;
  active: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  const Icon = ICON_MAP[hint.icon];

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${active ? 'Deselect' : 'Force'} ${hint.label}${hint.shortcut ? ` (${hint.shortcut})` : ''}`}
      className={cn(
        'flex items-center gap-1 rounded-full border text-xs transition-all',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/30',
      )}
    >
      <Icon size={compact ? 12 : 14} stroke={1.5} />
      {!compact && <span>{hint.label}</span>}
    </button>
  );
}
