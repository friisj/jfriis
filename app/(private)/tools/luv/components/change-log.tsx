'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { ChassisChangeEntry } from '@/lib/luv-chassis-server';

interface ChangeLogProps {
  entries: ChassisChangeEntry[];
}

export function ChangeLog({ entries }: ChangeLogProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
    );
  }

  // Group by date
  const grouped = new Map<string, ChassisChangeEntry[]>();
  for (const entry of entries) {
    const dateKey = new Date(entry.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const group = grouped.get(dateKey) ?? [];
    group.push(entry);
    grouped.set(dateKey, group);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped).map(([date, group]) => (
        <div key={date}>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
            {date}
          </h3>
          <div className="space-y-1">
            {group.map((entry) => (
              <div
                key={entry.version_id}
                className="flex items-center gap-3 rounded border px-3 py-2"
              >
                <Link
                  href={`/tools/luv/chassis/${entry.module_slug}`}
                  className="text-xs font-medium hover:underline"
                >
                  {entry.module_name}
                </Link>
                <Badge variant="outline" className="text-[10px]">
                  v{entry.version}
                </Badge>
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  {entry.change_summary ?? 'No summary'}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {new Date(entry.created_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
