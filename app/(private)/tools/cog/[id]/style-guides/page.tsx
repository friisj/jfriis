import { getSeriesStyleGuidesServer, getSeriesByIdServer } from '@/lib/cog-server';
import { createClient } from '@/lib/supabase-server';
import { StyleGuideList } from './style-guide-list';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StyleGuidesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [series, styleGuides, { data: { user } }] = await Promise.all([
    getSeriesByIdServer(id),
    getSeriesStyleGuidesServer(id),
    supabase.auth.getUser(),
  ]);

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Style Guides</h1>
        <p className="text-muted-foreground">
          Reusable system prompts for {series.title}
        </p>
      </div>

      <StyleGuideList
        styleGuides={styleGuides}
        seriesId={id}
        userId={user.id}
      />
    </div>
  );
}
