'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { createChassisModule } from '@/lib/luv-chassis';

const CATEGORIES = ['face', 'coloring', 'body', 'general'];

export function ModuleCreator() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [sequence, setSequence] = useState(10);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!slug.trim() || !name.trim()) return;
    setSaving(true);
    try {
      await createChassisModule({
        slug: slug.trim(),
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        parameter_schema: [],
        sequence,
      });
      setOpen(false);
      router.push(`/tools/luv/chassis/${slug.trim()}`);
    } catch (err) {
      console.error('Failed to create module:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3 w-3 mr-1" />
          New Module
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chassis Module</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Ears"
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., ears"
              className="text-xs h-8 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sequence</Label>
              <Input
                type="number"
                value={sequence}
                onChange={(e) => setSequence(Number(e.target.value))}
                className="text-xs h-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this module"
              className="text-xs h-8"
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={saving || !slug.trim() || !name.trim()}
            size="sm"
            className="w-full"
          >
            {saving ? 'Creating...' : 'Create Module'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
