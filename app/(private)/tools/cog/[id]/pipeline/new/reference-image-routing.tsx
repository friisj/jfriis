'use client';

import { getCogImageUrl } from '@/lib/cog';
import type { CogImage, ReferenceImageConfigs, ReferenceImageUsage } from '@/lib/types/cog';

interface ReferenceImageRoutingProps {
  selectedImageIds: string[];
  availableImages: CogImage[];
  configs: ReferenceImageConfigs | null;
  onConfigsChange: (configs: ReferenceImageConfigs | null) => void;
}

const USAGE_OPTIONS: { value: ReferenceImageUsage; label: string }[] = [
  { value: 'vision', label: 'Vision' },
  { value: 'generation', label: 'Generation' },
  { value: 'both', label: 'Both' },
];

export function ReferenceImageRouting({
  selectedImageIds,
  availableImages,
  configs,
  onConfigsChange,
}: ReferenceImageRoutingProps) {
  const imageMap = new Map(availableImages.map((img) => [img.id, img]));

  const getUsage = (imageId: string): ReferenceImageUsage => {
    return configs?.[imageId] || 'both';
  };

  const setUsage = (imageId: string, usage: ReferenceImageUsage) => {
    const next: ReferenceImageConfigs = { ...(configs || {}) };

    if (usage === 'both') {
      delete next[imageId];
    } else {
      next[imageId] = usage;
    }

    // If all entries are removed (all "both"), set to null for backward compat
    onConfigsChange(Object.keys(next).length > 0 ? next : null);
  };

  if (selectedImageIds.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Image Usage — control how each reference is used in the pipeline
      </p>
      <div className="space-y-1.5">
        {selectedImageIds.map((imageId) => {
          const image = imageMap.get(imageId);
          if (!image) return null;
          const current = getUsage(imageId);

          return (
            <div
              key={imageId}
              className="flex items-center gap-3 rounded-md border px-2 py-1.5"
            >
              <img
                src={getCogImageUrl(image.thumbnail_64 || image.storage_path)}
                alt={image.title || image.filename}
                className="w-8 h-8 rounded object-cover shrink-0"
              />
              <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                {image.title || image.filename}
              </span>
              <div className="flex rounded-md border overflow-hidden shrink-0">
                {USAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUsage(imageId, opt.value)}
                    className={`px-2 py-0.5 text-xs transition-colors ${
                      current === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
