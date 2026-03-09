-- Remix: jobs and recipes tables
-- Tracks pipeline runs and reusable recipe configurations for the
-- source-aware audio recomposition pipeline.

-- ---------------------------------------------------------------------------
-- remix_recipes — saved pipeline configurations
-- ---------------------------------------------------------------------------

create table remix_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  config jsonb not null,           -- full Recipe JSON (separation, analysis, chopping, patterns, arrangement, mixdown)
  is_preset boolean default false, -- true for built-in presets, false for user-created
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table remix_recipes is 'Saved pipeline configurations (recipes) for Remix. Each recipe encodes creative intent as pipeline parameters.';
comment on column remix_recipes.config is 'Full Recipe JSON matching the Recipe TypeScript interface in lib/types/remix.ts';
comment on column remix_recipes.is_preset is 'Built-in presets (synth-to-ambient, lofi-chop) vs user-created recipes';

-- ---------------------------------------------------------------------------
-- remix_jobs — pipeline run tracking
-- ---------------------------------------------------------------------------

create table remix_jobs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references remix_recipes(id) on delete set null,
  recipe_snapshot jsonb not null,  -- frozen copy of recipe at job creation time
  source_audio_url text not null,
  source_filename text not null,
  status text not null default 'uploading'
    check (status in ('uploading', 'separating', 'analyzing', 'chopping', 'patterning', 'arranging', 'mixing', 'complete', 'error')),
  current_stage integer not null default 0,  -- 0=not started, 1-6=active stage

  -- Stage outputs (populated as pipeline progresses)
  stem_set jsonb,          -- StemSet: stems with audio URLs
  analysis jsonb,          -- AnalysisResult: BPM, key, transients, energy
  sample_bank jsonb,       -- SampleBank: chops with metadata
  pattern_set jsonb,       -- PatternSet: sequenced patterns
  arrangement jsonb,       -- Arrangement: sections × lanes
  mixdown_output jsonb,    -- MixdownOutput: final rendered file

  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table remix_jobs is 'Pipeline run tracking for Remix. Each job represents one end-to-end pipeline execution with stage-by-stage output.';
comment on column remix_jobs.recipe_snapshot is 'Frozen copy of the recipe at creation time — jobs are reproducible even if the recipe is later modified';
comment on column remix_jobs.current_stage is '0=not started, 1=separating, 2=analyzing, 3=chopping, 4=patterning, 5=arranging, 6=mixing';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_remix_jobs_status on remix_jobs(status);
create index idx_remix_jobs_created on remix_jobs(created_at desc);
create index idx_remix_recipes_preset on remix_recipes(is_preset) where is_preset = true;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

alter table remix_recipes enable row level security;
alter table remix_jobs enable row level security;

-- For now, allow all operations for authenticated users (single-user app)
create policy "Authenticated users can manage recipes"
  on remix_recipes for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage jobs"
  on remix_jobs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Service role needs full access for the Python microservice
create policy "Service role full access to recipes"
  on remix_recipes for all
  using (auth.role() = 'service_role');

