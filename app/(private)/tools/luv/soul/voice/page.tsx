import { getLuvCharacterServer } from '@/lib/luv-server';
import { SoulVoiceEditor } from '../../components/soul-voice-editor';

export default async function SoulVoicePage() {
  const character = await getLuvCharacterServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Voice</h1>
      <SoulVoiceEditor
        characterId={character?.id ?? null}
        initialSoulData={character?.soul_data ?? {}}
        initialVersion={character?.version ?? 0}
      />
    </div>
  );
}
