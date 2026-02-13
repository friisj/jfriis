import { getSeriesByIdServer } from '@/lib/cog-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ThinkingBuilderForm } from './thinking-builder-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewThinkingPage({ params }: Props) {
  const { id: seriesId } = await params;

  let series;
  try {
    series = await getSeriesByIdServer(seriesId);
  } catch {
    notFound();
  }

  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/tools/cog" className="hover:text-foreground">
            Series
          </Link>
          <span>/</span>
          <Link href={`/tools/cog/${seriesId}`} className="hover:text-foreground">
            {series.title}
          </Link>
          <span>/</span>
          <span className="text-foreground">New Thinking</span>
        </div>
        <h1 className="text-3xl font-bold">Create Thinking Job</h1>
        <p className="text-muted-foreground mt-2">
          Generate an image through a 3-step thinking chain: story to subject to creative direction to image
        </p>
      </div>

      <ThinkingBuilderForm seriesId={seriesId} />
    </div>
  );
}
