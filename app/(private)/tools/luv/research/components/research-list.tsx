import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { LuvResearch, LuvResearchKind } from '@/lib/types/luv';

const kindLabels: Record<LuvResearchKind, string> = {
  hypothesis: 'Hypothesis',
  experiment: 'Experiment',
  decision: 'Decision',
  insight: 'Insight',
  evidence: 'Evidence',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'outline',
  active: 'default',
  resolved: 'secondary',
  archived: 'outline',
};

export function ResearchList({
  entries,
  showKind = false,
}: {
  entries: LuvResearch[];
  showKind?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4">
        No entries yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <Link
          key={entry.id}
          href={`/tools/luv/research/${entry.id}`}
          className="flex items-start gap-3 rounded border px-3 py-2 hover:bg-accent/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{entry.title}</div>
            {entry.body && (
              <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                {entry.body}
              </div>
            )}
            {entry.tags.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block text-[9px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {showKind && (
              <span className="text-[10px] text-muted-foreground">
                {kindLabels[entry.kind]}
              </span>
            )}
            <Badge
              variant={statusVariant[entry.status] ?? 'outline'}
              className="text-[10px]"
            >
              {entry.status}
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}
