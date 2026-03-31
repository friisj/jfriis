-- luv_video_jobs: tracks async video generation requests for Luv's agent
--
-- Two-tool pattern: start_video_generation submits a job and returns a UUID.
-- check_video_generation polls the provider and updates the row.
-- Completed jobs store the video in Supabase storage (cog-images bucket).

create table luv_video_jobs (
  id uuid primary key default gen_random_uuid(),

  -- provider and external reference
  provider text not null check (provider in ('veo', 'grok')),
  external_id text not null,            -- Veo: operation name, Grok: request_id

  -- generation inputs
  prompt text not null,
  aspect_ratio text,
  duration_seconds integer,             -- Veo: 4/6/8; Grok: 1-15
  resolution text,                      -- '720p' | '1080p' | '4K'
  model text,                           -- provider model alias
  reference_image_count integer default 0,

  -- lifecycle
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,

  -- completed output
  storage_path text,                    -- luv/videos/<timestamp>-<uuid>.mp4
  cog_image_id uuid,                    -- row in cog_images (video tracked here too)
  cog_series_id uuid,

  -- metadata
  provider_config jsonb default '{}'::jsonb,
  duration_ms integer,                  -- wall time from start to download complete

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table luv_video_jobs is
  'Async video generation jobs for Luv agent. Created by start_video_generation, '
  'updated by check_video_generation. Videos stored in cog-images bucket under luv/videos/.';

-- Keep updated_at current
create or replace function luv_video_jobs_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger luv_video_jobs_updated_at
  before update on luv_video_jobs
  for each row execute function luv_video_jobs_set_updated_at();

-- RLS: single-user tool, service role only for writes; authenticated reads
alter table luv_video_jobs enable row level security;

create policy "Service role full access"
  on luv_video_jobs
  for all
  to service_role
  using (true)
  with check (true);

create policy "Authenticated users can read"
  on luv_video_jobs
  for select
  to authenticated
  using (true);
