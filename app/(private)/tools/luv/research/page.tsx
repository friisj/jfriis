import { listLuvResearchServer } from '@/lib/luv-research-server';
import { ResearchList } from './components/research-list';

export default async function ResearchOverviewPage() {
  const entries = await listLuvResearchServer();

  return (
    <div className="px-4 py-8 max-w-xl">
      <div className="space-y-1 mb-6">
        <h1 className="text-sm font-semibold">Research</h1>
        <p className="text-xs text-muted-foreground">
          All hypotheses, experiments, decisions, insights, and evidence.
        </p>
      </div>
      <ResearchList entries={entries} showKind />
    </div>
  );
}
