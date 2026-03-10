-- Luv Reinforcement Review: sessions and items for visual identity calibration.
-- Sessions are batches of uploaded images evaluated independently by
-- the human operator and Luv's agent, then compared at report time.

-- Extend scene component CHECK to allow the new reinforcement-review component
alter table luv_scenes drop constraint if exists luv_scenes_component_check;
alter table luv_scenes add constraint luv_scenes_component_check
  check (component in ('generative-prompt', 'reinforcement-review'));

-- Review sessions (one per batch of images)
create table luv_review_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  image_count integer not null default 0,
  summary text,  -- end-of-batch report markdown
  artifact_id uuid references luv_artifacts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Review items (one per image in a session)
create table luv_review_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references luv_review_sessions(id) on delete cascade,
  storage_path text not null,
  sequence integer not null default 0,

  -- Human evaluation
  human_classification text check (human_classification in ('me', 'not_me', 'skip')),
  human_confidence integer check (human_confidence between 1 and 5),
  human_notes text,

  -- Agent evaluation (blind — does not see human ratings)
  agent_classification text check (agent_classification in ('me', 'not_me')),
  agent_confidence integer check (agent_confidence between 1 and 5),
  agent_reasoning text,

  -- Reinforcement
  reinforcement_notes text,
  module_links text[] not null default '{}',

  -- Promotion to reference
  promoted_to_reference_id uuid references luv_references(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_luv_review_items_session on luv_review_items(session_id);

-- RLS: admin-only
alter table luv_review_sessions enable row level security;
alter table luv_review_items enable row level security;

create policy "Admin full access on luv_review_sessions"
  on luv_review_sessions for all using (is_admin());

create policy "Admin full access on luv_review_items"
  on luv_review_items for all using (is_admin());

-- Updated-at triggers
create trigger set_luv_review_sessions_updated_at
  before update on luv_review_sessions
  for each row execute function update_updated_at_column();

create trigger set_luv_review_items_updated_at
  before update on luv_review_items
  for each row execute function update_updated_at_column();

-- Seed the reinforcement-review scene
insert into luv_scenes (slug, name, description, category, tags, required_modules, optional_modules, surface, component, status)
values (
  'reinforcement-review',
  'Reinforcement Review',
  'Evaluate images against chassis parameters — classify as consistent or deviant, capture reasoning, and promote validated images to references.',
  'diagnostic',
  '{review,calibration,reinforcement}',
  '{}',
  '{}',
  'dom',
  'reinforcement-review',
  'prototype'
);
