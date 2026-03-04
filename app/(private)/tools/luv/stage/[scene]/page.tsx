import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { getScene } from '@/lib/luv/scene-registry';
import { buildSceneContext } from '@/lib/luv/scene-context';
import {
  getChassisModulesServer,
  getChassisModuleMediaServer,
} from '@/lib/luv-chassis-server';

interface Props {
  params: Promise<{ scene: string }>;
}

export default async function SceneViewerPage({ params }: Props) {
  const { scene: sceneSlug } = await params;
  const sceneDef = getScene(sceneSlug);

  if (!sceneDef) {
    notFound();
  }

  const modules = await getChassisModulesServer();

  // Fetch media for all modules used in this scene
  const mediaMap = new Map<string, Awaited<ReturnType<typeof getChassisModuleMediaServer>>>();
  const neededSlugs = [...sceneDef.requiredModules, ...sceneDef.optionalModules];
  const neededModules = modules.filter((m) => neededSlugs.includes(m.slug));

  await Promise.all(
    neededModules.map(async (m) => {
      const media = await getChassisModuleMediaServer(m.id);
      mediaMap.set(m.id, media);
    })
  );

  const ctx = buildSceneContext(sceneDef, modules, mediaMap);

  return (
    <div className="container px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/tools/luv/stage"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3 inline mr-1" />
          Scenes
        </Link>
      </div>

      <div className="space-y-1 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold">{sceneDef.name}</h1>
          <Badge variant="outline" className="text-[10px]">
            {sceneDef.category}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{sceneDef.description}</p>
      </div>

      {ctx.missingRequired.length > 0 && (
        <div className="rounded border border-yellow-500/30 bg-yellow-500/5 p-3 mb-6">
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-3 w-3" />
            <span>Missing required modules: {ctx.missingRequired.join(', ')}</span>
          </div>
        </div>
      )}

      {/* Module data cards */}
      <div className="space-y-4">
        {ctx.modules.map((mod) => (
          <div key={mod.slug} className="rounded border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{mod.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  v{mod.version}
                </Badge>
              </div>
              <Link
                href={`/tools/luv/chassis/${mod.slug}`}
                className="text-[10px] text-muted-foreground hover:text-foreground underline"
              >
                Edit
              </Link>
            </div>

            {/* Key parameters */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(mod.parameters).slice(0, 8).map(([key, value]) => (
                <div key={key} className="flex items-baseline gap-1 text-[10px]">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="truncate">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                  </span>
                </div>
              ))}
            </div>

            {/* Media thumbnails */}
            {mod.media.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {mod.media.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className="w-12 h-12 rounded border bg-muted text-[8px] text-muted-foreground flex items-center justify-center overflow-hidden"
                    title={m.description ?? m.parameter_key}
                  >
                    {m.parameter_key}
                  </div>
                ))}
                {mod.media.length > 4 && (
                  <div className="w-12 h-12 rounded border bg-muted text-[8px] text-muted-foreground flex items-center justify-center">
                    +{mod.media.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Template context preview */}
      <div className="mt-6 space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Available Template Variables
        </h3>
        <div className="rounded border bg-muted/30 p-3 max-h-48 overflow-auto">
          <pre className="text-[10px] font-mono whitespace-pre-wrap">
            {Object.entries(ctx.templateContext)
              .filter(([k]) => {
                const relevantSlugs = ctx.modules.map((m) => m.slug);
                return relevantSlugs.some((s) => k.startsWith(`modules.${s}`));
              })
              .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join('\n')}
          </pre>
        </div>
      </div>
    </div>
  );
}
