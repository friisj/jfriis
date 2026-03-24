'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createLuvCogImage } from '@/lib/luv/cog-integration';
import { getCogThumbnailUrl } from '@/lib/cog/images';
import { deleteImageWithCleanup } from '@/lib/cog/images';
import type { CogImage } from '@/lib/types/cog';

interface ModuleMediaGalleryProps {
  moduleId: string;
  moduleSlug: string;
  initialMedia: CogImage[];
  parameterKeys: string[];
}

interface StagedFile {
  file: File;
  preview: string;
  parameterKey: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function ModuleMediaGallery({
  moduleId,
  moduleSlug,
  initialMedia,
  parameterKeys,
}: ModuleMediaGalleryProps) {
  const [media, setMedia] = useState(initialMedia);
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedKey, setSelectedKey] = useState(parameterKeys[0] ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const imageFiles = Array.from(newFiles).filter((f) =>
        f.type.startsWith('image/')
      );
      const staged: StagedFile[] = imageFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        parameterKey: selectedKey,
        status: 'pending',
      }));
      setFiles((prev) => [...prev, ...staged]);
    },
    [selectedKey]
  );

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
        const cogPath = `luv/modules/${moduleSlug}/${f.parameterKey}/${Date.now()}-${i}.${ext}`;

        const image = await createLuvCogImage({
          seriesKey: `module:${moduleSlug}`,
          file: f.file,
          filename: f.file.name,
          storagePath: cogPath,
          source: 'upload',
          metadata: {
            luv_module_id: moduleId,
            luv_parameter_key: f.parameterKey,
          },
        });

        setMedia((prev) => [image, ...prev]);
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

  const handleDelete = async (item: CogImage) => {
    if (!confirm('Delete this media?')) return;
    try {
      await deleteImageWithCleanup(item.id);
      setMedia((prev) => prev.filter((m) => m.id !== item.id));
    } catch (err) {
      console.error('Failed to delete media:', err);
    }
  };

  const getParamKey = (item: CogImage): string =>
    (item.metadata as Record<string, unknown>)?.luv_parameter_key as string ?? '';

  // Group media by parameter_key from metadata
  const grouped = parameterKeys
    .map((key) => ({
      key,
      items: media.filter((m) => getParamKey(m) === key),
    }))
    .filter((g) => g.items.length > 0);

  const knownKeys = new Set(parameterKeys);
  const ungrouped = media.filter((m) => !knownKeys.has(getParamKey(m)));

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">
        Reference Media
      </h3>

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
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
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
            <label className="text-sm font-medium">Parameter:</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              {parameterKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
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
                <div className="absolute bottom-1 left-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {f.parameterKey}
                  </Badge>
                </div>
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

      {/* Existing media grouped by parameter key */}
      {grouped.map(({ key, items }) => (
        <div key={key} className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">{key}</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.id} className="group relative">
                <img
                  src={getCogThumbnailUrl(item.storage_path, item.thumbnail_256)}
                  alt={item.filename ?? ''}
                  className="w-full aspect-square object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Other</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {ungrouped.map((item) => (
              <div key={item.id} className="group relative">
                <img
                  src={getCogThumbnailUrl(item.storage_path, item.thumbnail_256)}
                  alt={item.filename ?? ''}
                  className="w-full aspect-square object-cover rounded-md"
                />
                <div className="absolute bottom-1 left-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {getParamKey(item)}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {media.length === 0 && files.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No reference media yet. Upload images for this module.
        </p>
      )}
    </div>
  );
}
