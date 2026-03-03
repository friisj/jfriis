import { getLuvReferencesServer } from '@/lib/luv-server';
import { ReferenceGallery } from '../../components/reference-gallery';

export default async function ChassisReferencesPage() {
  const references = await getLuvReferencesServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Reference Images</h1>
      <ReferenceGallery initialReferences={references} />
    </div>
  );
}
