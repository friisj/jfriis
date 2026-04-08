/**
 * Agent Chat: Server-side database operations
 *
 * Shared data layer for multi-agent conversations (Chief, future agents).
 * Mirrors Luv's conversation/message pattern but with an `agent` discriminator.
 */

import { createClient } from './supabase-server';

export interface AgentConversation {
  id: string;
  agent: string;
  title: string | null;
  model: string | null;
  turn_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | null;
  parts: unknown;
  created_at: string;
}

// ============================================================================
// Conversations
// ============================================================================

export async function createAgentConversation(input: {
  agent: string;
  title?: string;
  model?: string;
  metadata?: Record<string, unknown>;
}): Promise<AgentConversation> {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('agent_conversations')
    .insert({
      agent: input.agent,
      title: input.title || null,
      model: input.model || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as AgentConversation;
}

export async function getAgentConversation(id: string): Promise<AgentConversation | null> {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('agent_conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as AgentConversation;
}

export async function listAgentConversations(
  agent: string,
  limit = 20,
): Promise<AgentConversation[]> {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('agent_conversations')
    .select('*')
    .eq('agent', agent)
    .order('updated_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as AgentConversation[];
}

export async function incrementAgentTurnCount(conversationId: string): Promise<void> {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conv, error: fetchErr } = await (client as any)
    .from('agent_conversations')
    .select('turn_count')
    .eq('id', conversationId)
    .single();
  if (fetchErr) throw fetchErr;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (client as any)
    .from('agent_conversations')
    .update({ turn_count: (conv.turn_count ?? 0) + 1 })
    .eq('id', conversationId);
  if (updateErr) throw updateErr;
}

export async function updateAgentConversationTitle(
  conversationId: string,
  title: string,
): Promise<void> {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any)
    .from('agent_conversations')
    .update({ title })
    .eq('id', conversationId);
}

// ============================================================================
// Messages
// ============================================================================

export async function createAgentMessage(input: {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | null;
  parts: unknown;
}): Promise<AgentMessage> {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('agent_messages')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as AgentMessage;
}

export async function getAgentMessages(
  conversationId: string,
): Promise<AgentMessage[]> {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('agent_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return (data ?? []) as AgentMessage[];
}

export async function deleteAgentMessage(messageId: string): Promise<void> {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any)
    .from('agent_messages')
    .delete()
    .eq('id', messageId);
}
