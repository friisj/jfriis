'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import {
  createPhotographerConfig, updatePhotographerConfig, deletePhotographerConfig,
  createDirectorConfig, updateDirectorConfig, deleteDirectorConfig,
  createProductionConfig, updateProductionConfig, deleteProductionConfig,
} from '@/lib/cog';
import {
  generatePhotographerSeed, generateDirectorSeed, generateProductionSeed,
} from '@/lib/ai/actions/generate-config-seed';
import type {
  CogPhotographerConfig, CogDirectorConfig, CogProductionConfig,
} from '@/lib/types/cog';

// ============================================================================
// Types & config definitions
// ============================================================================

type ConfigType = 'photographer' | 'director' | 'production';
type AnyConfig = CogPhotographerConfig | CogDirectorConfig | CogProductionConfig;

interface FieldDef {
  key: string;
  label: string;
  kind: 'input' | 'textarea';
  placeholder: string;
  rows?: number;
}

interface EditingState {
  type: ConfigType;
  config?: AnyConfig;
}

const TYPE_DEFS: Record<ConfigType, {
  title: string;
  singular: string;
  table: string;
  seedPlaceholder: string;
  fields: FieldDef[];
}> = {
  photographer: {
    title: 'Photographers',
    singular: 'photographer',
    table: 'cog_photographer_configs',
    seedPlaceholder: 'e.g. "Annie Leibovitz intimate portrait style"',
    fields: [
      { key: 'style_description', label: 'Style Description', kind: 'textarea', placeholder: 'Visual style, aesthetic, signature look', rows: 3 },
      { key: 'style_references', label: 'References (comma separated)', kind: 'input', placeholder: 'ref1, ref2, ref3' },
      { key: 'techniques', label: 'Techniques', kind: 'textarea', placeholder: 'Lighting, lens, post-processing', rows: 2 },
      { key: 'testbed_notes', label: 'Testbed Notes', kind: 'textarea', placeholder: 'Prompt engineering notes', rows: 2 },
    ],
  },
  director: {
    title: 'Directors',
    singular: 'director',
    table: 'cog_director_configs',
    seedPlaceholder: 'e.g. "Wes Anderson symmetrical whimsy"',
    fields: [
      { key: 'approach_description', label: 'Approach Description', kind: 'textarea', placeholder: 'Editorial vision, narrative style', rows: 3 },
      { key: 'methods', label: 'Methods', kind: 'textarea', placeholder: 'How they brief, select talent, build mood boards', rows: 3 },
    ],
  },
  production: {
    title: 'Production',
    singular: 'production',
    table: 'cog_production_configs',
    seedPlaceholder: 'e.g. "luxury fashion editorial for Vogue"',
    fields: [
      { key: 'shoot_details', label: 'Shoot Details', kind: 'textarea', placeholder: 'Studio vs location, set design, equipment', rows: 2 },
      { key: 'editorial_notes', label: 'Editorial Notes', kind: 'textarea', placeholder: 'Retouching, color grading, compositing', rows: 2 },
      { key: 'costume_notes', label: 'Costume Notes', kind: 'textarea', placeholder: 'Wardrobe, makeup, hair, accessories', rows: 2 },
      { key: 'conceptual_notes', label: 'Conceptual Notes', kind: 'textarea', placeholder: 'Themes, symbolism, mood, narrative', rows: 2 },
    ],
  },
};

// ============================================================================
// Per-type helpers
// ============================================================================

function configToForm(type: ConfigType, config: AnyConfig): Record<string, string> {
  const base: Record<string, string> = { name: config.name, description: config.description || '' };
  if (type === 'photographer') {
    const c = config as CogPhotographerConfig;
    return { ...base, style_description: c.style_description, style_references: c.style_references.join(', '), techniques: c.techniques, testbed_notes: c.testbed_notes };
  }
  if (type === 'director') {
    const c = config as CogDirectorConfig;
    return { ...base, approach_description: c.approach_description, methods: c.methods };
  }
  const c = config as CogProductionConfig;
  return { ...base, shoot_details: c.shoot_details, editorial_notes: c.editorial_notes, costume_notes: c.costume_notes, conceptual_notes: c.conceptual_notes };
}

function emptyForm(type: ConfigType): Record<string, string> {
  const form: Record<string, string> = { name: '', description: '' };
  for (const f of TYPE_DEFS[type].fields) form[f.key] = '';
  return form;
}

async function runSeedGeneration(type: ConfigType, input: string): Promise<Record<string, string>> {
  if (type === 'photographer') {
    const r = await generatePhotographerSeed(input);
    return { name: r.name, description: r.description, style_description: r.style_description, style_references: r.style_references.join(', '), techniques: r.techniques, testbed_notes: r.testbed_notes };
  }
  if (type === 'director') {
    const r = await generateDirectorSeed(input);
    return { name: r.name, description: r.description, approach_description: r.approach_description, methods: r.methods };
  }
  const r = await generateProductionSeed(input);
  return { name: r.name, description: r.description, shoot_details: r.shoot_details, editorial_notes: r.editorial_notes, costume_notes: r.costume_notes, conceptual_notes: r.conceptual_notes };
}

