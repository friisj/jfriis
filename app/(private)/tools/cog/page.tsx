import { getSeriesServer } from '@/lib/cog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function CogPage() {
  const series = await getSeriesServer();

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Series</h1>
          <p className="text-muted-foreground mt-2">
            Image collections and generation pipelines
          </p>
        </div>
        <Button asChild>
          <Link href="/tools/cog/new">New Series</Link>
        </Button>
      </div>

      {series.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">
            No series yet. Create your first series to get started.
          </p>
          <Button asChild variant="outline">
            <Link href="/tools/cog/new">Create Series</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <Link
              key={s.id}
              href={`/tools/cog/${s.id}`}
              className="block border rounded-lg p-6 hover:bg-muted/50 transition-colors"
            >
              <h2 className="text-lg font-semibold mb-2">{s.title}</h2>
              {s.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {s.description}
                </p>
              )}
              {s.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {s.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-muted rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {s.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{s.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
