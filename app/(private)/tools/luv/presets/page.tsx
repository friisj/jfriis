import { getLuvPresetsServer } from '@/lib/luv-server';
import { PresetEditor } from '../components/preset-editor';

export default async function LuvPresetsPage() {
  const presets = await getLuvPresetsServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Aesthetic Presets</h1>
      <PresetEditor initialPresets={presets} />
    </div>
  );
}
