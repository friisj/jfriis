'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createLuvPreset,
  updateLuvPreset,
  deleteLuvPreset,
} from '@/lib/luv';
import type {
  LuvAestheticPreset,
  CreateLuvAestheticPresetInput,
} from '@/lib/types/luv';

interface PresetEditorProps {
  initialPresets: LuvAestheticPreset[];
}

export function PresetEditor({ initialPresets }: PresetEditorProps) {
  const [presets, setPresets] = useState(initialPresets);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParams, setFormParams] = useState('{}');

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormParams('{}');
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (p: LuvAestheticPreset) => {
    setFormName(p.name);
    setFormDescription(p.description ?? '');
    setFormParams(JSON.stringify(p.parameters, null, 2));
    setEditing(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    let parameters: Record<string, unknown> = {};
    try {
      parameters = JSON.parse(formParams);
    } catch {
      alert('Invalid JSON in parameters');
      setSaving(false);
      return;
    }

    try {
      if (editing) {
        const updated = await updateLuvPreset(editing, {
          name: formName,
          description: formDescription || null,
          parameters,
        });
        setPresets((prev) =>
          prev.map((p) => (p.id === editing ? updated : p))
        );
      } else {
        const input: CreateLuvAestheticPresetInput = {
          name: formName,
          description: formDescription || undefined,
          parameters,
        };
        const created = await createLuvPreset(input);
        setPresets((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save preset:', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this preset?')) return;
    try {
      await deleteLuvPreset(id);
      setPresets((prev) => prev.filter((p) => p.id !== id));
      if (editing === id) resetForm();
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {presets.length} preset{presets.length !== 1 && 's'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel' : 'New Preset'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="font-medium">
            {editing ? 'Edit Preset' : 'New Preset'}
          </h3>
          <div>
            <Label htmlFor="preset-name">Name</Label>
            <Input
              id="preset-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Preset name"
            />
          </div>
          <div>
            <Label htmlFor="preset-desc">Description</Label>
            <Textarea
              id="preset-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What this preset does..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="preset-params">Parameters (JSON)</Label>
            <Textarea
              id="preset-params"
              value={formParams}
              onChange={(e) => setFormParams(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
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
        {presets.map((p) => (
          <div
            key={p.id}
            className="flex items-start gap-3 rounded-md border p-3"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">{p.name}</span>
              {p.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {p.description}
                </p>
              )}
              {Object.keys(p.parameters).length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                  {JSON.stringify(p.parameters)}
                </p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(p)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => handleDelete(p.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {presets.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No presets yet. Create one to get started.
        </p>
      )}
    </div>
  );
}
