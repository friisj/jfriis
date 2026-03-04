import { getChassisModulesServer } from '@/lib/luv-chassis-server';
import { StudyEditor } from '../../components/study-editor';

export default async function NewStudyPage() {
  const modules = await getChassisModulesServer();

  return (
    <div className="container px-4 py-8 max-w-xl">
      <h2 className="text-sm font-semibold mb-4">New Study</h2>
      <StudyEditor modules={modules} />
    </div>
  );
}
