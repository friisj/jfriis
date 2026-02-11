'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import {
  createPhotographerConfig,
  updatePhotographerConfig,
  deletePhotographerConfig,
  createDirectorConfig,
  updateDirectorConfig,
  deleteDirectorConfig,
  createProductionConfig,
  updateProductionConfig,
  deleteProductionConfig,
} from '@/lib/cog';
import {
  generatePhotographerSeed,
  generateDirectorSeed,
  generateProductionSeed,
} from '@/lib/ai/actions/generate-config-seed';
import type {
  CogPhotographerConfig,
  CogDirectorConfig,
  CogProductionConfig,
} from '@/lib/types/cog';

// ============================================================================
// Photographer Config Panel
// ============================================================================

function PhotographerPanel({ userId }: { userId: string }) {
  const [configs, setConfigs] = useState<CogPhotographerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed generation
  const [seedInput, setSeedInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showSeedInput, setShowSeedInput] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', style_description: '', style_references: '', techniques: '', testbed_notes: '',
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    const { data, error: err } = await (supabase as any)
      .from('cog_photographer_configs')
      .select('*')
      .order('name', { ascending: true });
    if (!err && data) setConfigs(data as CogPhotographerConfig[]);
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: '', description: '', style_description: '', style_references: '', techniques: '', testbed_notes: '' });
    setEditingId(null);
    setShowForm(false);
    setShowSeedInput(false);
    setSeedInput('');
    setError(null);
  }

  function startEdit(c: CogPhotographerConfig) {
    setForm({
      name: c.name,
      description: c.description || '',
      style_description: c.style_description,
      style_references: c.style_references.join(', '),
      techniques: c.techniques,
      testbed_notes: c.testbed_notes,
    });
    setEditingId(c.id);
    setShowForm(true);
    setShowSeedInput(false);
  }

  function startNew() {
    resetForm();
    setShowForm(true);
  }

  async function handleSeed() {
    if (!seedInput.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generatePhotographerSeed(seedInput.trim());
      setForm({
        name: result.name,
        description: result.description,
        style_description: result.style_description,
        style_references: result.style_references.join(', '),
        techniques: result.techniques,
        testbed_notes: result.testbed_notes,
      });
      setShowSeedInput(false);
      setSeedInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.style_description.trim()) {
      setError('Name and Style Description are required');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      style_description: form.style_description.trim(),
      style_references: form.style_references.split(',').map(r => r.trim()).filter(Boolean),
      techniques: form.techniques.trim(),
      testbed_notes: form.testbed_notes.trim(),
    };
    try {
      if (editingId) {
        const { user_id: _, ...updates } = payload;
        const updated = await updatePhotographerConfig(editingId, updates);
        setConfigs(prev => prev.map(c => c.id === editingId ? updated : c));
      } else {
        const created = await createPhotographerConfig(payload);
        setConfigs(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this photographer config?')) return;
    try {
      await deletePhotographerConfig(id);
      setConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground py-4">Loading...</p>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-2 text-xs text-destructive bg-destructive/10 rounded">{error}</div>
      )}

      {/* Config list */}
      {configs.length > 0 && (
        <div className="space-y-2">
          {configs.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => startEdit(c)} className="h-7 text-xs">Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="h-7 text-xs text-destructive hover:text-destructive">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {configs.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-2">No photographer configs yet.</p>
      )}

      {/* Form */}
      {showForm && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
          {/* Seed generation */}
          {!editingId && (
            <div>
              {showSeedInput ? (
                <div className="flex gap-2 mb-3">
                  <Input
                    value={seedInput}
                    onChange={e => setSeedInput(e.target.value)}
                    placeholder='e.g. "Annie Leibovitz intimate portrait style"'
                    className="text-sm h-8"
                    onKeyDown={e => { if (e.key === 'Enter') handleSeed(); }}
                    disabled={generating}
                  />
                  <Button size="sm" onClick={handleSeed} disabled={generating || !seedInput.trim()} className="h-8 text-xs shrink-0">
                    {generating ? 'Generating...' : 'Generate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowSeedInput(false); setSeedInput(''); }} disabled={generating} className="h-8 text-xs shrink-0">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowSeedInput(true)} className="h-7 text-xs mb-3">
                  Generate from Seed
                </Button>
              )}
            </div>
          )}

          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="text-sm h-8" />
          <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="text-sm h-8" />
          <div className="space-y-1">
            <Label className="text-xs">Style Description</Label>
            <Textarea value={form.style_description} onChange={e => setForm({ ...form, style_description: e.target.value })} placeholder="Visual style, aesthetic, signature look" className="text-sm" rows={3} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">References (comma separated)</Label>
            <Input value={form.style_references} onChange={e => setForm({ ...form, style_references: e.target.value })} placeholder="ref1, ref2, ref3" className="text-sm h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Techniques</Label>
            <Textarea value={form.techniques} onChange={e => setForm({ ...form, techniques: e.target.value })} placeholder="Lighting, lens, post-processing" className="text-sm" rows={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Testbed Notes</Label>
            <Textarea value={form.testbed_notes} onChange={e => setForm({ ...form, testbed_notes: e.target.value })} placeholder="Prompt engineering notes" className="text-sm" rows={2} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()} className="h-7 text-xs">
              {saving ? '...' : editingId ? 'Save' : 'Create'}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm} disabled={saving} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button size="sm" variant="outline" onClick={startNew} className="h-8 text-xs">
          + New Photographer Config
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Director Config Panel
// ============================================================================

function DirectorPanel({ userId }: { userId: string }) {
  const [configs, setConfigs] = useState<CogDirectorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedInput, setSeedInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showSeedInput, setShowSeedInput] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', approach_description: '', methods: '',
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    const { data, error: err } = await (supabase as any)
      .from('cog_director_configs')
      .select('*')
      .order('name', { ascending: true });
    if (!err && data) setConfigs(data as CogDirectorConfig[]);
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: '', description: '', approach_description: '', methods: '' });
    setEditingId(null);
    setShowForm(false);
    setShowSeedInput(false);
    setSeedInput('');
    setError(null);
  }

  function startEdit(c: CogDirectorConfig) {
    setForm({
      name: c.name,
      description: c.description || '',
      approach_description: c.approach_description,
      methods: c.methods,
    });
    setEditingId(c.id);
    setShowForm(true);
    setShowSeedInput(false);
  }

  function startNew() {
    resetForm();
    setShowForm(true);
  }

  async function handleSeed() {
    if (!seedInput.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateDirectorSeed(seedInput.trim());
      setForm({
        name: result.name,
        description: result.description,
        approach_description: result.approach_description,
        methods: result.methods,
      });
      setShowSeedInput(false);
      setSeedInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.approach_description.trim()) {
      setError('Name and Approach Description are required');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      approach_description: form.approach_description.trim(),
      methods: form.methods.trim(),
      interview_mapping: null,
    };
    try {
      if (editingId) {
        const { user_id: _, ...updates } = payload;
        const updated = await updateDirectorConfig(editingId, updates);
        setConfigs(prev => prev.map(c => c.id === editingId ? updated : c));
      } else {
        const created = await createDirectorConfig(payload);
        setConfigs(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this director config?')) return;
    try {
      await deleteDirectorConfig(id);
      setConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground py-4">Loading...</p>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-2 text-xs text-destructive bg-destructive/10 rounded">{error}</div>
      )}

      {configs.length > 0 && (
        <div className="space-y-2">
          {configs.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => startEdit(c)} className="h-7 text-xs">Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="h-7 text-xs text-destructive hover:text-destructive">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {configs.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-2">No director configs yet.</p>
      )}

      {showForm && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
          {!editingId && (
            <div>
              {showSeedInput ? (
                <div className="flex gap-2 mb-3">
                  <Input
                    value={seedInput}
                    onChange={e => setSeedInput(e.target.value)}
                    placeholder='e.g. "Wes Anderson symmetrical whimsy"'
                    className="text-sm h-8"
                    onKeyDown={e => { if (e.key === 'Enter') handleSeed(); }}
                    disabled={generating}
                  />
                  <Button size="sm" onClick={handleSeed} disabled={generating || !seedInput.trim()} className="h-8 text-xs shrink-0">
                    {generating ? 'Generating...' : 'Generate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowSeedInput(false); setSeedInput(''); }} disabled={generating} className="h-8 text-xs shrink-0">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowSeedInput(true)} className="h-7 text-xs mb-3">
                  Generate from Seed
                </Button>
              )}
            </div>
          )}

          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="text-sm h-8" />
          <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="text-sm h-8" />
          <div className="space-y-1">
            <Label className="text-xs">Approach Description</Label>
            <Textarea value={form.approach_description} onChange={e => setForm({ ...form, approach_description: e.target.value })} placeholder="Editorial vision, narrative style" className="text-sm" rows={3} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Methods</Label>
            <Textarea value={form.methods} onChange={e => setForm({ ...form, methods: e.target.value })} placeholder="How they brief, select talent, build mood boards" className="text-sm" rows={3} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()} className="h-7 text-xs">
              {saving ? '...' : editingId ? 'Save' : 'Create'}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm} disabled={saving} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button size="sm" variant="outline" onClick={startNew} className="h-8 text-xs">
          + New Director Config
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Production Config Panel
// ============================================================================

function ProductionPanel({ userId }: { userId: string }) {
  const [configs, setConfigs] = useState<CogProductionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedInput, setSeedInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showSeedInput, setShowSeedInput] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', shoot_details: '', editorial_notes: '', costume_notes: '', conceptual_notes: '',
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    const { data, error: err } = await (supabase as any)
      .from('cog_production_configs')
      .select('*')
      .order('name', { ascending: true });
    if (!err && data) setConfigs(data as CogProductionConfig[]);
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: '', description: '', shoot_details: '', editorial_notes: '', costume_notes: '', conceptual_notes: '' });
    setEditingId(null);
    setShowForm(false);
    setShowSeedInput(false);
    setSeedInput('');
    setError(null);
  }

  function startEdit(c: CogProductionConfig) {
    setForm({
      name: c.name,
      description: c.description || '',
      shoot_details: c.shoot_details,
      editorial_notes: c.editorial_notes,
      costume_notes: c.costume_notes,
      conceptual_notes: c.conceptual_notes,
    });
    setEditingId(c.id);
    setShowForm(true);
    setShowSeedInput(false);
  }

  function startNew() {
    resetForm();
    setShowForm(true);
  }

  async function handleSeed() {
    if (!seedInput.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateProductionSeed(seedInput.trim());
      setForm({
        name: result.name,
        description: result.description,
        shoot_details: result.shoot_details,
        editorial_notes: result.editorial_notes,
        costume_notes: result.costume_notes,
        conceptual_notes: result.conceptual_notes,
      });
      setShowSeedInput(false);
      setSeedInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      shoot_details: form.shoot_details.trim(),
      editorial_notes: form.editorial_notes.trim(),
      costume_notes: form.costume_notes.trim(),
      conceptual_notes: form.conceptual_notes.trim(),
    };
    try {
      if (editingId) {
        const { user_id: _, ...updates } = payload;
        const updated = await updateProductionConfig(editingId, updates);
        setConfigs(prev => prev.map(c => c.id === editingId ? updated : c));
      } else {
        const created = await createProductionConfig(payload);
        setConfigs(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this production config?')) return;
    try {
      await deleteProductionConfig(id);
      setConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground py-4">Loading...</p>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-2 text-xs text-destructive bg-destructive/10 rounded">{error}</div>
      )}

      {configs.length > 0 && (
        <div className="space-y-2">
          {configs.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => startEdit(c)} className="h-7 text-xs">Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="h-7 text-xs text-destructive hover:text-destructive">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {configs.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-2">No production configs yet.</p>
      )}

      {showForm && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
          {!editingId && (
            <div>
              {showSeedInput ? (
                <div className="flex gap-2 mb-3">
                  <Input
                    value={seedInput}
                    onChange={e => setSeedInput(e.target.value)}
                    placeholder='e.g. "luxury fashion editorial for Vogue"'
                    className="text-sm h-8"
                    onKeyDown={e => { if (e.key === 'Enter') handleSeed(); }}
                    disabled={generating}
                  />
                  <Button size="sm" onClick={handleSeed} disabled={generating || !seedInput.trim()} className="h-8 text-xs shrink-0">
                    {generating ? 'Generating...' : 'Generate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowSeedInput(false); setSeedInput(''); }} disabled={generating} className="h-8 text-xs shrink-0">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowSeedInput(true)} className="h-7 text-xs mb-3">
                  Generate from Seed
                </Button>
              )}
            </div>
          )}

          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="text-sm h-8" />
          <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="text-sm h-8" />
          <div className="space-y-1">
            <Label className="text-xs">Shoot Details</Label>
            <Textarea value={form.shoot_details} onChange={e => setForm({ ...form, shoot_details: e.target.value })} placeholder="Studio vs location, set design, equipment" className="text-sm" rows={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Editorial Notes</Label>
            <Textarea value={form.editorial_notes} onChange={e => setForm({ ...form, editorial_notes: e.target.value })} placeholder="Retouching, color grading, compositing" className="text-sm" rows={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Costume Notes</Label>
            <Textarea value={form.costume_notes} onChange={e => setForm({ ...form, costume_notes: e.target.value })} placeholder="Wardrobe, makeup, hair, accessories" className="text-sm" rows={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Conceptual Notes</Label>
            <Textarea value={form.conceptual_notes} onChange={e => setForm({ ...form, conceptual_notes: e.target.value })} placeholder="Themes, symbolism, mood, narrative" className="text-sm" rows={2} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()} className="h-7 text-xs">
              {saving ? '...' : editingId ? 'Save' : 'Create'}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm} disabled={saving} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button size="sm" variant="outline" onClick={startNew} className="h-8 text-xs">
          + New Production Config
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Config Library (main export)
// ============================================================================

export function ConfigLibrary() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  if (!userId) {
    return <p className="text-sm text-muted-foreground py-4">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Config Library</h2>
        <p className="text-sm text-muted-foreground">
          Global creative personas reusable across any series or pipeline job.
        </p>
      </div>

      <Tabs defaultValue="photographer">
        <TabsList>
          <TabsTrigger value="photographer">Photographers</TabsTrigger>
          <TabsTrigger value="director">Directors</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
        </TabsList>

        <TabsContent value="photographer" className="mt-4">
          <PhotographerPanel userId={userId} />
        </TabsContent>
        <TabsContent value="director" className="mt-4">
          <DirectorPanel userId={userId} />
        </TabsContent>
        <TabsContent value="production" className="mt-4">
          <ProductionPanel userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
