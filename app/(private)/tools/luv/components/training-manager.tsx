'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  createLuvTrainingSet,
  updateLuvTrainingSet,
  deleteLuvTrainingSet,
} from '@/lib/luv';
import type {
  LuvTrainingSet,
  LuvTrainingSetStatus,
} from '@/lib/types/luv';

interface TrainingManagerProps {
  initialTrainingSets: LuvTrainingSet[];
}

const STATUS_COLORS: Record<LuvTrainingSetStatus, string> = {
  draft: 'bg-yellow-500/10 text-yellow-700',
  ready: 'bg-green-500/10 text-green-700',
  exported: 'bg-blue-500/10 text-blue-700',
};

export function TrainingManager({ initialTrainingSets }: TrainingManagerProps) {
  const [trainingSets, setTrainingSets] = useState(initialTrainingSets);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetModel, setFormTargetModel] = useState('');
  const [formStatus, setFormStatus] = useState<LuvTrainingSetStatus>('draft');
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormTargetModel('');
    setFormStatus('draft');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (ts: LuvTrainingSet) => {
    setFormName(ts.name);
    setFormDescription(ts.description ?? '');
    setFormTargetModel(ts.target_model ?? '');
    setFormStatus(ts.status);
    setEditingId(ts.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    try {
      if (editingId) {
        const updated = await updateLuvTrainingSet(editingId, {
          name: formName,
          description: formDescription || null,
          target_model: formTargetModel || null,
          status: formStatus,
        });
        setTrainingSets((prev) =>
          prev.map((ts) => (ts.id === editingId ? updated : ts))
        );
      } else {
        const created = await createLuvTrainingSet({
          name: formName,
          description: formDescription || undefined,
          target_model: formTargetModel || undefined,
          status: formStatus,
        });
        setTrainingSets((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save training set:', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this training set?')) return;
    try {
      await deleteLuvTrainingSet(id);
      setTrainingSets((prev) => prev.filter((ts) => ts.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      console.error('Failed to delete training set:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {trainingSets.length} training set{trainingSets.length !== 1 && 's'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel' : 'New Training Set'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-4 max-w-lg">
          <h3 className="font-medium">
            {editingId ? 'Edit Training Set' : 'New Training Set'}
          </h3>
          <div>
            <Label htmlFor="ts-name">Name</Label>
            <Input
              id="ts-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Training set name"
            />
          </div>
          <div>
            <Label htmlFor="ts-description">Description</Label>
            <Textarea
              id="ts-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What this training set is for..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="ts-target">Target Model</Label>
            <Input
              id="ts-target"
              value={formTargetModel}
              onChange={(e) => setFormTargetModel(e.target.value)}
              placeholder="e.g. SDXL, Flux"
            />
          </div>
          <div>
            <Label htmlFor="ts-status">Status</Label>
            <select
              id="ts-status"
              value={formStatus}
              onChange={(e) =>
                setFormStatus(e.target.value as LuvTrainingSetStatus)
              }
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="exported">Exported</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Training set list */}
      <div className="space-y-3">
        {trainingSets.map((ts) => (
          <div
            key={ts.id}
            className="flex items-center gap-4 rounded-lg border p-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{ts.name}</span>
                <Badge className={STATUS_COLORS[ts.status]}>{ts.status}</Badge>
              </div>
              {ts.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {ts.description}
                </p>
              )}
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                {ts.target_model && <span>Model: {ts.target_model}</span>}
                <span>
                  Created {new Date(ts.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(ts)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => handleDelete(ts.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {trainingSets.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No training sets yet. Create one to start collecting training data.
        </p>
      )}
    </div>
  );
}
