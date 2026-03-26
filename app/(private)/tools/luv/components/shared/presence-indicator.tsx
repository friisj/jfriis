'use client';

import { cn } from '@/lib/utils';
import type { PresenceSignal } from '../use-luv-presence';

const signalLabels: Record<PresenceSignal['type'], string> = {
  reflecting: 'reflecting',
  analyzing: 'analyzing',
  suggesting: 'has a thought',
  curious: 'curious about something',
};

export function PresenceIndicator({ signal }: { signal: PresenceSignal | null }) {
  if (!signal) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-1.5 text-[11px] text-muted-foreground',
      'animate-in fade-in slide-in-from-bottom-1 duration-500',
    )}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary/60" />
      </span>
      <span className="italic">Luv is {signalLabels[signal.type]}...</span>
    </div>
  );
}
