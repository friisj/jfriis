'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getAllScenes, type SceneDefinition } from '@/lib/luv/scene-registry';

const CATEGORY_LABELS: Record<SceneDefinition['category'], string> = {
  portrait: 'Portraits',
  figure: 'Figures',
  detail: 'Details',
  composite: 'Composites',
};

const CATEGORY_ORDER: SceneDefinition['category'][] = [
  'portrait',
  'figure',
  'detail',
  'composite',
];

export function ScenePicker() {
  const scenes = getAllScenes();

  // Group by category
  const grouped = new Map<SceneDefinition['category'], SceneDefinition[]>();
  for (const scene of scenes) {
    const group = grouped.get(scene.category) ?? [];
    group.push(scene);
    grouped.set(scene.category, group);
  }

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((category) => (
        <div key={category}>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {CATEGORY_LABELS[category]}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {grouped.get(category)!.map((scene) => (
              <Link
                key={scene.slug}
                href={`/tools/luv/stage/${scene.slug}`}
                className="rounded border p-3 hover:bg-accent/50 transition-colors group"
              >
                <div className="text-xs font-medium group-hover:text-foreground">
                  {scene.name}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {scene.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
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
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
