'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createImage } from './images';
import { addTagToImage } from './tags';
import type { CogImage } from '@/lib/types/cog';

export interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface UseImageUploadOptions {
  seriesId: string;
  /** Storage path prefix (default: seriesId). Luv uses 'luv/media/{seriesId}'. */
  storagePrefix?: string;
  /** Tag IDs to auto-apply to every uploaded image */
  autoTags?: string[];
  /** Called with the created image after a successful upload */
  onImageCreated?: (image: CogImage) => void;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

export function useImageUpload({
  seriesId,
  storagePrefix,
  autoTags = [],
  onImageCreated,
}: UseImageUploadOptions) {
  const router = useRouter();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const isUploading = uploadingFiles.some((f) => f.status === 'uploading');

  const uploadSingleFile = useCallback(async (uploadingFile: UploadingFile) => {
    const { file, id } = uploadingFile;
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const prefix = storagePrefix ?? seriesId;
    const storagePath = `${prefix}/${timestamp}_${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('cog-images')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const dimensions = await getImageDimensions(file);

      const image = await createImage({
        series_id: seriesId,
        storage_path: storagePath,
        filename: file.name,
        mime_type: file.type,
        width: dimensions.width,
        height: dimensions.height,
        file_size: file.size,
        source: 'upload',
        metadata: {},
      });

      for (const tagId of autoTags) {
        await addTagToImage(image.id, tagId).catch(() => {});
      }

      onImageCreated?.(image);

      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'success' as const } : f))
      );

      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
        router.refresh();
      }, 1000);
    } catch (err) {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' }
            : f
        )
      );

      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
      }, 3000);
    }
  }, [seriesId, storagePrefix, autoTags, onImageCreated, router]);

  const upload = useCallback((files: FileList) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const newUploadingFiles: UploadingFile[] = imageFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'uploading' as const,
    }));

    setUploadingFiles((prev) => [...newUploadingFiles, ...prev]);
    newUploadingFiles.forEach((uf) => uploadSingleFile(uf));
  }, [uploadSingleFile]);

  return { upload, uploadingFiles, isUploading };
}
