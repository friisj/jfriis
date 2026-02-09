'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { createImage } from '@/lib/cog';
import { generateThumbnails } from '@/lib/cog-thumbnails';

interface UploadModalProps {
  seriesId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedFile {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function UploadModal({ seriesId, isOpen, onClose }: UploadModalProps) {
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

    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: 'uploading' } : f))
    );

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
      });

      // Generate thumbnails in the background (don't block UI on this)
      generateThumbnails(image.id, storagePath).catch((err) => {
        console.error('Thumbnail generation failed:', err);
        // Don't fail the upload if thumbnails fail
      });

      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: 'success' } : f))
      );

      return true;
    } catch (err) {
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

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
      }
    }

    setUploading(false);
  }

  function handleDone() {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    router.refresh();
    onClose();
  }

  function handleCancel() {
    if (uploading) return;
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    onClose();
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={handleCancel}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Upload Images</h2>
            <p className="text-sm text-muted-foreground">
              Add reference images to this series
            </p>
          </div>
          <button
            onClick={handleCancel}
            disabled={uploading}
            className="text-muted-foreground hover:text-foreground text-xl p-1"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
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
            <div className="space-y-1">
              <p className="font-medium">
                {isDragging ? 'Drop images here' : 'Drag & drop images'}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse (PNG, JPEG, WebP, GIF)
              </p>
            </div>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Selected ({files.length})
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

              <div className="grid grid-cols-5 gap-2">
                {files.map((selectedFile, index) => (
                  <div key={index} className="relative group">
                    <div
                      className={`
                        aspect-square rounded overflow-hidden border-2
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

                      {selectedFile.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      {selectedFile.status === 'success' && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <span className="text-xl">✓</span>
                        </div>
                      )}

                      {selectedFile.status === 'error' && (
                        <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                          <span className="text-xl">✗</span>
                        </div>
                      )}
                    </div>

                    {selectedFile.status === 'pending' && !uploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={uploading}>
            Cancel
          </Button>
          {pendingCount > 0 ? (
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading
                ? 'Uploading...'
                : `Upload ${pendingCount} Image${pendingCount !== 1 ? 's' : ''}`}
            </Button>
          ) : successCount > 0 ? (
            <Button onClick={handleDone}>Done</Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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
