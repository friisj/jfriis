'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { createImage } from '@/lib/cog';
import { generateThumbnails } from '@/lib/cog-thumbnails';

interface UploadFormProps {
  seriesId: string;
  seriesTitle: string;
}

interface SelectedFile {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function UploadForm({ seriesId, seriesTitle }: UploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith('image/')
    );

    const newSelectedFiles: SelectedFile[] = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));

    setFiles((prev) => [...prev, ...newSelectedFiles]);
  }, []);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const file = prev[index];
      URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadFile(
    selectedFile: SelectedFile,
    index: number
  ): Promise<boolean> {
    const { file } = selectedFile;
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${seriesId}/upload_${timestamp}_${safeName}`;

    // Update status to uploading
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: 'uploading' } : f))
    );

    try {
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('cog-images')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Create database record
      const image = await createImage({
        series_id: seriesId,
        storage_path: storagePath,
        filename: file.name,
        mime_type: file.type,
        width: dimensions.width,
        height: dimensions.height,
        file_size: file.size,
        source: 'upload',
      });

      // Generate thumbnails in the background (don't block UI on this)
      generateThumbnails(image.id, storagePath).catch((err) => {
        console.error('Thumbnail generation failed:', err);
        // Don't fail the upload if thumbnails fail
      });

      // Update status to success
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: 'success' } : f))
      );

      return true;
    } catch (err) {
      // Update status to error
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'error',
                error: err instanceof Error ? err.message : 'Upload failed',
              }
            : f
        )
      );

      return false;
    }
  }

  async function handleUpload() {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
      }
    }

    setUploading(false);
  }

  function handleDone() {
    // Clean up previews
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    router.push(`/tools/cog/${seriesId}`);
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors
          ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isDragging ? 'Drop images here' : 'Drag & drop images'}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse (PNG, JPEG, WebP, GIF)
          </p>
        </div>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              Selected Images ({files.length})
              {successCount > 0 && (
                <span className="text-green-600 ml-2">
                  {successCount} uploaded
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-destructive ml-2">{errorCount} failed</span>
              )}
            </h3>
            {!uploading && pendingCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  files.forEach((f) => URL.revokeObjectURL(f.preview));
                  setFiles([]);
                }}
              >
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            {files.map((selectedFile, index) => (
              <div key={index} className="relative group">
                <div
                  className={`
                    aspect-square rounded-lg overflow-hidden border-2
                    ${
                      selectedFile.status === 'success'
                        ? 'border-green-500'
                        : selectedFile.status === 'error'
                          ? 'border-destructive'
                          : selectedFile.status === 'uploading'
                            ? 'border-primary'
                            : 'border-transparent'
                    }
                  `}
                >
                  <img
                    src={selectedFile.preview}
                    alt={selectedFile.file.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay for status */}
                  {selectedFile.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {selectedFile.status === 'success' && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <span className="text-2xl">✓</span>
                    </div>
                  )}

                  {selectedFile.status === 'error' && (
                    <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                      <span className="text-2xl">✗</span>
                    </div>
                  )}
                </div>

                {/* Remove button - only for pending files */}
                {selectedFile.status === 'pending' && !uploading && (
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}

                {/* Filename */}
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {selectedFile.file.name}
                </p>

                {/* Error message */}
                {selectedFile.error && (
                  <p className="text-xs text-destructive truncate">
                    {selectedFile.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-4 border-t">
        {pendingCount > 0 ? (
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading
              ? 'Uploading...'
              : `Upload ${pendingCount} Image${pendingCount !== 1 ? 's' : ''}`}
          </Button>
        ) : successCount > 0 ? (
          <Button onClick={handleDone}>Done</Button>
        ) : null}

        <Button variant="outline" onClick={() => router.back()}>
          {successCount > 0 ? 'Back to Series' : 'Cancel'}
        </Button>
      </div>
    </div>
  );
}

// Helper to get image dimensions
function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
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
