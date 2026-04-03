-- luv_gen_jobs: tracks async image generation jobs for Luv's agent
--
-- Two-phase pattern: start_* tools create a job row and return immediately.
-- check_gen_job executes the pipeline (if pending) and returns the result.
-- Supports image generation, chassis studies, and sketch studies.

create table luv_gen_jobs (
  id uuid primary key default gen_random_uuid(),

  -- job type discriminator
  job_type text not null check (job_type in ('image', 'chassis_study', 'sketch_study')),

  -- lifecycle
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),

  -- inputs (full params stored for execution by check_gen_job)
  input_params jsonb not null default '{}'::jsonb,

  -- results
  image_url text,
  cog_image_id uuid,
  result_data jsonb,              -- full tool result payload
  error_message text,
  duration_ms integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table luv_gen_jobs is
  'Async image generation jobs for Luv agent. Created by start_image_generation / '
  'start_chassis_study / start_sketch_study tools. Executed and completed by check_gen_job.';

-- Keep updated_at current
create or replace function luv_gen_jobs_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger luv_gen_jobs_updated_at
  before update on luv_gen_jobs
  for each row execute function luv_gen_jobs_set_updated_at();

-- RLS: single-user tool, service role for writes, authenticated reads
alter table luv_gen_jobs enable row level security;

create policy "Service role full access"
  on luv_gen_jobs
  for all
  to service_role
  using (true)
  with check (true);

create policy "Authenticated users can read"
  on luv_gen_jobs
  for select
  to authenticated
  using (true);
