import { listLuvResearchServer } from '@/lib/luv-research-server';
import { ResearchList } from '../components/research-list';

export default async function HypothesesPage() {
  const entries = await listLuvResearchServer({ kind: 'hypothesis' });

  return (
    <div className="px-4 py-8 max-w-xl">
      <div className="space-y-1 mb-6">
        <h1 className="text-sm font-semibold">Hypotheses</h1>
        <p className="text-xs text-muted-foreground">
          Testable beliefs about Luv&apos;s identity, behavior, or capabilities.
        </p>
      </div>
      <ResearchList entries={entries} />
    </div>
  );
}
