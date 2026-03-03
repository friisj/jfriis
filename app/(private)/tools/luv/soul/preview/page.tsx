import { getLuvCharacterServer } from '@/lib/luv-server';
import { SoulPreview } from '../../components/soul-preview';

export default async function SoulPreviewPage() {
  const character = await getLuvCharacterServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Composition Preview</h1>
      <SoulPreview soulData={character?.soul_data ?? {}} />
    </div>
  );
}
