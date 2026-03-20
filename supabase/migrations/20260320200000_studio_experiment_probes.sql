-- Studio Experiment Probes
--
-- Structured, pre-planned questions attached to experiments.
-- Probes are generated (by AI or manually) to extract signal about
-- whether the experiment validates or invalidates its hypothesis.
-- Unlike feedback (which captures emergent observations), probes
-- define what you want to learn upfront.

create table studio_experiment_probes (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references studio_experiments(id) on delete cascade,

  -- The probe itself
  question text not null,
  context text,  -- optional clarification / why this probe matters

  -- Response configuration
  response_type text not null default 'text'
    check (response_type in ('text', 'rating', 'choice', 'boolean')),
  choices jsonb,       -- for 'choice': ["option1", "option2", ...]
  rating_min int,      -- for 'rating': lower bound (default 1)
  rating_max int,      -- for 'rating': upper bound (default 5)
  rating_labels jsonb, -- for 'rating': {"1": "Poor", "5": "Excellent"}

  -- Response (filled in by the user)
  response jsonb,        -- text string, number, chosen option, or boolean
  responded_at timestamptz,

  -- Ordering and phase
  sequence int not null default 0,
  phase text not null default 'during'
    check (phase in ('pre', 'during', 'post')),

  -- Provenance
  generated_by text not null default 'manual'
    check (generated_by in ('auto', 'manual')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_probes_experiment on studio_experiment_probes(experiment_id);
create index idx_probes_phase on studio_experiment_probes(phase);
create index idx_probes_unanswered on studio_experiment_probes(experiment_id)
  where response is null;

-- RLS
alter table studio_experiment_probes enable row level security;

create policy "Public read access" on studio_experiment_probes
  for select using (true);

create policy "Admin insert" on studio_experiment_probes
  for insert with check (true);

create policy "Admin update" on studio_experiment_probes
  for update using (true);

create policy "Admin delete" on studio_experiment_probes
  for delete using (true);

-- Updated_at trigger (reuse existing function if available)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on studio_experiment_probes
  for each row execute function update_updated_at_column();

comment on table studio_experiment_probes is
  'Structured questions attached to experiments. Probes define what you want to learn; responses provide the signal.';
comment on column studio_experiment_probes.phase is
  'When to ask: pre (before testing), during (while testing), post (after testing)';
comment on column studio_experiment_probes.response_type is
  'text = freeform, rating = numeric scale, choice = pick from list, boolean = yes/no';
comment on column studio_experiment_probes.generated_by is
  'auto = AI-generated via /probe-experiment skill, manual = hand-written';
