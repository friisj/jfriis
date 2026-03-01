import { getLuvGenerationsServer, getLuvPresetsServer } from '@/lib/luv-server';
import { GenerationPanel } from '../components/generation-panel';

export default async function LuvMediaLabPage() {
  const [generations, presets] = await Promise.all([
    getLuvGenerationsServer(),
    getLuvPresetsServer(),
  ]);

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Media Lab</h1>
      <GenerationPanel
        initialGenerations={generations}
        presets={presets}
      />
    </div>
  );
}
