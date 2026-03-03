'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { composeLayers } from '@/lib/luv/soul-composer';
import { composeSoulSystemPrompt } from '@/lib/luv-prompt-composer';
import { LAYER_REGISTRY } from '@/lib/luv/soul-layers';
import type { SoulLayer } from '@/lib/luv/soul-layers';
import type { LuvSoulData } from '@/lib/types/luv';
import { cn } from '@/lib/utils';

interface SoulPreviewProps {
  soulData: LuvSoulData;
}

export function SoulPreview({ soulData }: SoulPreviewProps) {
  const { layers, tokenEstimate } = composeLayers(soulData);
  const composedPrompt = composeSoulSystemPrompt(soulData);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Layer breakdown */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Layers</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {layers.length} layers / {tokenEstimate} tokens
          </span>
        </div>
        <div className="space-y-1">
          {layers.map((layer) => (
            <LayerRow key={layer.id} layer={layer} />
          ))}
        </div>
      </section>

      {/* Full composed prompt */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Composed Prompt</h2>
        <pre className="whitespace-pre-wrap rounded-lg border bg-muted p-4 text-sm font-mono max-h-[60vh] overflow-y-auto">
          {composedPrompt}
        </pre>
      </section>
    </div>
  );
}

function LayerRow({ layer }: { layer: SoulLayer }) {
  const [expanded, setExpanded] = useState(false);
  const meta = LAYER_REGISTRY[layer.type];
  const layerTokens = Math.ceil(layer.content.length / 4);

  return (
    <div className="rounded border bg-muted/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        <ChevronRight
          className={cn(
            'size-3 shrink-0 transition-transform',
            expanded && 'rotate-90'
          )}
        />
        <span className="text-muted-foreground tabular-nums w-6">
          {layer.priority}
        </span>
        <span className="font-medium">{meta.label}</span>
        <span className="ml-auto text-muted-foreground tabular-nums text-xs">
          {layerTokens} tokens
        </span>
      </button>
      {expanded && (
        <div className="border-t px-3 py-2">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {layer.content}
          </pre>
        </div>
      )}
    </div>
  );
}
