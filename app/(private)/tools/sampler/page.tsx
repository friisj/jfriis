import { getCollectionsServer } from '@/lib/sampler-server';
import Link from 'next/link';
import { CollectionForm } from './components/collection-form';

export default async function SamplerPage() {
  const collections = await getCollectionsServer();

  return (
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/tools/sampler/${collection.slug}`}
              className="block border rounded-lg p-6 hover:bg-muted/50 transition-colors group"
            >
              <div
                className="w-8 h-8 rounded mb-3"
                style={{ backgroundColor: collection.color || '#6366f1' }}
              />
              <h2 className="text-lg font-semibold group-hover:underline">
                {collection.name}
              </h2>
              {collection.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {collection.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                {collection.grid_rows}&times;{collection.grid_cols} grid
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
