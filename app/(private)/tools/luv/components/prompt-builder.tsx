'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  createLuvTemplate,
  updateLuvTemplate,
  deleteLuvTemplate,
} from '@/lib/luv';
import type {
  LuvPromptTemplate,
  LuvPromptCategory,
  CreateLuvPromptTemplateInput,
} from '@/lib/types/luv';

interface PromptBuilderProps {
  initialTemplates: LuvPromptTemplate[];
}

const CATEGORIES: LuvPromptCategory[] = [
  'chassis',
  'aesthetic',
  'context',
  'style',
];

export function PromptBuilder({ initialTemplates }: PromptBuilderProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<LuvPromptCategory>('chassis');
  const [formTemplate, setFormTemplate] = useState('');
  const [formParams, setFormParams] = useState('{}');

  const resetForm = () => {
    setFormName('');
    setFormCategory('chassis');
    setFormTemplate('');
    setFormParams('{}');
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (t: LuvPromptTemplate) => {
    setFormName(t.name);
    setFormCategory(t.category);
    setFormTemplate(t.template);
    setFormParams(JSON.stringify(t.parameters, null, 2));
    setEditing(t.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formTemplate.trim()) return;
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
        const updated = await updateLuvTemplate(editing, {
          name: formName,
          category: formCategory,
          template: formTemplate,
          parameters,
        });
        setTemplates((prev) =>
          prev.map((t) => (t.id === editing ? updated : t))
        );
      } else {
        const input: CreateLuvPromptTemplateInput = {
          name: formName,
          category: formCategory,
          template: formTemplate,
          parameters,
        };
        const created = await createLuvTemplate(input);
        setTemplates((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save template:', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteLuvTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (editing === id) resetForm();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: templates.filter((t) => t.category === cat),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 && 's'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel' : 'New Template'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="font-medium">
            {editing ? 'Edit Template' : 'New Template'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Template name"
              />
            </div>
            <div>
              <Label htmlFor="tpl-category">Category</Label>
              <select
                id="tpl-category"
                value={formCategory}
                onChange={(e) =>
                  setFormCategory(e.target.value as LuvPromptCategory)
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="tpl-template">Template</Label>
            <Textarea
              id="tpl-template"
              value={formTemplate}
              onChange={(e) => setFormTemplate(e.target.value)}
              placeholder="Prompt template text with {{variables}}"
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="tpl-params">Parameters (JSON)</Label>
            <Textarea
              id="tpl-params"
              value={formParams}
              onChange={(e) => setFormParams(e.target.value)}
              rows={3}
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

      {/* Template list */}
      {grouped.map(
        ({ category, items }) =>
          items.length > 0 && (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{t.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {t.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {t.template}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(t)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(t.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )
      )}

      {templates.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No templates yet. Create one to get started.
        </p>
      )}
    </div>
  );
}
