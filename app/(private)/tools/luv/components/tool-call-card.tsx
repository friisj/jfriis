'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconChevronRight, IconExternalLink } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { ImageLightbox } from './shared/image-lightbox';
import { ImageBadge } from './shared/image-badge';
import { ChatImageMenu } from './shared/chat-image-menu';

interface ToolCallCardProps {
  toolName: string;
  state: string;
  result: unknown;
  getImageIndex?: (url: string) => number | null;
  onInsertImageRef?: (index: number) => void;
}

interface ImageGenResult {
  type: 'image_generation_result';
  success: boolean;
  imageUrl?: string;
  cogImageId?: string;
  cogSeriesId?: string;
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  durationMs?: number;
  error?: string;
}

interface ChassisStudyResult {
  type: 'chassis_study_result';
  success: boolean;
  studyId?: string;
  imageUrl?: string;
  brief?: { description?: string };
  generationPrompt?: string;
  moduleSlugs?: string[];
  durationMs?: number;
  deliberation?: {
    rounds: number;
    totalDurationMs: number;
    summary: string[];
  };
  error?: string;
  errorDetail?: string;
}

function isImageGenResult(v: unknown): v is ImageGenResult {
  if (typeof v !== 'object' || v === null) return false;
  const type = (v as Record<string, unknown>).type;
  return type === 'image_generation_result' || type === 'sketch_study_result';
}

/** Generic check for tool results containing an images array with URLs */
function extractImageUrls(v: unknown): { url: string; filename?: string }[] {
  if (typeof v !== 'object' || v === null) return [];
  const r = v as Record<string, unknown>;
  if (!Array.isArray(r.images)) return [];
  return (r.images as Array<Record<string, unknown>>)
    .filter((img) => typeof img.url === 'string')
    .map((img) => ({ url: img.url as string, filename: img.filename as string | undefined }));
}

interface VideoJobResult {
  type: 'video_job_result' | 'video_job_started';
  success: boolean;
  jobId?: string;
  status?: string;
  videoUrl?: string;
  provider?: string;
  durationMs?: number;
  error?: string;
  message?: string;
}

function isVideoResult(v: unknown): v is VideoJobResult {
  return (
    typeof v === 'object' &&
    v !== null &&
    ((v as Record<string, unknown>).type === 'video_job_result' ||
     (v as Record<string, unknown>).type === 'video_job_started')
  );
}

function isChassisStudyResult(v: unknown): v is ChassisStudyResult {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as Record<string, unknown>).type === 'chassis_study_result'
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
  list_image_series: 'List Image Series',
  fetch_series_images: 'Fetch Series Images',
  move_image: 'Move Image',
  copy_image: 'Copy Image',
  tag_image: 'Tag Image',
  create_image_series: 'Create Image Series',
  set_series_cover: 'Set Series Cover',
  run_chassis_study: 'Chassis Study',
  record_study_feedback: 'Record Feedback',
  list_chassis_studies: 'List Studies',
  run_sketch_study: 'Sketch Study',
  list_sketches: 'List Sketches',
  start_video_generation: 'Video Generation',
  check_video_generation: 'Check Video',
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

