import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { SceneDescriptor, SceneCategory } from '@/lib/luv/stage/types';

const CATEGORY_LABELS: Record<SceneCategory, string> = {
  diagnostic: 'Diagnostic',
  generative: 'Generative',
  spatial: 'Spatial',
  temporal: 'Temporal',
  instrument: 'Instruments',
  composite: 'Composites',
};

const CATEGORY_ORDER: SceneCategory[] = [
  'generative',
  'diagnostic',
  'spatial',
  'temporal',
  'instrument',
  'composite',
];

interface ScenePickerProps {
  scenes: SceneDescriptor[];
}

export function ScenePicker({ scenes }: ScenePickerProps) {
  // Group by category
  const grouped = new Map<SceneCategory, SceneDescriptor[]>();
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
