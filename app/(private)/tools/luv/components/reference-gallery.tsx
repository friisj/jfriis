'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { createLuvReference, deleteLuvReference } from '@/lib/luv';
import type { LuvReference, LuvReferenceType } from '@/lib/types/luv';

interface ReferenceGalleryProps {
  initialReferences: LuvReference[];
}

interface SelectedFile {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function ReferenceGallery({ initialReferences }: ReferenceGalleryProps) {
  const [references, setReferences] = useState(initialReferences);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<LuvReferenceType>('canonical');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith('image/')
    );
    const selected: SelectedFile[] = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...selected]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const file = prev[index];
      URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.status !== 'pending') continue;

      setFiles((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'uploading' } : item
        )
      );

      try {
        const ext = f.file.name.split('.').pop() || 'jpg';
        const path = `references/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('luv-media')
          .upload(path, f.file);

        if (uploadError) throw uploadError;

        const ref = await createLuvReference({
          type: uploadType,
          storage_path: path,
          description: f.file.name,
        });

        setReferences((prev) => [ref, ...prev]);
        setFiles((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'success' } : item
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setFiles((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error', error: message } : item
          )
        );
      }
    }

    setUploading(false);
  };

  const handleDelete = async (ref: LuvReference) => {
    if (!confirm('Delete this reference?')) return;
    try {
      await supabase.storage.from('luv-media').remove([ref.storage_path]);
      await deleteLuvReference(ref.id);
      setReferences((prev) => prev.filter((r) => r.id !== ref.id));
    } catch (err) {
      console.error('Failed to delete reference:', err);
    }
  };

  const getPublicUrl = (storagePath: string) => {
    const { data } = supabase.storage
      .from('luv-media')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <p className="text-sm text-muted-foreground">
          Drop images here or click to select
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Staged files */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Type:</label>
            <select
              value={uploadType}
              onChange={(e) =>
                setUploadType(e.target.value as LuvReferenceType)
              }
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="canonical">Canonical</option>
              <option value="variation">Variation</option>
              <option value="training">Training</option>
            </select>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {files.map((f, i) => (
              <div key={i} className="relative group">
                <img
                  src={f.preview}
                  alt=""
                  className="w-full aspect-square object-cover rounded-md"
                />
                {f.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                  </div>
                )}
                {f.status === 'success' && (
                  <div className="absolute inset-0 bg-green-500/30 rounded-md flex items-center justify-center text-white text-lg">
                    &#10003;
                  </div>
                )}
                {f.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/30 rounded-md flex items-center justify-center text-white text-xs p-2">
                    {f.error}
                  </div>
                )}
                {f.status === 'pending' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                files.forEach((f) => URL.revokeObjectURL(f.preview));
                setFiles([]);
              }}
              disabled={uploading}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Existing references */}
      {references.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {references.map((ref) => (
            <div key={ref.id} className="group relative">
              <img
                src={getPublicUrl(ref.storage_path)}
                alt={ref.description ?? ''}
                className="w-full aspect-square object-cover rounded-md"
              />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  {ref.type}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(ref)}
                className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
              {ref.description && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {ref.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {references.length === 0 && files.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No references yet. Upload images to get started.
        </p>
      )}
    </div>
  );
}
