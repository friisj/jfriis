import { getLuvTemplatesServer } from '@/lib/luv-server';
import { PromptBuilder } from '../components/prompt-builder';

export default async function LuvPromptMatrixPage() {
  const templates = await getLuvTemplatesServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Prompt Matrix</h1>
      <PromptBuilder initialTemplates={templates} />
    </div>
  );
}