export function ToolCallCard({ toolName, state, result, getImageIndex, onInsertImageRef }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [userCollapsed, setUserCollapsed] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const label = toolLabels[toolName] ?? toolName;
  const isComplete = state === 'output-available';
  const linkableEntries = isComplete ? extractLinkableEntries(toolName, result) : [];
  const imageResult = isComplete && isImageGenResult(result) ? result : null;
  const studyResult = isComplete && isChassisStudyResult(result) ? result : null;
  const videoResult = isComplete && isVideoResult(result) ? result : null;
  const toolImages = isComplete ? extractImageUrls(result) : [];

  // Auto-expand image/study/video results or tool results with images (unless user explicitly collapsed)
  const showExpanded = expanded || (!userCollapsed && isComplete && (imageResult?.success || studyResult?.success || (videoResult?.success && videoResult?.videoUrl) || toolImages.length > 0));

  return (
    <div className="rounded-md border bg-muted/50 text-xs my-1">
      <button
        type="button"
        onClick={() => {
          if (!isComplete) return;
          if (showExpanded) {
            setExpanded(false);
            setUserCollapsed(true);
          } else {
            setExpanded(true);
            setUserCollapsed(false);
          }
        }}
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
            {toolName === 'generate_image' ? 'generating...'
              : toolName === 'run_chassis_study' ? 'deliberating...'
              : toolName === 'start_video_generation' ? 'submitting...'
              : toolName === 'check_video_generation' ? 'rendering...'
              : 'running...'}
          </span>
        )}
        {isComplete && (imageResult && !imageResult.success || studyResult && !studyResult.success) && (
          <span className="ml-auto text-destructive">failed</span>
        )}
        {isComplete && imageResult?.success && imageResult.durationMs && (
          <span className="ml-auto text-muted-foreground">
            {(imageResult.durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {isComplete && studyResult?.success && studyResult.durationMs && (
          <span className="ml-auto text-muted-foreground">
            {(studyResult.durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {isComplete && toolImages.length > 0 && !imageResult && !studyResult && (
          <span className="ml-auto text-muted-foreground">
            {toolImages.length} {toolImages.length === 1 ? 'image' : 'images'}
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
            <div className="p-2 space-y-2">
              <ChatImageMenu src={imageResult.imageUrl!} cogImageId={imageResult.cogImageId}>
                <button type="button" onClick={() => setLightboxSrc(imageResult.imageUrl!)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageResult.imageUrl}
                    alt={imageResult.prompt ?? 'Generated image'}
                    className="rounded-sm max-w-full max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </button>
                {(() => { const idx = getImageIndex?.(imageResult.imageUrl!); return idx ? <ImageBadge index={idx} onInsertReference={onInsertImageRef} /> : null; })()}
              </ChatImageMenu>
              <div className="flex gap-2 text-[10px] font-mono text-muted-foreground">
                {imageResult.model && <span>{imageResult.model.replace('gemini-', '').replace('-preview', '')}</span>}
                {imageResult.aspectRatio && <span>{imageResult.aspectRatio}</span>}
                {imageResult.imageSize && <span>{imageResult.imageSize}</span>}
              </div>
            </div>
          ) : (
            <div className="px-2 py-1.5 text-destructive font-mono">
              {imageResult.error ?? 'Image generation failed'}
            </div>
          )}
        </div>
      )}

      {/* Chassis study result — auto-expanded */}
      {showExpanded && studyResult && (
        <div className="border-t">
          {studyResult.success && studyResult.imageUrl ? (
            <div className="p-2 space-y-2">
              <ChatImageMenu src={studyResult.imageUrl!} cogImageId={studyResult.studyId}>
                <button type="button" onClick={() => setLightboxSrc(studyResult.imageUrl!)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={studyResult.imageUrl}
                    alt={studyResult.brief?.description ?? 'Study image'}
                    className="rounded max-w-full max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </button>
                {(() => { const idx = getImageIndex?.(studyResult.imageUrl!); return idx ? <ImageBadge index={idx} onInsertReference={onInsertImageRef} /> : null; })()}
              </ChatImageMenu>
              {studyResult.deliberation && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Deliberation ({studyResult.deliberation.rounds} turns · {(studyResult.deliberation.totalDurationMs / 1000).toFixed(1)}s)
                  </p>
                  {studyResult.deliberation.summary.map((line, i) => {
                    const isLuv = line.startsWith('[luv]');
                    const isDir = line.startsWith('[director]');
                    const content = line.replace(/^\[(luv|director)\]\s*/, '');
                    return (
                      <div key={i} className={cn(
                        'text-[10px] px-2 py-1 rounded',
                        isLuv && 'bg-primary/5 border-l-2 border-primary/30',
                        isDir && 'bg-muted border-l-2 border-muted-foreground/30',
                      )}>
                        <span className="font-medium">{isLuv ? 'Luv' : isDir ? 'Director' : ''}: </span>
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2 text-[10px] text-muted-foreground">
                {studyResult.moduleSlugs && <span>{studyResult.moduleSlugs.join(', ')}</span>}
              </div>
            </div>
          ) : (
            <div className="px-2 py-1.5 text-destructive space-y-1">
              <p>{studyResult.error ?? 'Chassis study failed'}</p>
              {studyResult.errorDetail && (
                <pre className="text-[9px] text-muted-foreground whitespace-pre-wrap">{studyResult.errorDetail}</pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Video generation result — auto-expanded with inline player */}
      {showExpanded && videoResult && (
        <div className="border-t">
          {videoResult.success && videoResult.videoUrl ? (
            <div className="p-2 space-y-2">
              { }
              <video
                src={videoResult.videoUrl}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="rounded-sm max-w-full max-h-96"
              />
              <div className="flex gap-2 text-[10px] font-mono text-muted-foreground">
                {videoResult.provider && <span>{videoResult.provider}</span>}
                {videoResult.durationMs && <span>{(videoResult.durationMs / 1000).toFixed(1)}s</span>}
                {videoResult.status === 'timeout' && <span className="text-amber-500">timed out — check again</span>}
              </div>
            </div>
          ) : videoResult.status === 'timeout' ? (
            <div className="px-2 py-1.5 text-amber-500 text-[10px]">
              Still rendering — call check_video_generation again
            </div>
          ) : videoResult.error ? (
            <div className="px-2 py-1.5 text-destructive font-mono text-[10px]">
              {videoResult.error}
            </div>
          ) : null}
        </div>
      )}

      {/* Generic image grid for tools returning images with URLs */}
      {showExpanded && toolImages.length > 0 && !imageResult && !studyResult && (
        <div className="border-t p-2">
          <div className="overflow-x-scroll h-48">
            <div className="flex gap-2">
              {toolImages.map((img, i) => {
                const idx = getImageIndex?.(img.url);
                return (
                  <ChatImageMenu key={i} src={img.url}>
                    <button type="button" onClick={() => setLightboxSrc(img.url)} className="h-48 w-32 bg-secondary rounded-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.filename ?? `Image ${i + 1}`}
                        className="max-h-48 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </button>
                    {idx && <ImageBadge index={idx} onInsertReference={onInsertImageRef} />}
                  </ChatImageMenu>
                );
              })}
            </div>
          </div>
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

      {/* Raw JSON fallback (not for image/video results — already rendered above) */}
      {showExpanded && result != null && !imageResult && !videoResult && (
        <div className={cn('border-t px-2 py-1.5 max-h-48 overflow-auto', linkableEntries.length > 0 && 'opacity-50')}>
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
