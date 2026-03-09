import { listLuvResearchServer } from '@/lib/luv-research-server';
import { ResearchList } from '../components/research-list';

export default async function ExperimentsPage() {
  const entries = await listLuvResearchServer({ kind: 'experiment' });

  return (
    <div className="px-4 py-8 max-w-xl">
      <div className="space-y-1 mb-6">
        <h1 className="text-sm font-semibold">Experiments</h1>
        <p className="text-xs text-muted-foreground">
          Tests and trials run to validate hypotheses.
        </p>
      </div>
      <ResearchList entries={entries} />
    </div>
  );
}
