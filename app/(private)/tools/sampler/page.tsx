import { getCollectionsServer } from '@/lib/sampler-server';
import { CollectionForm } from './components/collection-form';
import { CollectionCardList } from './components/collection-card-list';
import { SamplerSidebar } from './components/sampler-sidebar';

export default async function SamplerPage() {
  const collections = await getCollectionsServer();

  return (
    <div className="flex-1 flex">
      <SamplerSidebar />
      <div className="flex-1 overflow-auto">
        <div className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Collections</h1>
              <p className="text-muted-foreground mt-2">
                Sound pad collections — each is a playable instrument layout
              </p>
            </div>
            <CollectionForm />
          </div>

          {collections.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground mb-4">
                No collections yet. Create your first to get started.
              </p>
              <CollectionForm />
            </div>
          ) : (
            <CollectionCardList collections={collections} />
          )}
        </div>
      </div>
    </div>
  );
}
