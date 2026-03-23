'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconChevronRight, IconExternalLink } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface ToolCallCardProps {
  toolName: string;
  state: string;
  result: unknown;
}

interface ImageGenResult {
  type: 'image_generation_result';
  success: boolean;
  imageUrl?: string;
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  durationMs?: number;
  error?: string;
}

function isImageGenResult(v: unknown): v is ImageGenResult {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as Record<string, unknown>).type === 'image_generation_result'
  );
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
  get_current_context: 'Get Current Context',
  generate_image: 'Generate Image',
  list_generations: 'List Generations',
  create_research: 'Create Research Entry',
  update_research: 'Update Research Entry',
  delete_research: 'Delete Research Entry',
  get_research: 'Get Research Entry',
  list_research: 'List Research',
  search_research: 'Search Research',
};

// Tools whose results contain linkable research entries
const researchTools = new Set([
  'create_research',
  'update_research',
  'get_research',
  'list_research',
  'search_research',
]);

interface ResearchEntry {
  id: string;
  kind: string;
  title: string;
}

function isResearchEntry(v: unknown): v is ResearchEntry {
  return (
    typeof v === 'object' &&
    v !== null &&
    'id' in v &&
    'kind' in v &&
    'title' in v &&
    typeof (v as ResearchEntry).id === 'string' &&
    typeof (v as ResearchEntry).title === 'string'
  );
}

function extractLinkableEntries(toolName: string, result: unknown): ResearchEntry[] {
  if (!researchTools.has(toolName) || !result || typeof result !== 'object') return [];

  const r = result as Record<string, unknown>;

  // Single entry (create_research, update_research, get_research)
  if (isResearchEntry(r)) return [r];

  // get_research returns { entry, children }
  if (isResearchEntry(r.entry)) {
    const entries = [r.entry as ResearchEntry];
    if (Array.isArray(r.children)) {
      entries.push(...(r.children as unknown[]).filter(isResearchEntry));
    }
    return entries;
  }

  // list_research / search_research return { entries }
  if (Array.isArray(r.entries)) {
    return (r.entries as unknown[]).filter(isResearchEntry);
  }

  return [];
}

const kindLabels: Record<string, string> = {
  hypothesis: 'Hypothesis',
  experiment: 'Experiment',
  decision: 'Decision',
  insight: 'Insight',
  evidence: 'Evidence',
};

function EntryLink({ entry }: { entry: ResearchEntry }) {
  return (
    <Link
      href={`/tools/luv/research/${entry.id}`}
      className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-accent/50 transition-colors group"
    >
      <span className="text-[10px] text-muted-foreground w-16 shrink-0">
        {kindLabels[entry.kind] ?? entry.kind}
      </span>
      <span className="text-xs truncate flex-1">{entry.title}</span>
      <IconExternalLink
        size={10}
        className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </Link>
  );
}

export function ToolCallCard({ toolName, state, result }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const label = toolLabels[toolName] ?? toolName;
  const isComplete = state === 'output-available';
  const linkableEntries = isComplete ? extractLinkableEntries(toolName, result) : [];
  const imageResult = isComplete && isImageGenResult(result) ? result : null;

  // Auto-expand image generation results
  const showExpanded = expanded || (imageResult?.success && isComplete);

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
            showExpanded && 'rotate-90'
          )}
        />
        <span className="font-medium">{label}</span>
        {!isComplete && (
          <span className="ml-auto text-muted-foreground animate-pulse">
            {toolName === 'generate_image' ? 'generating...' : 'running...'}
          </span>
        )}
        {isComplete && imageResult && !imageResult.success && (
          <span className="ml-auto text-destructive">failed</span>
        )}
        {isComplete && imageResult?.success && imageResult.durationMs && (
          <span className="ml-auto text-muted-foreground">
            {(imageResult.durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {isComplete && linkableEntries.length > 0 && !showExpanded && (
          <span className="ml-auto text-muted-foreground">
            {linkableEntries.length} {linkableEntries.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </button>

      {/* Image generation result — auto-expanded */}
      {showExpanded && imageResult && (
        <div className="border-t">
          {imageResult.success && imageResult.imageUrl ? (
            <div className="p-2 space-y-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageResult.imageUrl}
                alt={imageResult.prompt ?? 'Generated image'}
                className="rounded max-w-full max-h-96 object-contain"
              />
              <div className="flex gap-2 text-[10px] text-muted-foreground">
                {imageResult.model && <span>{imageResult.model.replace('gemini-', '').replace('-preview', '')}</span>}
                {imageResult.aspectRatio && <span>{imageResult.aspectRatio}</span>}
                {imageResult.imageSize && <span>{imageResult.imageSize}</span>}
              </div>
            </div>
          ) : (
            <div className="px-2 py-1.5 text-destructive">
              {imageResult.error ?? 'Image generation failed'}
            </div>
          )}
        </div>
      )}

      {/* Linkable entries shown when expanded */}
      {showExpanded && linkableEntries.length > 0 && (
        <div className="border-t py-1">
          {linkableEntries.map((entry) => (
            <EntryLink key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Raw JSON fallback (not for image results — already rendered above) */}
      {showExpanded && result != null && !imageResult && (
        <div className={cn('border-t px-2 py-1.5 max-h-48 overflow-auto', linkableEntries.length > 0 && 'opacity-50')}>
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
