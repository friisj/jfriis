/**
 * Agent Chat: Client-side operations
 *
 * Uses the browser Supabase client for operations that need
 * the user's auth cookie (conversation creation from the UI).
 */

import { createBrowserClient } from '@supabase/ssr';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function createAgentConversationClient(input: {
  agent: string;
  title?: string;
  model?: string;
}): Promise<{ id: string }> {
  const client = getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('agent_conversations')
    .insert({
      agent: input.agent,
      title: input.title || null,
      model: input.model || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}
