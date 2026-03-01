import { getLuvCharacterServer } from '@/lib/luv-server';
import { SoulEditor } from '../components/soul-editor';

export default async function LuvSoulPage() {
  const character = await getLuvCharacterServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Soul</h1>
      <SoulEditor
        characterId={character?.id ?? null}
        initialSoulData={character?.soul_data ?? {}}
        initialVersion={character?.version ?? 0}
      />
    </div>
  );
}
