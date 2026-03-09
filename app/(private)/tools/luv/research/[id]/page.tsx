import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  getLuvResearchWithChildrenServer,
  getLuvResearchServer,
} from '@/lib/luv-research-server';
import type { LuvResearch, LuvResearchKind } from '@/lib/types/luv';
import { ResearchList } from '../components/research-list';

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

function MetadataSection({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );
  if (entries.length === 0) return null;

  return (
    <div className="rounded border bg-muted/30 px-3 py-2 space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Metadata
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-muted-foreground">{key.replace(/_/g, ' ')}</dt>
            <dd className="text-foreground">
              {typeof value === 'string' ? value : JSON.stringify(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

async function ParentBreadcrumb({ parentId }: { parentId: string }) {
  const parent = await getLuvResearchServer(parentId);
  if (!parent) return null;

  return (
    <div className="text-[10px] text-muted-foreground">
      Child of{' '}
      <Link
        href={`/tools/luv/research/${parent.id}`}
        className="underline hover:text-foreground"
      >
        {parent.title}
      </Link>
      <span className="ml-1 opacity-60">({kindLabels[parent.kind]})</span>
    </div>
  );
}

function EntryDetail({ entry }: { entry: LuvResearch }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {kindLabels[entry.kind]}
          </span>
          <Badge
            variant={statusVariant[entry.status] ?? 'outline'}
            className="text-[10px]"
          >
            {entry.status}
          </Badge>
        </div>
        <h1 className="text-sm font-semibold">{entry.title}</h1>
        {entry.parent_id && <ParentBreadcrumb parentId={entry.parent_id} />}
      </div>

      {entry.body && (
        <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
          {entry.body}
        </div>
      )}

      {entry.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <MetadataSection metadata={entry.metadata} />

      <div className="text-[10px] text-muted-foreground">
        Created {new Date(entry.created_at).toLocaleDateString()} · Updated{' '}
        {new Date(entry.updated_at).toLocaleDateString()}
      </div>
    </div>
  );
}

export default async function ResearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getLuvResearchWithChildrenServer(id);
  if (!result) notFound();

  const { entry, children } = result;

  return (
    <div className="px-4 py-8 max-w-xl">
      <div className="mb-2">
        <Link
          href="/tools/luv/research"
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          &larr; Research
        </Link>
      </div>

      <EntryDetail entry={entry} />

      {children.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-medium mb-2 text-muted-foreground">
            Linked entries
          </h2>
          <ResearchList entries={children} showKind />
        </div>
      )}
    </div>
  );
}
