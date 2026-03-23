'use client';

import { composeLayers } from '@/lib/luv/soul-composer';
import { LAYER_REGISTRY } from '@/lib/luv/soul-layers';
import { MODEL_OPTIONS } from '../use-luv-chat-session';
import { RecentConversations } from '../recent-conversations';
import type { LuvSoulData } from '@/lib/types/luv';

interface EmptyStateProps {
  soulData: LuvSoulData;
  modelKey: string;
  thinking: boolean;
  /** Compact display for panel context */
  compact?: boolean;
}

export function EmptyState({ soulData, modelKey, thinking, compact = false }: EmptyStateProps) {
  const { layers, tokenEstimate } = composeLayers(soulData);
  const modelLabel = MODEL_OPTIONS.find((o) => o.key === modelKey)?.label ?? modelKey;

  return (
    <div className={compact ? 'text-center py-4 space-y-3' : 'text-center py-8 space-y-3'}>
      <p className={compact ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>
        {compact ? 'Chat with Luv while you work.' : 'Start a conversation with Luv.'}
      </p>
      <div className="text-left rounded-md border bg-muted/30 px-2.5 py-2 space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground">
          {modelLabel}{thinking ? ' \u00b7 thinking' : ''} \u00b7 {layers.length} layers \u00b7 {tokenEstimate} tokens
        </p>
        <div className="flex flex-wrap gap-1">
          {layers.map((layer) => {
            const meta = LAYER_REGISTRY[layer.type];
            return (
              <span
                key={layer.id}
                className="inline-block text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
              >
                {meta?.label ?? layer.type}
              </span>
            );
          })}
        </div>
      </div>
      <RecentConversations compact={compact} />
    </div>
  );
}
