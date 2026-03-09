import { listLuvResearchServer } from '@/lib/luv-research-server';
import { ResearchList } from '../components/research-list';

export default async function InsightsPage() {
  const entries = await listLuvResearchServer({ kind: 'insight' });

  return (
    <div className="px-4 py-8 max-w-xl">
      <div className="space-y-1 mb-6">
        <h1 className="text-sm font-semibold">Insights</h1>
        <p className="text-xs text-muted-foreground">
          Observations and learnings from working with Luv.
        </p>
      </div>
      <ResearchList entries={entries} />
    </div>
  );
}
