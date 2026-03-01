import { getLuvCharacterServer, getLuvReferencesServer } from '@/lib/luv-server';
import { ChassisEditor } from '../components/chassis-editor';
import { ReferenceGallery } from '../components/reference-gallery';

export default async function LuvChassisPage() {
  const [character, references] = await Promise.all([
    getLuvCharacterServer(),
    getLuvReferencesServer(),
  ]);

  return (
    <div className="container px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-6">Chassis</h1>
        <ChassisEditor
          characterId={character?.id ?? null}
          initialChassisData={character?.chassis_data ?? {}}
          initialVersion={character?.version ?? 0}
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-6">Reference Images</h2>
        <ReferenceGallery initialReferences={references} />
      </div>
    </div>
  );
}
