'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconPlayerStop, IconAlertTriangle } from '@tabler/icons-react';
import { useLuvChat } from '../../components/luv-chat-context';
import { getScenes, getScenesForModule } from '@/lib/luv/stage/scenes-client';
import { getChassisModules, getChassisModuleMedia } from '@/lib/luv-chassis';
import { buildSceneContext, type ModuleContext } from '@/lib/luv/scene-context';
import { getSceneComponent } from '@/lib/luv/stage/component-registry';
import type { SceneDescriptor, SceneCategory } from '@/lib/luv/stage/types';
import type { TemplateContext } from '@/lib/luv/template-engine';
import type { LuvChassisModule, LuvChassisModuleMedia } from '@/lib/types/luv-chassis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlayerState = 'empty' | 'loading' | 'ready' | 'error';

interface ResolvedScene {
  descriptor: SceneDescriptor;
  modules: ModuleContext[];
  templateContext: TemplateContext;
  missingRequired: string[];
}

interface StagePlayerProps {
  /** Pre-load a specific scene on mount */
  initialSceneSlug?: string;
  /** Constrain available scenes to these slugs */
  constrainToScenes?: string[];
  /** Constrain to scenes that reference this module */
  constrainToModule?: string;
  /** Compact mode for embedding (no header chrome) */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Category helpers (shared with scene-picker)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<SceneCategory, string> = {
  diagnostic: 'Diagnostic',
  generative: 'Generative',
  spatial: 'Spatial',
  temporal: 'Temporal',
  instrument: 'Instruments',
  composite: 'Composites',
};

const CATEGORY_ORDER: SceneCategory[] = [
  'generative', 'diagnostic', 'spatial', 'temporal', 'instrument', 'composite',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StagePlayer({
  initialSceneSlug,
  constrainToScenes,
  constrainToModule,
  compact = false,
}: StagePlayerProps) {
  const { setPageData } = useLuvChat();

  const [playerState, setPlayerState] = useState<PlayerState>('empty');
  const [scenes, setScenes] = useState<SceneDescriptor[]>([]);
  const [activeScene, setActiveScene] = useState<ResolvedScene | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available scenes based on constraints
  useEffect(() => {
    (async () => {
      try {
        let fetched: SceneDescriptor[];
        if (constrainToModule) {
          fetched = await getScenesForModule(constrainToModule);
        } else {
          fetched = await getScenes();
        }
        if (constrainToScenes) {
          const allowed = new Set(constrainToScenes);
          fetched = fetched.filter((s) => allowed.has(s.slug));
        }
        setScenes(fetched);
      } catch (err) {
        console.error('Failed to fetch scenes:', err);
        setScenes([]);
      }
    })();
  }, [constrainToScenes, constrainToModule]);

  // Load initial scene if specified
  useEffect(() => {
    if (initialSceneSlug && scenes.length > 0) {
      const scene = scenes.find((s) => s.slug === initialSceneSlug);
      if (scene) loadScene(scene);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSceneSlug, scenes]);

  // Publish active scene to chat agent
  useEffect(() => {
    if (!activeScene) return;
    setPageData({
      activeScene: {
        slug: activeScene.descriptor.slug,
        name: activeScene.descriptor.name,
        category: activeScene.descriptor.category,
        status: activeScene.descriptor.status,
      },
    });
    return () => setPageData(null);
  }, [activeScene, setPageData]);

  const loadScene = useCallback(async (descriptor: SceneDescriptor) => {
    setPlayerState('loading');
    setError(null);
    try {
      const neededSlugs = [...descriptor.requiredModules, ...descriptor.optionalModules];
      const allModules = await getChassisModules();
      const moduleMap = new Map(allModules.map((m) => [m.slug, m]));
      const neededModules = neededSlugs
        .map((s) => moduleMap.get(s))
        .filter((m): m is LuvChassisModule => !!m);

      const mediaMap = new Map<string, LuvChassisModuleMedia[]>();
      await Promise.all(
        neededModules.map(async (m) => {
          const media = await getChassisModuleMedia(m.id);
          mediaMap.set(m.id, media);
        })
      );

      const ctx = buildSceneContext(descriptor, neededModules, mediaMap);
      setActiveScene({
        descriptor,
        modules: ctx.modules,
        templateContext: ctx.templateContext,
        missingRequired: ctx.missingRequired,
      });
      setPlayerState('ready');
    } catch (err) {
      console.error('Failed to load scene:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scene');
      setPlayerState('error');
    }
  }, []);

  const unloadScene = useCallback(() => {
    setActiveScene(null);
    setPlayerState('empty');
    setError(null);
  }, []);

  // -------------------------------------------------------------------------
  // Render: Error
  // -------------------------------------------------------------------------
  if (playerState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-xs text-destructive mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={unloadScene}>
          Back
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Loading
  // -------------------------------------------------------------------------
  if (playerState === 'loading') {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-xs text-muted-foreground animate-pulse">Loading scene...</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Active scene
  // -------------------------------------------------------------------------
  if (playerState === 'ready' && activeScene) {
    const SceneComponent = getSceneComponent(activeScene.descriptor.component);

    return (
      <div className="flex flex-col h-full">
        {/* Player toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-background shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-medium truncate">
              {activeScene.descriptor.name}
            </span>
            <Badge variant="outline" className="text-[9px] shrink-0">
              {activeScene.descriptor.category}
            </Badge>
            {activeScene.descriptor.status !== 'stable' && (
              <Badge variant="secondary" className="text-[9px] shrink-0">
                {activeScene.descriptor.status}
              </Badge>
            )}
          </div>
          {/* Scene switcher — show other available scenes */}
          {scenes.length > 1 && (
            <select
              className="text-[10px] bg-transparent border rounded px-1.5 py-0.5 text-muted-foreground"
              value={activeScene.descriptor.slug}
              onChange={(e) => {
                const scene = scenes.find((s) => s.slug === e.target.value);
                if (scene) loadScene(scene);
              }}
            >
              {scenes.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={unloadScene}
            title="Unload scene"
          >
            <IconPlayerStop size={12} />
          </Button>
        </div>

        {/* Missing modules warning */}
        {activeScene.missingRequired.length > 0 && (
          <div className="px-4 py-2 border-b bg-yellow-500/5">
            <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <IconAlertTriangle size={12} />
              <span>Missing required modules: {activeScene.missingRequired.join(', ')}</span>
            </div>
          </div>
        )}

        {/* Scene viewport */}
        <div className="flex-1 overflow-auto">
          {SceneComponent ? (
            <SceneComponent
              descriptor={activeScene.descriptor}
              chassisModules={activeScene.modules}
              templateContext={activeScene.templateContext}
            />
          ) : (
            <div className="flex items-center justify-center p-8 text-center">
              <div>
                <p className="text-xs text-muted-foreground">
                  Scene component &ldquo;{activeScene.descriptor.component}&rdquo; is not registered.
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Status: {activeScene.descriptor.status}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Empty state (scene picker)
  // -------------------------------------------------------------------------
  const grouped = new Map<SceneCategory, SceneDescriptor[]>();
  for (const scene of scenes) {
    const group = grouped.get(scene.category) ?? [];
    group.push(scene);
    grouped.set(scene.category, group);
  }

  if (scenes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-xs text-muted-foreground">
          {constrainToModule
            ? 'No scenes reference this module.'
            : 'No scenes available.'}
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? 'p-4' : 'px-6 py-8 max-w-xl'}>
      {!compact && (
        <div className="space-y-1 mb-6">
          <h1 className="text-sm font-semibold">Stage</h1>
          <p className="text-xs text-muted-foreground">
            Select a scene to load.
          </p>
        </div>
      )}
      <div className="space-y-4">
        {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((category) => (
          <div key={category}>
            <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="space-y-1">
              {grouped.get(category)!.map((scene) => (
                <button
                  key={scene.slug}
                  type="button"
                  onClick={() => loadScene(scene)}
                  className="w-full text-left rounded border p-2.5 hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium group-hover:text-foreground">
                      {scene.name}
                    </span>
                    {scene.status !== 'stable' && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        {scene.status}
                      </Badge>
                    )}
                  </div>
                  {scene.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {scene.description}
                    </p>
                  )}
                  {(scene.requiredModules.length > 0 || scene.optionalModules.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {scene.requiredModules.map((m) => (
                        <Badge key={m} variant="outline" className="text-[9px] px-1 py-0">
                          {m}
                        </Badge>
                      ))}
                      {scene.optionalModules.map((m) => (
                        <Badge key={m} variant="outline" className="text-[9px] px-1 py-0 opacity-50">
                          {m}?
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
