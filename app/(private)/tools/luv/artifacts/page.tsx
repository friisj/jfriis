import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { listLuvArtifactsServer } from '@/lib/luv-artifacts-server';
import type { LuvArtifact } from '@/lib/types/luv';

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  published: 'default',
  archived: 'secondary',
};

function ArtifactRow({ artifact }: { artifact: LuvArtifact }) {
  return (
    <Link
      href={`/tools/luv/artifacts/${artifact.slug}`}
      className="flex items-start gap-3 rounded border px-3 py-2 hover:bg-accent/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{artifact.title}</div>
        {artifact.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {artifact.tags.map((tag) => (
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
        <span className="text-[10px] text-muted-foreground">
          v{artifact.version}
        </span>
        <Badge
          variant={statusVariant[artifact.status] ?? 'outline'}
          className="text-[10px]"
        >
          {artifact.status}
        </Badge>
      </div>
    </Link>
  );
}

export default async function ArtifactsPage() {
  const artifacts = await listLuvArtifactsServer();

  return (
    <div className="px-4 py-8 max-w-xl">
      <div className="space-y-1 mb-6">
        <h1 className="text-sm font-semibold">Artifacts</h1>
        <p className="text-xs text-muted-foreground">
          Documents created by Luv — character briefs, style guides, analyses, and reference sheets.
        </p>
      </div>
      {artifacts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4">
          No artifacts yet. Ask Luv to create one via chat.
        </p>
      ) : (
        <div className="space-y-1">
          {artifacts.map((artifact) => (
            <ArtifactRow key={artifact.id} artifact={artifact} />
          ))}
        </div>
      )}
    </div>
  );
}
