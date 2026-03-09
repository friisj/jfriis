import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { getStudiesServer } from '@/lib/luv-chassis-server';

export default async function StudiesListPage() {
  const studies = await getStudiesServer();

  return (
    <div className="container px-4 py-8 max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Chassis Studies</h2>
        <Link href="/tools/luv/studies/new">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <IconPlus size={12} className="mr-1" />
            New Study
          </Button>
        </Link>
      </div>

      {studies.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No studies yet. Create one to begin anatomical explorations.
        </p>
      ) : (
        <div className="space-y-1">
          {studies.map((study) => (
            <Link
              key={study.id}
              href={`/tools/luv/studies/${study.slug}`}
              className="flex items-center gap-3 rounded border px-3 py-2 hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{study.title}</div>
                {study.focus_area && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    {study.focus_area}
                  </div>
                )}
              </div>
              <Badge
                variant={study.status === 'completed' ? 'default' : 'outline'}
                className="text-[10px]"
              >
                {study.status === 'completed' ? 'Done' : 'In Progress'}
              </Badge>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {study.findings.length} findings
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
