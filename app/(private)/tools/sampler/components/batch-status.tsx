'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X } from 'lucide-react';
import type { BatchItem } from '@/lib/types/sampler';

interface BatchStatusProps {
  items: BatchItem[];
  onCancel: () => void;
  onDismiss: () => void;
}

export function BatchStatus({ items, onCancel, onDismiss }: BatchStatusProps) {
  const done = items.filter((i) => i.status === 'done').length;
  const errors = items.filter((i) => i.status === 'error').length;
  const generating = items.filter((i) => i.status === 'generating').length;
  const total = items.length;
  const isComplete = done + errors === total;
  const progress = total > 0 ? ((done + errors) / total) * 100 : 0;

  return (
    <div className="p-4 border-b bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Batch Generation
          {isComplete
            ? errors > 0
              ? ` — ${done} completed, ${errors} failed`
              : ` — Complete`
            : ` — ${done}/${total}`}
          {generating > 0 && !isComplete && (
            <span className="text-muted-foreground"> ({generating} in progress)</span>
          )}
        </div>
        {isComplete ? (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="size-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      <Progress value={progress} />

      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <div
            key={item.index}
            title={item.label || item.prompt.slice(0, 40)}
            className={`size-3 rounded-full transition-colors ${
              item.status === 'done'
                ? 'bg-green-500'
                : item.status === 'generating'
                  ? 'bg-blue-500 animate-pulse'
                  : item.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
