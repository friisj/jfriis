'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCogImageUrl } from '@/lib/cog';
import type { CogImage } from '@/lib/types/cog';

interface InitialInputSelectorProps {
  basePrompt: string;
  onBasePromptChange: (value: string) => void;
  selectedImages: string[];
  onSelectedImagesChange: (imageIds: string[]) => void;
  availableImages: CogImage[];
}

export function InitialInputSelector({
  basePrompt,
  onBasePromptChange,
  selectedImages,
  onSelectedImagesChange,
  availableImages,
}: InitialInputSelectorProps) {
  const toggleImage = (imageId: string) => {
    if (selectedImages.includes(imageId)) {
      onSelectedImagesChange(selectedImages.filter((id) => id !== imageId));
    } else {
      onSelectedImagesChange([...selectedImages, imageId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="base-prompt">Initial Prompt</Label>
        <Textarea
          id="base-prompt"
          value={basePrompt}
          onChange={(e) => onBasePromptChange(e.target.value)}
          placeholder="Describe what you want to generate..."
          className="min-h-[100px]"
        />
      </div>

      {availableImages.length > 0 && (
        <div className="space-y-2">
          <Label>Reference Images (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Select images to use as reference for the pipeline
          </p>
          <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
            {availableImages.slice(0, 20).map((image) => {
              const isSelected = selectedImages.includes(image.id);
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => toggleImage(image.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-transparent hover:border-muted-foreground'
                  }`}
                >
                  <img
                    src={getCogImageUrl(image.storage_path)}
                    alt={image.title || ''}
                    className="w-full h-full object-cover"
                  />
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
          {availableImages.length > 20 && (
            <p className="text-xs text-muted-foreground">
              Showing first 20 images
            </p>
          )}
        </div>
      )}
    </div>
  );
}
