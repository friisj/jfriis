'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { searchReferenceImages } from '@/lib/ai/actions/search-reference-images';
import { downloadAndStoreStockImage } from '@/lib/ai/actions/download-stock-image';
import type { StockPhotoResult } from '@/lib/types/cog';

interface ReferenceImageSearchProps {
  story: string;
  themes: string;
  seriesId: string;
  onImagesAdded: (imageIds: string[]) => void;
}

export function ReferenceImageSearch({ story, themes, seriesId, onImagesAdded }: ReferenceImageSearchProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<StockPhotoResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [addProgress, setAddProgress] = useState(0);

  const handleSearch = async () => {
    if (!story.trim()) return;
    setIsSearching(true);
    setResults([]);
    setSelected(new Set());
    try {
      const photos = await searchReferenceImages({ story, themes });
      setResults(photos);
    } catch (err) {
      console.error('Stock photo search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelection = (photo: StockPhotoResult) => {
    const key = `${photo.source}:${photo.id}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddSelected = async () => {
    const toAdd = results.filter((r) => selected.has(`${r.source}:${r.id}`));
    if (toAdd.length === 0) return;

    setIsAdding(true);
    setAddProgress(0);
    const addedIds: string[] = [];

    for (let i = 0; i < toAdd.length; i++) {
      const photo = toAdd[i];
      try {
        const { imageId } = await downloadAndStoreStockImage({
          url: photo.url,
          source: photo.source,
          sourceId: photo.id,
          photographer: photo.photographer,
          photographerUrl: photo.photographerUrl,
          seriesId,
        });
        addedIds.push(imageId);
      } catch (err) {
        console.error(`Failed to download ${photo.source}:${photo.id}:`, err);
      }
      setAddProgress(i + 1);
    }

    if (addedIds.length > 0) {
      onImagesAdded(addedIds);
    }
    setResults([]);
    setSelected(new Set());
    setIsAdding(false);
  };

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Find Reference Photos</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleSearch}
          disabled={isSearching || !story.trim()}
        >
          {isSearching ? 'Searching...' : 'Find References'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Search Unsplash and Pexels for visual inspiration based on your story.
      </p>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
            {results.map((photo) => {
              const key = `${photo.source}:${photo.id}`;
              const isSelected = selected.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSelection(photo)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-transparent hover:border-muted-foreground'
                  }`}
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                  <Badge
                    variant="secondary"
                    className="absolute top-1 left-1 text-[10px] px-1 py-0"
                  >
                    {photo.source === 'unsplash' ? 'U' : 'P'}
                  </Badge>
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {photo.photographer}
                  </div>
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                        ✓
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selected.size} selected
            </p>
            <Button
              type="button"
              size="sm"
              onClick={handleAddSelected}
              disabled={selected.size === 0 || isAdding}
            >
              {isAdding
                ? `Adding ${addProgress}/${selected.size}...`
                : `Add ${selected.size} Selected`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
