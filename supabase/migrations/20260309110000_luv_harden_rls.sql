-- Harden RLS policies on luv_* tables
-- Several tables had overly permissive select policies (using (true))
-- or a fully open policy. All luv tables are internal tool data that
-- should only be accessible to the admin user.

-- 1. luv_memories: was "for all using (true)" — completely open
drop policy if exists "Admin full access" on luv_memories;
create policy "Admin full access on luv_memories"
  on luv_memories for all
  using (is_admin())
  with check (is_admin());

-- 2. luv_chassis_modules: select was using (true)
drop policy if exists "luv_chassis_modules_select" on luv_chassis_modules;
create policy "luv_chassis_modules_select" on luv_chassis_modules
  for select using (is_admin());

-- 3. luv_chassis_module_versions: select was using (true)
drop policy if exists "luv_chassis_module_versions_select" on luv_chassis_module_versions;
create policy "luv_chassis_module_versions_select" on luv_chassis_module_versions
  for select using (is_admin());

-- 4. luv_chassis_module_media: select was using (true)
drop policy if exists "luv_chassis_module_media_select" on luv_chassis_module_media;
create policy "luv_chassis_module_media_select" on luv_chassis_module_media
  for select using (is_admin());

-- luv_scenes: already uses is_admin() for all ops (created in 20260309100000)
