'use client';

import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getCogImageUrl, createImage } from '@/lib/cog';
import { supabase } from '@/lib/supabase';
import type { CogImage } from '@/lib/types/cog';

// ============================================================================
// StoryInput — Textarea for the creative brief (base_prompt) with AI helper
// ============================================================================

interface StoryInputProps {
  basePrompt: string;
  onBasePromptChange: (value: string) => void;
}

export function StoryInput({ basePrompt, onBasePromptChange }: StoryInputProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [simpleText, setSimpleText] = useState('');

  const handleGeneratePrompt = async () => {
    if (!simpleText.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/cog/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: simpleText }),
      });

      if (!response.ok) throw new Error('Failed to generate prompt');

      const { prompt } = await response.json();
      onBasePromptChange(prompt);
      setShowGenerator(false);
      setSimpleText('');
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      alert('Failed to generate prompt. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="base-prompt">Story</Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowGenerator(!showGenerator)}
        >
          {showGenerator ? 'Write Manually' : 'Generate with AI'}
        </Button>
      </div>

      {showGenerator ? (
        <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
          <Label htmlFor="simple-text" className="text-xs">
            Describe your vision in simple terms
          </Label>
          <Textarea
            id="simple-text"
            value={simpleText}
            onChange={(e) => setSimpleText(e.target.value)}
            placeholder="e.g., A modern product photo on a white background"
            className="min-h-[60px]"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleGeneratePrompt}
            disabled={isGenerating || !simpleText.trim()}
          >
            {isGenerating ? 'Generating...' : 'Generate Detailed Prompt'}
          </Button>
        </div>
      ) : (
        <Textarea
          id="base-prompt"
          value={basePrompt}
          onChange={(e) => onBasePromptChange(e.target.value)}
          placeholder="Describe your creative vision..."
          className="min-h-[100px]"
        />
      )}
    </div>
  );
}

// ============================================================================
// ReferenceImageSelector — Upload + existing image selection
// ============================================================================

interface ReferenceImageSelectorProps {
  selectedImages: string[];
  onSelectedImagesChange: (imageIds: string[]) => void;
  availableImages: CogImage[];
  seriesId: string;
  onImagesUploaded?: () => void;
}

export function ReferenceImageSelector({
  selectedImages,
  onSelectedImagesChange,
  availableImages,
  seriesId,
  onImagesUploaded,
}: ReferenceImageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleImage = (imageId: string) => {
    if (selectedImages.includes(imageId)) {
      onSelectedImagesChange(selectedImages.filter((id) => id !== imageId));
    } else {
      onSelectedImagesChange([...selectedImages, imageId]);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = file.name.split('.').pop();
        const filename = `upload-${timestamp}-${randomStr}.${ext}`;
        const storagePath = `${seriesId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from('cog-images')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        await createImage({
          series_id: seriesId,
          storage_path: storagePath,
          filename: filename,
          mime_type: file.type,
          file_size: file.size,
          source: 'upload',
          metadata: {},
        });
      }

      onImagesUploaded?.();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Reference Images</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Images'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Upload new images or select from existing images in this series
      </p>

      {availableImages.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-between"
            >
              <span>
                {isOpen ? 'Hide' : 'Show'} existing images ({availableImages.length})
              </span>
              <span>{isOpen ? '▲' : '▼'}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto border rounded-lg p-2">
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
              <p className="text-xs text-muted-foreground mt-2">
                Showing first 20 images
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
