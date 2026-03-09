'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getModuleVariables } from '@/lib/luv/template-engine';
import type { SceneProps } from '@/lib/luv/stage/types';

export default function GenerativePromptScene({
  chassisModules,
  templateContext,
}: SceneProps) {
  const moduleSlugs = useMemo(() => chassisModules.map((m) => m.slug), [chassisModules]);
  const variables = useMemo(
    () => getModuleVariables(templateContext, moduleSlugs),
    [templateContext, moduleSlugs]
  );

  return (
    <div className="space-y-4">
      {/* Module data cards */}
      {chassisModules.map((mod) => (
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
            {Object.entries(mod.parameters)
              .slice(0, 8)
              .map(([key, value]) => (
                <div key={key} className="flex items-baseline gap-1 text-[10px]">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="truncate">
                    {typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value ?? '')}
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

      {/* Template context preview */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Available Template Variables
        </h3>
        <div className="rounded border bg-muted/30 p-3 max-h-48 overflow-auto">
          <pre className="text-[10px] font-mono whitespace-pre-wrap">
            {variables
              .map(({ key, value }) =>
                `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
              )
              .join('\n')}
          </pre>
        </div>
      </div>
    </div>
  );
}
