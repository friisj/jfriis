'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import type { SceneProps } from '@/lib/luv/stage/types';
import { getModuleVariables } from '@/lib/luv/template-engine';
import { useLuvChat } from '../../../components/luv-chat-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenerationResult {
  id: string;
  url: string;
  storagePath: string;
  providerConfig: Record<string, unknown>;
  createdAt: string;
  moduleSnapshot: Record<string, unknown>;
  annotations: ParameterAnnotation[];
}

interface ParameterAnnotation {
  id?: string;
  module_slug: string;
  parameter_key: string;
  rating: 'accurate' | 'inaccurate' | 'uncertain';
  note?: string;
  source: 'human' | 'agent';
}

interface GenerationResultRow {
  id: string;
  storage_path: string;
  provider_config: Record<string, unknown>;
  module_snapshot: Record<string, unknown>;
  created_at: string;
}

interface SavedTemplate {
  id: string;
  module_slug: string;
  name: string;
  version: number;
  template_text: string;
  provider_config: Record<string, unknown>;
  created_at: string;
}

type FluxModel = 'flux-2-dev' | 'flux-2-pro';
type AspectRatio = '1:1' | '16:9' | '9:16' | '3:2' | '2:3' | '4:5' | '5:4' | '3:4' | '4:3';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPublicUrl(storagePath: string) {
  const bucket = storagePath.startsWith('luv/') ? 'cog-images' : 'luv-images';
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** Build a frozen snapshot of scoped module parameters for storage */
function buildModuleSnapshot(
  modules: SceneProps['chassisModules']
): Record<string, Record<string, unknown>> {
  const snapshot: Record<string, Record<string, unknown>> = {};
  for (const mod of modules) {
    snapshot[mod.slug] = mod.parameters;
  }
  return snapshot;
}

/** Extract flat parameter entries from a module snapshot for annotation UI */
function getSnapshotParameters(
  snapshot: Record<string, unknown>,
  moduleSlugs: string[]
): Array<{ moduleSlug: string; key: string; value: unknown }> {
  const params: Array<{ moduleSlug: string; key: string; value: unknown }> = [];
  for (const slug of moduleSlugs) {
    const modParams = snapshot[slug];
    if (modParams && typeof modParams === 'object') {
      for (const [key, value] of Object.entries(modParams as Record<string, unknown>)) {
        if (value !== null && value !== undefined && value !== '') {
          params.push({ moduleSlug: slug, key, value });
        }
      }
    }
  }
  return params;
}

// ---------------------------------------------------------------------------
// Scene Component
// ---------------------------------------------------------------------------

export default function PromptPlaygroundScene({
  chassisModules,
  templateContext,
  focusModule,
}: SceneProps) {
  const { setPageData } = useLuvChat();

  // Prompt state
  const [promptText, setPromptText] = useState('');
  const [templateName, setTemplateName] = useState('');

  // Generation config
  const [activeModel, setActiveModel] = useState<FluxModel>('flux-2-dev');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [count, setCount] = useState(1);

  // Compose state
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [inspectedResult, setInspectedResult] = useState<GenerationResult | null>(null);

  // Saved templates
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Module scope
  const scopedModules = focusModule
    ? chassisModules.filter((m) => m.slug === focusModule)
    : chassisModules;
  const moduleSlugs = scopedModules.map((m) => m.slug);
  const variables = getModuleVariables(templateContext, moduleSlugs);

  // Load past generation results on mount
  const loadResults = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('luv_generation_results')
      .select('*')
      .eq('scene_slug', 'prompt-playground')
      .order('created_at', { ascending: false })
      .limit(20);

    if (focusModule) {
      query = query.contains('module_slugs', [focusModule]);
    }

    const { data } = await query;
    if (!data) return;

    // Load annotations for these results
    const resultIds = (data as GenerationResultRow[]).map((r) => r.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: annotations } = resultIds.length > 0
      ? await (supabase as any)
          .from('luv_parameter_annotations')
          .select('*')
          .in('generation_result_id', resultIds)
      : { data: [] };

    const annotationsByResult = new Map<string, ParameterAnnotation[]>();
    for (const a of (annotations ?? [])) {
      const list = annotationsByResult.get(a.generation_result_id) ?? [];
      list.push(a);
      annotationsByResult.set(a.generation_result_id, list);
    }

    setResults(
      (data as GenerationResultRow[]).map((row) => ({
        id: row.id,
        url: getPublicUrl(row.storage_path),
        storagePath: row.storage_path,
        providerConfig: row.provider_config,
        createdAt: row.created_at,
        moduleSnapshot: row.module_snapshot,
        annotations: annotationsByResult.get(row.id) ?? [],
      }))
    );
  }, [focusModule]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Publish recent result IDs to chat context so the agent can find them
  useEffect(() => {
    if (results.length === 0) return;
    setPageData({
      recentGenerations: results.slice(0, 5).map((r) => ({
        id: r.id,
        promptText: r.providerConfig.model ? `[${r.providerConfig.model}] ` : '' ,
        createdAt: r.createdAt,
      })),
      inspectedResult: inspectedResult ? { id: inspectedResult.id } : null,
    });
  }, [results, inspectedResult, setPageData]);

  // Load saved templates
  const loadTemplates = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('luv_prompt_templates')
      .select('*')
      .order('created_at', { ascending: false });
    setSavedTemplates(data ?? []);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Insert variable at cursor
  function insertVariable(varKey: string) {
    setPromptText((prev) => prev + `{{${varKey}}}`);
  }

  // Compose prompt via Luv
  async function handleCompose() {
    setComposing(true);
    setComposeError(null);
    try {
      const res = await fetch('/api/luv/compose-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleSlugs,
          focusModule: focusModule ?? undefined,
          context: promptText.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setComposeError(err.error || `Compose failed (${res.status})`);
        return;
      }
      const data = await res.json();
      if (data.prompt) {
        setPromptText(data.prompt);
      }
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setComposing(false);
    }
  }

  // Generate images
  async function handleGenerate() {
    if (!promptText.trim()) return;
    setGenerating(true);
    setGenerationError(null);

    const moduleSnapshot = buildModuleSnapshot(scopedModules);

    try {
      const res = await fetch('/api/luv/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText.trim(),
          model: activeModel,
          aspectRatio,
          count,
          sceneSlug: 'prompt-playground',
          moduleSlugs,
          moduleSnapshot,
          promptSource: 'manual',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setGenerationError(err.error || `Generation failed (${res.status})`);
        return;
      }

      const data = await res.json();
      const newResults: GenerationResult[] = (data.images ?? []).map(
        (img: { id: string; url: string; storagePath: string; providerConfig: Record<string, unknown>; createdAt: string }) => ({
          ...img,
          moduleSnapshot,
          annotations: [],
        })
      );
      setResults((prev) => [...newResults, ...prev]);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }

  // Parameter annotation — persisted to DB
  async function annotateParameter(
    resultId: string,
    moduleSlug: string,
    parameterKey: string,
    rating: 'accurate' | 'inaccurate' | 'uncertain',
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('luv_parameter_annotations')
      .upsert(
        {
          generation_result_id: resultId,
          module_slug: moduleSlug,
          parameter_key: parameterKey,
          rating,
          source: 'human',
        },
        { onConflict: 'generation_result_id,module_slug,parameter_key,source' }
      )
      .select()
      .single();

    if (data) {
      setResults((prev) =>
        prev.map((r) => {
          if (r.id !== resultId) return r;
          const existing = r.annotations.filter(
            (a) => !(a.module_slug === moduleSlug && a.parameter_key === parameterKey && a.source === 'human')
          );
          return { ...r, annotations: [...existing, data] };
        })
      );
      // Update inspected result if it's the one being annotated
      if (inspectedResult?.id === resultId) {
        setInspectedResult((prev) => {
          if (!prev) return prev;
          const existing = prev.annotations.filter(
            (a) => !(a.module_slug === moduleSlug && a.parameter_key === parameterKey && a.source === 'human')
          );
          return { ...prev, annotations: [...existing, data] };
        });
      }
    }
  }

  // Save template
  async function handleSaveTemplate() {
    if (!promptText.trim()) return;
    setSavingTemplate(true);

    const name = templateName.trim() || `Prompt ${new Date().toLocaleString()}`;
    const moduleSlug = moduleSlugs[0] ?? 'general';

    const existing = savedTemplates.filter((t) => t.module_slug === moduleSlug);
    const nextVersion = existing.length > 0
      ? Math.max(...existing.map((t) => t.version)) + 1
      : 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('luv_prompt_templates')
      .insert({
        module_slug: moduleSlug,
        name,
        version: nextVersion,
        template_text: promptText,
        provider_config: { model: activeModel, aspectRatio },
      })
      .select()
      .single();

    if (data) {
      setSavedTemplates((prev) => [data, ...prev]);
      setTemplateName('');
    }
    setSavingTemplate(false);
  }

  function loadTemplate(template: SavedTemplate) {
    setPromptText(template.template_text);
    if (template.provider_config.model) {
      setActiveModel(template.provider_config.model as FluxModel);
    }
    if (template.provider_config.aspectRatio) {
      setAspectRatio(template.provider_config.aspectRatio as AspectRatio);
    }
  }

  async function deleteTemplate(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('luv_prompt_templates').delete().eq('id', id);
    setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-5">
      {/* Variable Chips */}
      {variables.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Insert Variable
          </div>
          <div className="flex flex-wrap gap-1">
            {variables.map(({ key, value }) => (
              <button
                key={key}
                type="button"
                onClick={() => insertVariable(key)}
                title={`${key} = ${String(value)}`}
                className="px-2 py-0.5 rounded text-[10px] bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer font-mono"
              >
                {key.replace(/^modules\./, '')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template Editor */}
      <div className="space-y-2">
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Describe the image you want to generate, or ask Luv to compose a prompt..."
          rows={6}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y leading-relaxed"
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name (optional)"
            className="flex-1 rounded-md border bg-background px-2 py-1 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveTemplate}
            disabled={savingTemplate || !promptText.trim()}
          >
            {savingTemplate ? 'Saving...' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCompose}
            disabled={composing}
          >
            {composing ? 'Composing...' : 'Compose with Luv'}
          </Button>
        </div>
        {composeError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
            {composeError}
          </div>
        )}
      </div>

      {/* Generation Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-muted-foreground">Model</label>
          <select
            value={activeModel}
            onChange={(e) => setActiveModel(e.target.value as FluxModel)}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            <option value="flux-2-dev">Flux 2 Dev</option>
            <option value="flux-2-pro">Flux 2 Pro</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-muted-foreground">Ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            {(['1:1', '16:9', '9:16', '3:2', '2:3', '4:5', '5:4', '3:4', '4:3'] as const).map(
              (r) => <option key={r} value={r}>{r}</option>
            )}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-muted-foreground">Count</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generating || !promptText.trim()}
        >
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {generationError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {generationError}
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Results ({results.length})
            </div>
            <button
              type="button"
              onClick={loadResults}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh results (e.g. after Luv annotates)"
            >
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {results.map((result) => {
              const annotationCount = result.annotations.length;
              const inaccurateCount = result.annotations.filter((a) => a.rating === 'inaccurate').length;
              return (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => setInspectedResult(inspectedResult?.id === result.id ? null : result)}
                  className={`relative w-full aspect-square rounded-md overflow-hidden border-2 transition-all ${
                    inspectedResult?.id === result.id
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.url}
                    alt="Generated"
                    className="w-full h-full object-cover"
                  />
                  {/* Annotation summary badge */}
                  {annotationCount > 0 && (
                    <span className={`absolute top-1 right-1 text-[9px] px-1 rounded text-white ${
                      inaccurateCount > 0 ? 'bg-red-500' : 'bg-green-500'
                    }`}>
                      {inaccurateCount > 0 ? `${inaccurateCount} off` : `${annotationCount} ok`}
                    </span>
                  )}
                  {result.providerConfig.seed != null && (
                    <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/60 text-white px-1 rounded font-mono">
                      {String(result.providerConfig.seed)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspected Result — parameter-level annotation */}
      {inspectedResult && (
        <InspectedResultDetail
          result={inspectedResult}
          moduleSlugs={moduleSlugs}
          onAnnotate={annotateParameter}
          onClose={() => setInspectedResult(null)}
        />
      )}

      {/* Saved Templates */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          Saved Templates ({savedTemplates.length}) {showHistory ? '\u25B2' : '\u25BC'}
        </button>
        {showHistory && (
          <div className="space-y-1.5">
            {savedTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                No saved templates yet.
              </p>
            )}
            {savedTemplates.map((t) => (
              <div key={t.id} className="flex items-start gap-2 rounded-md border p-2 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{t.name}</span>
                    <Badge variant="outline" className="text-[9px] shrink-0">v{t.version}</Badge>
                    <Badge variant="outline" className="text-[9px] shrink-0">{t.module_slug}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 font-mono">
                    {t.template_text}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => loadTemplate(t)}>
                    Load
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteTemplate(t.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inspected Result — parameter-level annotations
// ---------------------------------------------------------------------------

function InspectedResultDetail({
  result,
  moduleSlugs,
  onAnnotate,
  onClose,
}: {
  result: GenerationResult;
  moduleSlugs: string[];
  onAnnotate: (resultId: string, moduleSlug: string, paramKey: string, rating: 'accurate' | 'inaccurate' | 'uncertain') => void;
  onClose: () => void;
}) {
  const params = getSnapshotParameters(result.moduleSnapshot, moduleSlugs);

  function getAnnotation(moduleSlug: string, key: string): ParameterAnnotation | undefined {
    return result.annotations.find(
      (a) => a.module_slug === moduleSlug && a.parameter_key === key && a.source === 'human'
    );
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Parameter Review</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={result.url}
        alt="Inspected"
        className="w-full max-h-80 object-contain rounded"
      />

      {/* Generation metadata */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground font-mono">
        <span>Model: {String(result.providerConfig.model)}</span>
        <span>Ratio: {String(result.providerConfig.aspectRatio)}</span>
        <span>Seed: {result.providerConfig.seed != null ? String(result.providerConfig.seed) : 'random'}</span>
        <span>Duration: {String(result.providerConfig.durationMs)}ms</span>
      </div>

      {/* Parameter annotations */}
      {params.length > 0 ? (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Parameter Accuracy
          </div>
          <div className="space-y-0.5">
            {params.map(({ moduleSlug, key, value }) => {
              const annotation = getAnnotation(moduleSlug, key);
              const currentRating = annotation?.rating;

              return (
                <div
                  key={`${moduleSlug}.${key}`}
                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/30 transition-colors"
                >
                  <span className="text-[10px] font-mono text-muted-foreground w-28 truncate shrink-0" title={`${moduleSlug}.${key}`}>
                    {moduleSlug === moduleSlugs[0] && moduleSlugs.length === 1
                      ? key
                      : `${moduleSlug}.${key}`}
                  </span>
                  <span className="text-[10px] flex-1 truncate" title={String(value)}>
                    {String(value)}
                  </span>
                  <div className="flex gap-0.5 shrink-0">
                    {(['accurate', 'inaccurate', 'uncertain'] as const).map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => onAnnotate(result.id, moduleSlug, key, rating)}
                        className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                          currentRating === rating
                            ? rating === 'accurate'
                              ? 'bg-green-500 text-white'
                              : rating === 'inaccurate'
                                ? 'bg-red-500 text-white'
                                : 'bg-yellow-500 text-white'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                      >
                        {rating === 'accurate' ? 'OK' : rating === 'inaccurate' ? 'Off' : '?'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          No module parameters captured for this generation.
        </p>
      )}
    </div>
  );
}
