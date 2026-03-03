import { getLuvCharacterServer } from '@/lib/luv-server';
import { SoulRulesEditor } from '../../components/soul-rules-editor';

export default async function SoulRulesPage() {
  const character = await getLuvCharacterServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Rules &amp; Skills</h1>
      <SoulRulesEditor
        characterId={character?.id ?? null}
        initialSoulData={character?.soul_data ?? {}}
        initialVersion={character?.version ?? 0}
      />
    </div>
  );
}
