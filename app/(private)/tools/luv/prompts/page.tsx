import { getLuvTemplatesServer, getLuvCharacterServer, getLuvPresetsServer } from '@/lib/luv-server';
import { getChassisModulesServer } from '@/lib/luv-chassis-server';
import { PromptBuilder } from '../components/prompt-builder';

export default async function LuvPromptMatrixPage() {
  const [templates, character, modules, presets] = await Promise.all([
    getLuvTemplatesServer(),
    getLuvCharacterServer(),
    getChassisModulesServer(),
    getLuvPresetsServer(),
  ]);

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Prompt Matrix</h1>
      <PromptBuilder
        initialTemplates={templates}
        soulData={character?.soul_data}
        chassisData={character?.chassis_data}
        chassisModules={modules}
        presets={presets}
      />
    </div>
  );
}
