import { getLuvCharacterServer } from '@/lib/luv-server';
import { SoulOverridesEditor } from '../../components/soul-overrides-editor';

export default async function SoulOverridesPage() {
  const character = await getLuvCharacterServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Overrides</h1>
      <SoulOverridesEditor
        characterId={character?.id ?? null}
        initialSoulData={character?.soul_data ?? {}}
        initialVersion={character?.version ?? 0}
      />
    </div>
  );
}
