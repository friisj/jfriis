'use client';

import { useState } from 'react';
import { CollectionCard } from './collection-card';
import { BatchWizard } from './batch-wizard';
import type { SamplerCollection } from '@/lib/types/sampler';

interface CollectionCardListProps {
  collections: SamplerCollection[];
}

export function CollectionCardList({ collections }: CollectionCardListProps) {
  const [batchCollection, setBatchCollection] = useState<SamplerCollection | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onBatchGenerate={setBatchCollection}
          />
        ))}
      </div>

      {batchCollection && (
        <BatchWizard
          open={!!batchCollection}
          onOpenChange={(open) => { if (!open) setBatchCollection(null); }}
          collection={batchCollection}
        />
      )}
    </>
  );
}
