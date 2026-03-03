import { getLuvCharacterServer } from '@/lib/luv-server';
import { SoulPersonalityEditor } from '../../components/soul-personality-editor';

export default async function SoulPersonalityPage() {
  const character = await getLuvCharacterServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Personality</h1>
      <SoulPersonalityEditor
        characterId={character?.id ?? null}
        initialSoulData={character?.soul_data ?? {}}
        initialVersion={character?.version ?? 0}
      />
    </div>
  );
}