async function saveConfig(type: ConfigType, form: Record<string, string>, userId: string, editingId: string | null) {
  const base = { name: form.name.trim(), description: form.description.trim() || null };

  if (type === 'photographer') {
    const fields = { ...base, style_description: form.style_description.trim(), style_references: form.style_references.split(',').map(r => r.trim()).filter(Boolean), techniques: form.techniques.trim(), testbed_notes: form.testbed_notes.trim() };
    return editingId ? updatePhotographerConfig(editingId, fields) : createPhotographerConfig({ ...fields, user_id: userId });
  }
  if (type === 'director') {
    const fields = { ...base, approach_description: form.approach_description.trim(), methods: form.methods.trim(), interview_mapping: null };
    return editingId ? updateDirectorConfig(editingId, fields) : createDirectorConfig({ ...fields, user_id: userId });
  }
  const fields = { ...base, shoot_details: form.shoot_details.trim(), editorial_notes: form.editorial_notes.trim(), costume_notes: form.costume_notes.trim(), conceptual_notes: form.conceptual_notes.trim() };
  return editingId ? updateProductionConfig(editingId, fields) : createProductionConfig({ ...fields, user_id: userId });
}

async function removeConfig(type: ConfigType, id: string) {
  if (type === 'photographer') return deletePhotographerConfig(id);
  if (type === 'director') return deleteDirectorConfig(id);
  return deleteProductionConfig(id);
}

// ============================================================================
// List column (generic for all types)
// ============================================================================

function ConfigColumn({ type, onEdit, onNew }: {
  type: ConfigType;
  onEdit: (config: AnyConfig) => void;
  onNew: () => void;
}) {
  const [configs, setConfigs] = useState<AnyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const def = TYPE_DEFS[type];

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from(def.table).select('*').order('name', { ascending: true })
      .then(({ data, error }: { data: AnyConfig[] | null; error: unknown }) => {
        if (!error && data) setConfigs(data);
        setLoading(false);
      });
  }, [def.table]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{def.title}</h3>
        <Button size="sm" variant="ghost" onClick={onNew} className="h-6 w-6 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground py-4">Loading...</p>
      ) : configs.length > 0 ? (
        <div className="space-y-1.5">
          {configs.map(c => (
            <button key={c.id} type="button" onClick={() => onEdit(c)} className="w-full text-left p-2 border rounded-md hover:bg-muted/30 cursor-pointer">
              <p className="text-sm font-medium">{c.name}</p>
              {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2">No configs yet.</p>
      )}
    </div>
  );
}

// ============================================================================
// Form view (handles create/edit for all types)
// ============================================================================

function ConfigFormView({ type, config, userId, onDone }: {
  type: ConfigType;
  config?: AnyConfig;
  userId: string;
  onDone: () => void;
}) {
  const def = TYPE_DEFS[type];
  const editingId = config?.id ?? null;
  const [form, setForm] = useState<Record<string, string>>(
    config ? configToForm(type, config) : emptyForm(type)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedInput, setSeedInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showSeedInput, setShowSeedInput] = useState(false);

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSeed() {
    if (!seedInput.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      setForm(await runSeedGeneration(type, seedInput.trim()));
      setShowSeedInput(false);
      setSeedInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      await saveConfig(type, form, userId, editingId);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingId || !confirm(`Delete this ${def.singular} config?`)) return;
    try {
      await removeConfig(type, editingId);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onDone} className="h-7 px-2 text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <h3 className="text-sm font-semibold">
          {editingId ? `Edit ${def.singular}` : `New ${def.singular}`}
        </h3>
      </div>

      {error && <div className="p-2 text-xs text-destructive bg-destructive/10 rounded">{error}</div>}

      <div className="space-y-3">
        {!editingId && (
          showSeedInput ? (
            <div className="flex gap-2">
              <Input value={seedInput} onChange={e => setSeedInput(e.target.value)} placeholder={def.seedPlaceholder} className="text-sm h-8" onKeyDown={e => { if (e.key === 'Enter') handleSeed(); }} disabled={generating} />
              <Button size="sm" onClick={handleSeed} disabled={generating || !seedInput.trim()} className="h-8 text-xs shrink-0">
                {generating ? '...' : 'Generate'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowSeedInput(false); setSeedInput(''); }} disabled={generating} className="h-8 text-xs shrink-0">
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowSeedInput(true)} className="h-7 text-xs">
              Generate from Seed
            </Button>
          )
        )}

        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Name" className="text-sm h-8" />
        <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description (optional)" className="text-sm h-8" />

        {def.fields.map(f => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            {f.kind === 'textarea' ? (
              <Textarea value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className="text-sm" rows={f.rows ?? 2} />
            ) : (
              <Input value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className="text-sm h-8" />
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()} className="h-7 text-xs">
            {saving ? '...' : editingId ? 'Save' : 'Create'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDone} disabled={saving} className="h-7 text-xs">Cancel</Button>
          {editingId && (
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={saving} className="h-7 text-xs text-destructive hover:text-destructive ml-auto">Delete</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Config Library (main export)
// ============================================================================

export function ConfigLibrary() {
  const [userId, setUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  function done() {
    setEditing(null);
    setRefreshKey(k => k + 1);
  }

  if (!userId) {
    return <p className="text-sm text-muted-foreground py-4">Loading...</p>;
  }

  if (editing) {
    return (
      <ConfigFormView type={editing.type} config={editing.config} userId={userId} onDone={done} />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6" key={refreshKey}>
      <ConfigColumn type="photographer" onEdit={c => setEditing({ type: 'photographer', config: c })} onNew={() => setEditing({ type: 'photographer' })} />
      <ConfigColumn type="director" onEdit={c => setEditing({ type: 'director', config: c })} onNew={() => setEditing({ type: 'director' })} />
      <ConfigColumn type="production" onEdit={c => setEditing({ type: 'production', config: c })} onNew={() => setEditing({ type: 'production' })} />
    </div>
  );
}
