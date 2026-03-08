'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createLuvMemory,
  updateLuvMemory,
  deleteLuvMemory,
} from '@/lib/luv';
import type { LuvMemory } from '@/lib/types/luv';

const CATEGORIES = [
  'general',
  'preference',
  'fact',
  'context',
  'relationship',
];

interface MemoryManagerProps {
  initialMemories: LuvMemory[];
}

export function MemoryManager({ initialMemories }: MemoryManagerProps) {
  const [memories, setMemories] = useState(initialMemories);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('general');

  const resetForm = () => {
    setFormContent('');
    setFormCategory('general');
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (m: LuvMemory) => {
    setFormContent(m.content);
    setFormCategory(m.category);
    setEditing(m.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formContent.trim()) return;
    setSaving(true);

    try {
      if (editing) {
        const updated = await updateLuvMemory(editing, {
          content: formContent,
          category: formCategory,
        });
        setMemories((prev) =>
          prev.map((m) => (m.id === editing ? updated : m))
        );
      } else {
        const created = await createLuvMemory({
          content: formContent,
          category: formCategory,
        });
        setMemories((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save memory:', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (m: LuvMemory) => {
    try {
      const updated = await updateLuvMemory(m.id, { active: !m.active });
      setMemories((prev) =>
        prev.map((mem) => (mem.id === m.id ? updated : mem))
      );
    } catch (err) {
      console.error('Failed to toggle memory:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this memory permanently?')) return;
    try {
      await deleteLuvMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      if (editing === id) resetForm();
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const categories = Array.from(new Set(memories.map((m) => m.category)));
  const filtered =
    filterCategory === 'all'
      ? memories
      : memories.filter((m) => m.category === filterCategory);
  const activeCount = memories.filter((m) => m.active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {activeCount} active / {memories.length} total
          </p>
          {categories.length > 1 && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs rounded border bg-background px-2 py-1"
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel' : 'Add Memory'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="font-medium">
            {editing ? 'Edit Memory' : 'New Memory'}
          </h3>
          <div>
            <Label htmlFor="memory-content">Content</Label>
            <Textarea
              id="memory-content"
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="A clear, standalone fact (e.g. &quot;Jon's favorite color is blue&quot;)"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="memory-category">Category</Label>
            <select
              id="memory-category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 rounded-md border p-3 ${
              !m.active ? 'opacity-50' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm">{m.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  {m.category}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
                {!m.active && (
                  <span className="text-[10px] text-muted-foreground italic">
                    inactive
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleActive(m)}
                title={m.active ? 'Deactivate' : 'Activate'}
              >
                {m.active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(m)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => handleDelete(m.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {memories.length === 0
            ? 'No memories yet. Luv will save memories during conversations, or add them manually.'
            : 'No memories match the selected filter.'}
        </p>
      )}
    </div>
  );
}