create policy "Service role full access to jobs"
  on remix_jobs for all
  using (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function remix_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger remix_recipes_updated_at
  before update on remix_recipes
  for each row execute function remix_updated_at();

create trigger remix_jobs_updated_at
  before update on remix_jobs
  for each row execute function remix_updated_at();

-- ---------------------------------------------------------------------------
-- Seed built-in recipe presets
-- ---------------------------------------------------------------------------

insert into remix_recipes (name, description, is_preset, config) values
(
  'synth-to-ambient',
  'Dissolve synth-heavy source into ambient atmosphere. Emphasizes melodic/harmonic stems, deprioritizes percussion, favors long phrases and slow evolution.',
  true,
  '{
    "separation": {"model": "htdemucs_6s", "stems": 6},
    "analysis": {"detect_key": true, "energy_resolution": "bar"},
    "chopping": {"strategy": "bar", "min_length_ms": 2000, "max_length_ms": 16000, "prefer_sustained": true, "stems_override": {"drums": {"strategy": "transient", "min_length_ms": 200}}},
    "patterns": {"density": 0.15, "swing": 0, "variation_rate": 0.1, "humanize": 0.3, "pitch_range": 5, "allow_reverse": true, "stems_override": {"drums": {"density": 0.05}, "vocals": {"density": 0.08}}},
    "arrangement": {"sections": [{"name": "intro", "length_bars": 8, "active_stems": ["other", "piano"], "energy": 0.2}, {"name": "drift", "length_bars": 16, "active_stems": ["other", "piano", "bass"], "energy": 0.3}, {"name": "swell", "length_bars": 16, "active_stems": ["other", "piano", "bass", "guitar", "vocals"], "energy": 0.6}, {"name": "peak", "length_bars": 8, "active_stems": ["other", "piano", "bass", "guitar", "vocals", "drums"], "energy": 0.8}, {"name": "dissolve", "length_bars": 16, "active_stems": ["other", "piano", "vocals"], "energy": 0.2}], "phrase_length": 8, "energy_curve": "arc"},
    "mixdown": {"reverb": 0.7, "reverb_decay": 4.5, "compression": 0.15, "stereo_width": 1.4, "per_stem": {"drums": {"volume": 0.2, "reverb_send": 0.9, "delay_send": 0.3, "delay_time_ms": 375}, "bass": {"volume": 0.5, "pan": 0, "reverb_send": 0.4}, "vocals": {"volume": 0.35, "reverb_send": 0.8, "delay_send": 0.5, "delay_time_ms": 500}, "other": {"volume": 0.7, "reverb_send": 0.6}, "guitar": {"volume": 0.5, "reverb_send": 0.5}, "piano": {"volume": 0.6, "reverb_send": 0.6, "pan": -0.2}}}
  }'::jsonb
),
(
  'lofi-chop',
  'Classic sample-culture treatment. Chop melodic material into short phrases, add swing and dust. Warm, intimate, head-nodding.',
  true,
  '{
    "separation": {"model": "htdemucs", "stems": 4},
    "analysis": {"detect_key": true, "energy_resolution": "beat"},
    "chopping": {"strategy": "hybrid", "min_length_ms": 250, "max_length_ms": 4000, "prefer_sustained": false},
    "patterns": {"density": 0.45, "swing": 0.6, "variation_rate": 0.3, "humanize": 0.5, "pitch_range": 3, "allow_reverse": true, "stems_override": {"drums": {"density": 0.6, "swing": 0.4}}},
    "arrangement": {"sections": [{"name": "intro", "length_bars": 4, "active_stems": ["other"], "energy": 0.3}, {"name": "verse", "length_bars": 8, "active_stems": ["other", "drums", "bass"], "energy": 0.5}, {"name": "hook", "length_bars": 4, "active_stems": ["other", "drums", "bass", "vocals"], "energy": 0.7}, {"name": "verse", "length_bars": 8, "active_stems": ["other", "drums", "bass"], "energy": 0.5}, {"name": "hook", "length_bars": 4, "active_stems": ["other", "drums", "bass", "vocals"], "energy": 0.7}, {"name": "outro", "length_bars": 4, "active_stems": ["other"], "energy": 0.2}], "phrase_length": 4, "energy_curve": "wave"},
    "mixdown": {"reverb": 0.25, "reverb_decay": 1.5, "compression": 0.5, "stereo_width": 0.9, "per_stem": {"drums": {"volume": 0.7, "reverb_send": 0.15}, "bass": {"volume": 0.65, "pan": 0, "reverb_send": 0.1}, "vocals": {"volume": 0.4, "reverb_send": 0.3, "delay_send": 0.2, "delay_time_ms": 250}, "other": {"volume": 0.6, "reverb_send": 0.2}}}
  }'::jsonb
);
