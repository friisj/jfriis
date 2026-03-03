'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { composeLayers } from '@/lib/luv/soul-composer';
import { LAYER_REGISTRY } from '@/lib/luv/soul-layers';
import type { SoulLayer } from '@/lib/luv/soul-layers';
import type { LuvSoulData } from '@/lib/types/luv';
import { cn } from '@/lib/utils';

interface CompositionPreviewProps {
  soulData: LuvSoulData;
  open: boolean;
  onToggle: () => void;
}

export function CompositionPreview({
  soulData,
  open,
  onToggle,
}: CompositionPreviewProps) {
  const { layers, tokenEstimate } = composeLayers(soulData);

  return (
    <div className="border-b shrink-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 w-full px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight
          className={cn('size-3 transition-transform', open && 'rotate-90')}
        />
        <span>System Prompt</span>
        <span className="ml-auto tabular-nums">
          {layers.length} layers / {tokenEstimate} tokens
        </span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1 max-h-64 overflow-auto">
          {layers.map((layer) => (
            <LayerRow key={layer.id} layer={layer} />
          ))}
          <div className="text-[10px] text-muted-foreground pt-1 border-t">
            Total: {tokenEstimate} tokens
          </div>
        </div>
      )}
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
        className="flex items-center gap-1.5 w-full px-2 py-1 text-[10px] hover:bg-muted transition-colors"
      >
        <ChevronRight
          className={cn(
            'size-2.5 shrink-0 transition-transform',
            expanded && 'rotate-90'
          )}
        />
        <span className="text-muted-foreground tabular-nums w-5">
          {layer.priority}
        </span>
        <span className="font-medium">{meta.label}</span>
        <span className="ml-auto text-muted-foreground tabular-nums">
          {layerTokens}t
        </span>
      </button>
      {expanded && (
        <div className="border-t px-2 py-1.5">
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {layer.content}
          </pre>
        </div>
      )}
    </div>
  );
}
