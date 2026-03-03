import { getLuvCharacterServer } from '@/lib/luv-server';
import { ChassisLegacyEditor } from '../../components/chassis-legacy-editor';

export default async function ChassisLegacyPage() {
  const character = await getLuvCharacterServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Legacy Editor</h1>
      <ChassisLegacyEditor
        characterId={character?.id ?? null}
        initialChassisData={character?.chassis_data ?? {}}
        initialVersion={character?.version ?? 0}
      />
    </div>
  );
}
