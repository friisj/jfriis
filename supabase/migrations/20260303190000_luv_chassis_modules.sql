-- Luv: Modular Chassis Architecture
-- Replaces monolithic chassis_data JSONB with versioned, schema-driven modules.
-- Three tables: modules, versions, media.

-- ============================================================================
-- luv_chassis_modules: Core module definitions
-- ============================================================================

create table luv_chassis_modules (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null default 'general',
  description text,
  current_version int not null default 1,
  parameters jsonb not null default '{}',
  schema_key text not null,
  sequence int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_luv_chassis_modules_category on luv_chassis_modules(category);
create index idx_luv_chassis_modules_sequence on luv_chassis_modules(sequence);

-- ============================================================================
-- luv_chassis_module_versions: Parameter snapshots for version history
-- ============================================================================

create table luv_chassis_module_versions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references luv_chassis_modules(id) on delete cascade,
  version int not null,
  parameters jsonb not null default '{}',
  change_summary text,
  created_at timestamptz not null default now()
);

create index idx_luv_chassis_module_versions_module on luv_chassis_module_versions(module_id);
create unique index idx_luv_chassis_module_versions_unique on luv_chassis_module_versions(module_id, version);

-- ============================================================================
-- luv_chassis_module_media: Media attachments per module parameter
-- ============================================================================

create table luv_chassis_module_media (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references luv_chassis_modules(id) on delete cascade,
  parameter_key text not null,
  type text not null default 'image',
  storage_path text not null,
  description text,
  created_at timestamptz not null default now()
);

create index idx_luv_chassis_module_media_module on luv_chassis_module_media(module_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create or replace function luv_chassis_modules_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_luv_chassis_modules_updated_at
  before update on luv_chassis_modules
  for each row execute function luv_chassis_modules_updated_at();

-- ============================================================================
-- RLS policies (admin-only via is_admin())
-- ============================================================================

alter table luv_chassis_modules enable row level security;
alter table luv_chassis_module_versions enable row level security;
alter table luv_chassis_module_media enable row level security;

-- Modules
create policy "luv_chassis_modules_select" on luv_chassis_modules
  for select using (true);
create policy "luv_chassis_modules_insert" on luv_chassis_modules
  for insert with check (is_admin());
create policy "luv_chassis_modules_update" on luv_chassis_modules
  for update using (is_admin());
create policy "luv_chassis_modules_delete" on luv_chassis_modules
  for delete using (is_admin());

-- Versions
create policy "luv_chassis_module_versions_select" on luv_chassis_module_versions
  for select using (true);
create policy "luv_chassis_module_versions_insert" on luv_chassis_module_versions
  for insert with check (is_admin());

-- Media
create policy "luv_chassis_module_media_select" on luv_chassis_module_media
  for select using (true);
create policy "luv_chassis_module_media_insert" on luv_chassis_module_media
  for insert with check (is_admin());
create policy "luv_chassis_module_media_update" on luv_chassis_module_media
  for update using (is_admin());
create policy "luv_chassis_module_media_delete" on luv_chassis_module_media
  for delete using (is_admin());
