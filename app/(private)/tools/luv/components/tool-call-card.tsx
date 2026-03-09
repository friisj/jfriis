'use client';

import { useState } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface ToolCallCardProps {
  toolName: string;
  state: string;
  result: unknown;
}

const toolLabels: Record<string, string> = {
  read_soul: 'Read Soul Data',
  read_chassis: 'Read Chassis Data',
  list_references: 'List References',
  list_prompt_templates: 'List Prompt Templates',
  list_chassis_modules: 'List Chassis Modules',
  read_chassis_module: 'Read Chassis Module',
  view_reference_image: 'View Reference Image',
  view_module_media: 'View Module Media',
  review_chassis_module: 'Review Chassis Module',
  compose_context_pack: 'Compose Context Pack',
  evaluate_generation: 'Evaluate Generation',
  create_research: 'Create Research Entry',
  update_research: 'Update Research Entry',
  delete_research: 'Delete Research Entry',
  get_research: 'Get Research Entry',
  list_research: 'List Research',
  search_research: 'Search Research',
};

export function ToolCallCard({ toolName, state, result }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const label = toolLabels[toolName] ?? toolName;
  const isComplete = state === 'output-available';

  return (
    <div className="rounded border bg-muted/50 text-xs my-1">
      <button
        type="button"
        onClick={() => isComplete && setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-1.5 w-full px-2 py-1.5 text-left',
          isComplete && 'hover:bg-muted cursor-pointer'
        )}
        disabled={!isComplete}
      >
        <IconChevronRight
          className={cn(
            'size-3 shrink-0 transition-transform',
            expanded && 'rotate-90'
          )}
        />
        <span className="font-medium">{label}</span>
        {!isComplete && (
          <span className="ml-auto text-muted-foreground animate-pulse">
            running...
          </span>
        )}
      </button>
      {expanded && result != null && (
        <div className="border-t px-2 py-1.5 max-h-48 overflow-auto">
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
