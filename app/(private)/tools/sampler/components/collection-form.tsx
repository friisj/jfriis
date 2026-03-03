'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createCollection, initializeGrid } from '@/lib/sampler';
import { BatchWizard } from './batch-wizard';
import type { SamplerCollection } from '@/lib/types/sampler';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function CollectionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<SamplerCollection | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState('4');
  const [cols, setCols] = useState('4');
  const [color, setColor] = useState('#6366f1');

  function resetForm() {
    setName('');
    setDescription('');
    setRows('4');
    setCols('4');
    setColor('#6366f1');
    setCreated(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const slug = slugify(name);
      const collection = await createCollection({
        name: name.trim(),
        slug,
        description: description.trim() || undefined,
        grid_rows: parseInt(rows),
        grid_cols: parseInt(cols),
        color,
      });

      await initializeGrid(collection.id, parseInt(rows), parseInt(cols));
      setCreated(collection);
    } catch (err) {
      console.error('Failed to create collection:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleGoToCollection() {
    if (!created) return;
    setOpen(false);
    resetForm();
    router.push(`/tools/sampler/${created.slug}`);
  }

  function handleBatchGenerate() {
    setOpen(false);
    setBatchOpen(true);
  }

  const gridSizes = ['1', '2', '3', '4', '5', '6', '7', '8'];

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogTrigger asChild>
          <Button>New Collection</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{created ? 'Collection Created' : 'New Collection'}</DialogTitle>
          </DialogHeader>

          {created ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>{created.name}</strong> is ready with a {created.grid_rows}&times;{created.grid_cols} grid.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGoToCollection} className="flex-1">
                  Go to Collection
                </Button>
                <Button onClick={handleBatchGenerate} className="flex-1">
                  Batch Generate
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Drum Kit"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rows</Label>
                  <Select value={rows} onValueChange={setRows}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gridSizes.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Columns</Label>
                  <Select value={cols} onValueChange={setCols}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gridSizes.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">{color}</span>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
                {loading ? 'Creating...' : 'Create Collection'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {created && (
        <BatchWizard
          open={batchOpen}
          onOpenChange={(o) => { setBatchOpen(o); if (!o) resetForm(); }}
          collection={created}
        />
      )}
    </>
  );
}
