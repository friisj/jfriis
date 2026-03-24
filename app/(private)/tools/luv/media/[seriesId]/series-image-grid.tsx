'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getCogImageUrl } from '@/lib/cog/images';
import { deleteImageWithCleanup } from '@/lib/cog/images';
import { supabase } from '@/lib/supabase';
import { createImage } from '@/lib/cog/images';
import { IconPhotoPlus, IconX } from '@tabler/icons-react';
import type { CogImage } from '@/lib/types/cog';

interface SeriesImageGridProps {
  seriesId: string;
  initialImages: CogImage[];
  seriesTitle: string;
}

export function SeriesImageGrid({ seriesId, initialImages, seriesTitle }: SeriesImageGridProps) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploading(true);

    for (const file of imageFiles) {
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const storagePath = `luv/media/${seriesId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('cog-images')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const image = await createImage({
          series_id: seriesId,
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type,
          source: 'upload',
          metadata: {},
        });

        setImages((prev) => [image, ...prev]);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setUploading(false);
  }, [seriesId]);

  const handleDelete = async (image: CogImage) => {
    if (!confirm('Delete this image?')) return;
    try {
      await deleteImageWithCleanup(image.id);
      setImages((prev) => prev.filter((img) => img.id !== image.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <IconPhotoPlus size={14} />
          {uploading ? 'Uploading...' : 'Add images'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleUpload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Image grid */}
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No images in this series yet.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((image) => (
            <div key={image.id} className="group relative">
              <Link href={`/tools/luv/media/${seriesId}/${image.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCogImageUrl(image.storage_path)}
                  alt={image.filename ?? ''}
                  className="w-full aspect-square object-cover rounded-md"
                />
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(image)}
                className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconX size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
