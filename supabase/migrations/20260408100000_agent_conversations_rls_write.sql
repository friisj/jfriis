-- Allow authenticated users to insert and update agent_conversations and agent_messages
-- (single-user system, authenticated = admin)

create policy "Authenticated users can insert" on agent_conversations
  for insert to authenticated with check (true);

create policy "Authenticated users can update" on agent_conversations
  for update to authenticated using (true) with check (true);

create policy "Authenticated users can insert" on agent_messages
  for insert to authenticated with check (true);

create policy "Authenticated users can update" on agent_messages
  for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete" on agent_messages
  for delete to authenticated using (true);
