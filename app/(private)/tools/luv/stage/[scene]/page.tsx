import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { IconArrowLeft, IconAlertTriangle } from '@tabler/icons-react';
import { getSceneBySlugServer } from '@/lib/luv/stage/scenes-server';
import { buildSceneContext } from '@/lib/luv/scene-context';
import {
  getChassisModulesBySlugsServer,
  getChassisModuleMediaServer,
} from '@/lib/luv-chassis-server';
import { StageMount } from '../components/stage-mount';

interface Props {
  params: Promise<{ scene: string }>;
}

export default async function SceneViewerPage({ params }: Props) {
  const { scene: sceneSlug } = await params;
  const descriptor = await getSceneBySlugServer(sceneSlug);

  if (!descriptor) {
    notFound();
  }

  // Fetch only the modules this scene needs (not the full table)
  const neededSlugs = [...descriptor.requiredModules, ...descriptor.optionalModules];
  const modules = await getChassisModulesBySlugsServer(neededSlugs);

  // Fetch media for each resolved module
  const mediaMap = new Map<string, Awaited<ReturnType<typeof getChassisModuleMediaServer>>>();
  await Promise.all(
    modules.map(async (m) => {
      const media = await getChassisModuleMediaServer(m.id);
      mediaMap.set(m.id, media);
    })
  );

  const ctx = buildSceneContext(descriptor, modules, mediaMap);

  return (
    <div className="container px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/tools/luv/stage"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft size={12} className="inline mr-1" />
          Scenes
        </Link>
      </div>

      <div className="space-y-1 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold">{descriptor.name}</h1>
          <Badge variant="outline" className="text-[10px]">
            {descriptor.category}
          </Badge>
          {descriptor.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{descriptor.description}</p>
      </div>

      {ctx.missingRequired.length > 0 && (
        <div className="rounded border border-yellow-500/30 bg-yellow-500/5 p-3 mb-6">
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <IconAlertTriangle size={12} />
            <span>Missing required modules: {ctx.missingRequired.join(', ')}</span>
          </div>
        </div>
      )}

      <StageMount
        componentKey={descriptor.component}
        descriptor={descriptor}
        chassisModules={ctx.modules}
        templateContext={ctx.templateContext}
      />
    </div>
  );
}
