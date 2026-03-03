import { getLuvCharacterServer, getLuvReferencesServer } from '@/lib/luv-server';
import { getChassisModulesServer } from '@/lib/luv-chassis-server';
import { ChassisEditor } from '../components/chassis-editor';
import { ReferenceGallery } from '../components/reference-gallery';

export default async function LuvChassisPage() {
  const [character, references, modules] = await Promise.all([
    getLuvCharacterServer(),
    getLuvReferencesServer(),
    getChassisModulesServer().catch(() => []),
  ]);

  return (
    <div className="container px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-6">Chassis</h1>
        <ChassisEditor
          characterId={character?.id ?? null}
          initialChassisData={character?.chassis_data ?? {}}
          initialVersion={character?.version ?? 0}
          modules={modules}
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-6">Reference Images</h2>
        <ReferenceGallery initialReferences={references} />
      </div>
    </div>
  );
}
