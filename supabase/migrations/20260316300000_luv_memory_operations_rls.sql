-- Harden RLS on luv_memory_operations: restrict to admin only
-- Mirrors the policy applied to luv_memories in 20260309110000.

drop policy if exists "Admin full access" on luv_memory_operations;

create policy "Admin full access on luv_memory_operations"
  on luv_memory_operations for all
  using (is_admin())
  with check (is_admin());
