'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import type { SceneProps } from '@/lib/luv/stage/types';
import { getModuleVariables } from '@/lib/luv/template-engine';
import { composeInitialPrompt } from '@/lib/luv/stage/prompt-composer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratedImage {
  url: string;
  storagePath: string;
  metadata: Record<string, unknown>;
  annotation?: 'up' | 'down' | null;
  note?: string;
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
// Scene Component
// ---------------------------------------------------------------------------

export default function PromptPlaygroundScene({
  chassisModules,
  templateContext,
  focusModule,
}: SceneProps) {
  // Prompt state
  const [promptText, setPromptText] = useState('');
  const [templateName, setTemplateName] = useState('');

  // Generation config
  const [activeModel, setActiveModel] = useState<FluxModel>('flux-2-dev');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [count, setCount] = useState(1);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [inspectedImage, setInspectedImage] = useState<GeneratedImage | null>(null);

  // Saved templates
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Module scope — narrow to focus module when mounted from a chassis module tab
  const scopedModules = focusModule
    ? chassisModules.filter((m) => m.slug === focusModule)
    : chassisModules;
  const moduleSlugs = scopedModules.map((m) => m.slug);
  const variables = getModuleVariables(templateContext, moduleSlugs);

  // Auto-compose prompt on mount
  useEffect(() => {
    const initial = composeInitialPrompt(scopedModules);
    setPromptText(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusModule, chassisModules]);

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

  // Generate images
  async function handleGenerate() {
    if (!promptText.trim()) return;
    setGenerating(true);
    setGenerationError(null);

    try {
      const res = await fetch('/api/luv/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText.trim(),
          model: activeModel,
          aspectRatio,
          count,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setGenerationError(err.error || `Generation failed (${res.status})`);
        return;
      }

      const data = await res.json();
      const newImages: GeneratedImage[] = (data.images ?? []).map(
        (img: { url: string; storagePath: string; metadata: Record<string, unknown> }) => ({
          ...img,
          annotation: null,
          note: '',
        })
      );
      setResults((prev) => [...newImages, ...prev]);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }

  // Save template
  async function handleSaveTemplate() {
    if (!promptText.trim()) return;
    setSavingTemplate(true);

    const name = templateName.trim() || `Prompt ${new Date().toLocaleString()}`;
    const moduleSlug = moduleSlugs[0] ?? 'general';

    // Get next version for this module
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

  // Load template
  function loadTemplate(template: SavedTemplate) {
    setPromptText(template.template_text);
    if (template.provider_config.model) {
      setActiveModel(template.provider_config.model as FluxModel);
    }
    if (template.provider_config.aspectRatio) {
      setAspectRatio(template.provider_config.aspectRatio as AspectRatio);
    }
  }

  // Delete template
  async function deleteTemplate(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('luv_prompt_templates').delete().eq('id', id);
    setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  // Annotate image (local only)
  function annotateImage(index: number, annotation: 'up' | 'down' | null) {
    setResults((prev) =>
      prev.map((img, i) =>
        i === index ? { ...img, annotation: img.annotation === annotation ? null : annotation } : img
      )
    );
  }

  return (
    <div className="space-y-5">
      {/* ----------------------------------------------------------------- */}
      {/* Variable Chips                                                     */}
      {/* ----------------------------------------------------------------- */}
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

      {/* ----------------------------------------------------------------- */}
      {/* Template Editor                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-2">
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Describe the image you want to generate..."
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
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Generation Controls                                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Model selector */}
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

        {/* Aspect ratio */}
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-muted-foreground">Ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            {(['1:1', '16:9', '9:16', '3:2', '2:3', '4:5', '5:4', '3:4', '4:3'] as const).map(
              (r) => (
                <option key={r} value={r}>{r}</option>
              )
            )}
          </select>
        </div>

        {/* Count */}
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-muted-foreground">Count</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Generate button */}
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

      {/* ----------------------------------------------------------------- */}
      {/* Results Grid                                                       */}
      {/* ----------------------------------------------------------------- */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Results ({results.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {results.map((img, i) => (
              <div key={`${img.storagePath}-${i}`} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setInspectedImage(inspectedImage === img ? null : img)}
                  className={`relative w-full aspect-square rounded-md overflow-hidden border-2 transition-all ${
                    inspectedImage === img
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Generated ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {img.annotation && (
                    <span className="absolute top-1 right-1 text-sm">
                      {img.annotation === 'up' ? '\u2705' : '\u274C'}
                    </span>
                  )}
                  {img.metadata.seed != null && (
                    <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/60 text-white px-1 rounded font-mono">
                      {String(img.metadata.seed)}
                    </span>
                  )}
                </button>
                {/* Quick annotation buttons */}
                <div className="flex gap-1 justify-center">
                  <button
                    type="button"
                    onClick={() => annotateImage(i, 'up')}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      img.annotation === 'up'
                        ? 'bg-green-500 text-white'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    Good
                  </button>
                  <button
                    type="button"
                    onClick={() => annotateImage(i, 'down')}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      img.annotation === 'down'
                        ? 'bg-red-500 text-white'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    Bad
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Inspected Image Detail                                             */}
      {/* ----------------------------------------------------------------- */}
      {inspectedImage && (
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Image Detail</span>
            <button
              type="button"
              onClick={() => setInspectedImage(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={inspectedImage.url}
            alt="Inspected"
            className="w-full max-h-96 object-contain rounded"
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground font-mono">
            <span>Model: {String(inspectedImage.metadata.model)}</span>
            <span>Ratio: {String(inspectedImage.metadata.aspectRatio)}</span>
            <span>Seed: {inspectedImage.metadata.seed != null ? String(inspectedImage.metadata.seed) : 'random'}</span>
            <span>Duration: {String(inspectedImage.metadata.durationMs)}ms</span>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Prompt History                                                      */}
      {/* ----------------------------------------------------------------- */}
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
                No saved templates yet. Save a prompt to see it here.
              </p>
            )}
            {savedTemplates.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-2 rounded-md border p-2 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{t.name}</span>
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      v{t.version}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {t.module_slug}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 font-mono">
                    {t.template_text}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => loadTemplate(t)}
                  >
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
