import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getLuvArtifactBySlugServer } from '@/lib/luv-artifacts-server';
import { ArtifactContent } from './artifact-content';

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  published: 'default',
  archived: 'secondary',
};

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = await getLuvArtifactBySlugServer(slug);
  if (!artifact) notFound();

  return (
    <div className="px-4 py-8 max-w-2xl">
      <div className="mb-2">
        <Link
          href="/tools/luv/artifacts"
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          &larr; Artifacts
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant={statusVariant[artifact.status] ?? 'outline'}
              className="text-[10px]"
            >
              {artifact.status}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              v{artifact.version}
            </span>
          </div>
          <h1 className="text-sm font-semibold">{artifact.title}</h1>
        </div>

        {artifact.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {artifact.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <ArtifactContent content={artifact.content} />

        <div className="text-[10px] text-muted-foreground">
          Created {new Date(artifact.created_at).toLocaleDateString()} · Updated{' '}
          {new Date(artifact.updated_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
