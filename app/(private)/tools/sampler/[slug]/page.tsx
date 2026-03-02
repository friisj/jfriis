import { getCollectionWithPadsServer } from '@/lib/sampler-server';
import { CollectionGrid } from '../components/collection-grid';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;

  let collection;
  try {
    collection = await getCollectionWithPadsServer(slug);
  } catch {
    notFound();
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{collection.name}</h1>
        {collection.description && (
          <p className="text-muted-foreground mt-1">{collection.description}</p>
        )}
      </div>
      <CollectionGrid collection={collection} />
    </div>
  );
}
