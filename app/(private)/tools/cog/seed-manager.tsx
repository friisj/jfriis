'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Upload, X, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import {
  getCalibrationSeeds,
  createCalibrationSeed,
  updateCalibrationSeed,
  deleteCalibrationSeed,
  getCogImageUrl,
} from '@/lib/cog';
import type { CogCalibrationSeed } from '@/lib/types/cog';

export function SeedManager() {
  const [seeds, setSeeds] = useState<CogCalibrationSeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSeeds = useCallback(async () => {
    try {
      const data = await getCalibrationSeeds();
      setSeeds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load seeds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeeds();
  }, [loadSeeds]);

  function handleToggle(id: string) {
    setExpandedId(prev => prev === id ? null : id);
    setAdding(false);
  }

  async function handleCreate(input: {
    type_key: string;
    label: string;
    seed_subject: string;
  }) {
    setError(null);
    try {
      await createCalibrationSeed({
        type_key: input.type_key,
        label: input.label,
        seed_subject: input.seed_subject,
        seed_image_path: null,
        position: seeds.length,
      });
      setAdding(false);
      await loadSeeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create seed');
    }
  }

  async function handleUpdate(id: string, updates: Partial<CogCalibrationSeed>) {
    setError(null);
    try {
      await updateCalibrationSeed(id, updates);
      await loadSeeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update seed');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this calibration seed type? This cannot be undone.')) return;
    setError(null);
    try {
      await deleteCalibrationSeed(id);
      setExpandedId(null);
      await loadSeeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete seed');
    }
  }

  async function handleImageUpload(seed: CogCalibrationSeed, file: File) {
    setError(null);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `calibration-seeds/${seed.type_key}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('cog-images')
        .upload(storagePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      await updateCalibrationSeed(seed.id, { seed_image_path: storagePath });
      await loadSeeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-2">Loading seeds...</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Calibration Seeds</h4>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setAdding(true); setExpandedId(null); }}
          className="h-6 w-6 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {error && <div className="p-2 text-xs text-destructive bg-destructive/10 rounded">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {seeds.map(seed => (
          <SeedCard
            key={seed.id}
            seed={seed}
            expanded={expandedId === seed.id}
            onToggle={() => handleToggle(seed.id)}
            onUpdate={(updates) => handleUpdate(seed.id, updates)}
            onDelete={() => handleDelete(seed.id)}
            onImageUpload={(file) => handleImageUpload(seed, file)}
          />
        ))}

        {adding && (
          <NewSeedCard
            onSave={handleCreate}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Seed Card
// ============================================================================

function SeedCard({
  seed,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onImageUpload,
}: {
  seed: CogCalibrationSeed;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<CogCalibrationSeed>) => void;
  onDelete: () => void;
  onImageUpload: (file: File) => void;
}) {
  const [label, setLabel] = useState(seed.label);
  const [seedSubject, setSeedSubject] = useState(seed.seed_subject);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cacheBust, setCacheBust] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLabel(seed.label);
    setSeedSubject(seed.seed_subject);
    setDirty(false);
  }, [seed]);

  function handleLabelChange(v: string) {
    setLabel(v);
    setDirty(true);
  }

  function handleSubjectChange(v: string) {
    setSeedSubject(v);
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    await onUpdate({ label, seed_subject: seedSubject });
    setDirty(false);
    setSaving(false);
  }

  async function doUpload(file: File) {
    setUploading(true);
    try {
      await onImageUpload(file);
      setCacheBust(Date.now());
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      doUpload(file);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      doUpload(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    }
  }

  function imageUrl(path: string): string {
    const base = getCogImageUrl(path);
    return cacheBust ? `${base}?t=${cacheBust}` : base;
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="text-left p-3 border rounded-md hover:bg-muted/30 cursor-pointer space-y-2"
      >
        {seed.seed_image_path ? (
          <div className="aspect-square rounded overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(seed.seed_image_path)}
              alt={seed.label}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square rounded bg-muted/50 flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium">{seed.label}</p>
          <p className="text-xs text-muted-foreground font-mono">{seed.type_key}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{seed.seed_subject}</p>
        </div>
      </button>
    );
  }

  return (
    <div className="p-3 border rounded-md border-primary/30 bg-muted/10 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">{seed.type_key}</span>
        <Button size="sm" variant="ghost" onClick={onToggle} className="h-5 w-5 p-0">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Image upload zone */}
      <div
        className={`aspect-square rounded overflow-hidden bg-muted/50 relative transition-colors ${
          dragOver ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {seed.seed_image_path ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl(seed.seed_image_path)}
            alt={seed.label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
            <ImagePlus className="h-8 w-8 mb-1" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-xs text-white font-medium">Uploading...</span>
          </div>
        )}
      </div>

      {/* Explicit upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="h-7 text-xs w-full"
      >
        <Upload className="h-3 w-3 mr-1.5" />
        {uploading ? 'Uploading...' : seed.seed_image_path ? 'Replace Image' : 'Upload Image'}
      </Button>

      {/* Editable fields */}
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input
            value={label}
            onChange={e => handleLabelChange(e.target.value)}
            className="text-sm h-7"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Seed Subject</Label>
          <Textarea
            value={seedSubject}
            onChange={e => handleSubjectChange(e.target.value)}
            className="text-sm"
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {dirty && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-6 text-xs">
            {saving ? '...' : 'Save'}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="h-6 text-xs text-destructive hover:text-destructive ml-auto"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// New Seed Card
// ============================================================================

function NewSeedCard({
  onSave,
  onCancel,
}: {
  onSave: (input: { type_key: string; label: string; seed_subject: string }) => void;
  onCancel: () => void;
}) {
  const [typeKey, setTypeKey] = useState('');
  const [label, setLabel] = useState('');
  const [seedSubject, setSeedSubject] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!typeKey.trim() || !label.trim() || !seedSubject.trim()) return;
    setSaving(true);
    await onSave({
      type_key: typeKey.trim().toLowerCase().replace(/\s+/g, '_'),
      label: label.trim(),
      seed_subject: seedSubject.trim(),
    });
    setSaving(false);
  }

  return (
    <div className="p-3 border rounded-md border-dashed border-primary/30 bg-muted/10 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">New Type</span>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-5 w-5 p-0">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">Type Key</Label>
          <Input
            value={typeKey}
            onChange={e => setTypeKey(e.target.value)}
            placeholder="e.g. macro"
            className="text-sm h-7 font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Macro Photography"
            className="text-sm h-7"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Seed Subject</Label>
          <Textarea
            value={seedSubject}
            onChange={e => setSeedSubject(e.target.value)}
            placeholder="Describe the default subject for benchmark images..."
            className="text-sm"
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !typeKey.trim() || !label.trim() || !seedSubject.trim()}
          className="h-6 text-xs"
        >
          {saving ? '...' : 'Create'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-6 text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}
