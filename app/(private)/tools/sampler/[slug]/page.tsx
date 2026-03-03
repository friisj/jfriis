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
    <div className="flex-1 flex flex-col min-h-0">
      <CollectionGrid collection={collection} />
    </div>
  );
}
