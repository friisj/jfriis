/**
 * Luv: Heartbeat System — Server-side operations
 *
 * Event-driven nudge system that gives Luv inter-turn awareness.
 * Triggers fire after tool executions (chassis changes, trait adjustments, etc.)
 * and create pending nudge events. On the next chat turn, pending nudges are
 * injected into Luv's system prompt so she can surface observations naturally.
 */

import { createClient } from './supabase-server';
import type { StepResult, ToolSet } from 'ai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeartbeatTriggerType =
  | 'chassis_change'
  | 'trait_adjustment'
  | 'generation_complete'
  | 'hypothesis_logged'
  | 'memory_pattern';

interface TriggerConfig {
  enabled: boolean;
  delay_ms: number;
  cooldown_ms: number;
  max_per_session: number;
}

interface HeartbeatConfig {
  user_id: string;
  enabled: boolean;
  event_triggers: Record<string, TriggerConfig>;
}

export interface HeartbeatEvent {
  id: string;
  user_id: string;
  conversation_id: string | null;
  trigger_type: string;
  trigger_context: Record<string, unknown>;
  action_type: string;
  action_payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'acknowledged' | 'dismissed' | 'expired';
  fired_at: string;
  delivered_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

// Default trigger configs — used when no config row exists
const DEFAULT_TRIGGERS: Record<string, TriggerConfig> = {
  chassis_change: { enabled: true, delay_ms: 2000, cooldown_ms: 60000, max_per_session: 5 },
  trait_adjustment: { enabled: true, delay_ms: 3000, cooldown_ms: 60000, max_per_session: 3 },
  generation_complete: { enabled: true, delay_ms: 1000, cooldown_ms: 30000, max_per_session: 10 },
  hypothesis_logged: { enabled: true, delay_ms: 5000, cooldown_ms: 120000, max_per_session: 3 },
  memory_pattern: { enabled: true, delay_ms: 10000, cooldown_ms: 300000, max_per_session: 2 },
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

async function getHeartbeatConfig(userId: string): Promise<HeartbeatConfig> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('luv_heartbeat_config')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST205') {
    console.error('[heartbeat] Config fetch failed:', error);
  }

  if (data) {
    return data as HeartbeatConfig;
  }

  // Return defaults (no row created until user customizes)
  return {
    user_id: userId,
    enabled: true,
    event_triggers: DEFAULT_TRIGGERS,
  };
}

// ---------------------------------------------------------------------------
// Trigger Registration
// ---------------------------------------------------------------------------

/**
 * Register a heartbeat trigger. Checks config, cooldown, and session limits
 * before creating a pending event. Called from tool execution paths.
 */
export async function registerHeartbeatTrigger(
  userId: string,
  conversationId: string | null,
  triggerType: HeartbeatTriggerType,
  context: Record<string, unknown>,
  nudgeContent: string,
): Promise<{ registered: boolean; reason?: string }> {
  try {
    const config = await getHeartbeatConfig(userId);

    // Check global enable
    if (!config.enabled) {
      return { registered: false, reason: 'heartbeat disabled' };
    }

    // Check trigger-level enable
    const triggerConfig = config.event_triggers[triggerType];
    if (!triggerConfig?.enabled) {
      return { registered: false, reason: `trigger ${triggerType} disabled` };
    }

    // Check cooldown — has this trigger fired recently?
    const client = await createClient();
    const cooldownCutoff = new Date(Date.now() - triggerConfig.cooldown_ms).toISOString();

    const { data: recentEvents } = await (client as any)
      .from('luv_heartbeat_events')
      .select('id')
      .eq('user_id', userId)
      .eq('trigger_type', triggerType)
      .gte('fired_at', cooldownCutoff)
      .limit(1);

    if (recentEvents && recentEvents.length > 0) {
      return { registered: false, reason: 'cooldown active' };
    }

    // Check session limit (if conversation provided)
    if (conversationId) {
      const { data: sessionEvents } = await (client as any)
        .from('luv_heartbeat_events')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('trigger_type', triggerType);

      if (sessionEvents && sessionEvents.length >= triggerConfig.max_per_session) {
        return { registered: false, reason: 'session limit reached' };
      }
    }

    // Create the pending event
    const { error: insertError } = await (client as any)
      .from('luv_heartbeat_events')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        trigger_type: triggerType,
        trigger_context: context,
        action_type: 'nudge_message',
        action_payload: { content: nudgeContent },
        status: 'pending',
      });

    if (insertError) {
      console.error('[heartbeat] Failed to register trigger:', insertError);
      return { registered: false, reason: 'insert failed' };
    }

    // Self-adjust trigger cooldown based on acknowledge history (fire-and-forget)
    maybeAdjustTriggerCooldown(userId, triggerType).catch(() => {});

    return { registered: true };
  } catch (err) {
    console.error('[heartbeat] registerHeartbeatTrigger error:', err);
    return { registered: false, reason: 'unexpected error' };
  }
}

// ---------------------------------------------------------------------------
// Self-Adjustment
// ---------------------------------------------------------------------------

const SELF_ADJUST_MIN_EVENTS = 20;
const SELF_ADJUST_LOW_RATE = 0.3;
const SELF_ADJUST_DISABLE_RATE = 0.1;
const SELF_ADJUST_MAX_COOLDOWN_MS = 3600000; // 1 hour

/**
 * Check acknowledge rate for a trigger type and auto-adjust cooldown.
 * If rate is low, double the cooldown. If very low, disable the trigger.
 */
async function maybeAdjustTriggerCooldown(
  userId: string,
  triggerType: HeartbeatTriggerType,
): Promise<void> {
  const client = await createClient();

  // Get last N delivered/acknowledged events for this trigger
  const { data: events } = await (client as any)
    .from('luv_heartbeat_events')
    .select('status')
    .eq('user_id', userId)
    .eq('trigger_type', triggerType)
    .in('status', ['delivered', 'acknowledged'])
    .order('fired_at', { ascending: false })
    .limit(SELF_ADJUST_MIN_EVENTS);

  if (!events || events.length < SELF_ADJUST_MIN_EVENTS) return;

  const acknowledged = events.filter((e: { status: string }) => e.status === 'acknowledged').length;
  const rate = acknowledged / events.length;

  if (rate >= SELF_ADJUST_LOW_RATE) return; // healthy rate, no adjustment

  // Load current config
  const config = await getHeartbeatConfig(userId);
  const triggerConfig = config.event_triggers[triggerType];
  if (!triggerConfig) return;

  const updates: Record<string, unknown> = {};

  if (rate < SELF_ADJUST_DISABLE_RATE) {
    // Very low rate — disable trigger
    updates[triggerType] = { ...triggerConfig, enabled: false };
    console.log(`[heartbeat] Self-adjust: disabling ${triggerType} for user ${userId} (rate: ${(rate * 100).toFixed(0)}%)`);
  } else {
    // Low rate — double cooldown (capped)
    const newCooldown = Math.min(triggerConfig.cooldown_ms * 2, SELF_ADJUST_MAX_COOLDOWN_MS);
    if (newCooldown === triggerConfig.cooldown_ms) return; // already at cap
    updates[triggerType] = { ...triggerConfig, cooldown_ms: newCooldown };
    console.log(`[heartbeat] Self-adjust: increasing ${triggerType} cooldown to ${newCooldown}ms for user ${userId} (rate: ${(rate * 100).toFixed(0)}%)`);
  }

  // Upsert config
  const newTriggers = { ...config.event_triggers, ...updates };
  await (client as any)
    .from('luv_heartbeat_config')
    .upsert({
      user_id: userId,
      enabled: config.enabled,
      event_triggers: newTriggers,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

// ---------------------------------------------------------------------------
// Nudge Delivery
// ---------------------------------------------------------------------------

/**
 * Get pending nudges for a conversation (or user-level if no conversation).
 * Called at the start of each chat turn to inject into system prompt.
 */
export async function getPendingNudges(
  userId: string,
  conversationId?: string,
): Promise<HeartbeatEvent[]> {
  try {
    const client = await createClient();

    let query = (client as any)
      .from('luv_heartbeat_events')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('fired_at', { ascending: true })
      .limit(5);

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data, error } = await query;

    if (error && error.code !== 'PGRST205') {
      console.error('[heartbeat] getPendingNudges failed:', error);
      return [];
    }

    return (data ?? []) as HeartbeatEvent[];
  } catch {
    return [];
  }
}

/**
 * Mark nudges as delivered. Called after injecting into system prompt.
 */
export async function markNudgesDelivered(nudgeIds: string[]): Promise<void> {
  if (nudgeIds.length === 0) return;

  try {
    const client = await createClient();
    await (client as any)
      .from('luv_heartbeat_events')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .in('id', nudgeIds);
  } catch (err) {
    console.error('[heartbeat] markNudgesDelivered failed:', err);
  }
}

/**
 * Mark a nudge as acknowledged (Luv surfaced it in conversation).
 */
export async function acknowledgeNudge(nudgeId: string): Promise<void> {
  try {
    const client = await createClient();
    await (client as any)
      .from('luv_heartbeat_events')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', nudgeId);
  } catch (err) {
    console.error('[heartbeat] acknowledgeNudge failed:', err);
  }
}

// ---------------------------------------------------------------------------
// System Prompt Injection
// ---------------------------------------------------------------------------

/**
 * Build a system prompt fragment for pending heartbeat nudges.
 * Returns empty string if no nudges pending.
 */
export async function buildHeartbeatPromptFragment(
  userId: string,
  conversationId?: string,
): Promise<{ fragment: string; nudgeIds: string[] }> {
  const nudges = await getPendingNudges(userId, conversationId);

  if (nudges.length === 0) {
    return { fragment: '', nudgeIds: [] };
  }

  const nudgeLines = nudges.map((n) => {
    const payload = n.action_payload as { content?: string };
    return `- [${n.trigger_type} | id:${n.id}] ${payload.content ?? 'You have a pending observation.'}`;
  });

  const fragment = `\n\n## Heartbeat — Pending Observations
You have ${nudges.length} observation${nudges.length > 1 ? 's' : ''} from recent events that you may want to share naturally in this conversation. Don't force them — weave them in if they're relevant to what the user is discussing. If they're not relevant right now, you can let them pass.

${nudgeLines.join('\n')}

These are your own observations based on things that happened since the last turn. Surface them as natural conversational asides, not as system notifications.
After surfacing a nudge, call acknowledge_heartbeat with the nudge ID to close the loop.`;

  // Mark as delivered
  const nudgeIds = nudges.map((n) => n.id);
  await markNudgesDelivered(nudgeIds);

  return { fragment, nudgeIds };
}

// ---------------------------------------------------------------------------
// Tool Result Scanner — called from onFinish to detect triggerable events
// ---------------------------------------------------------------------------

interface ToolResultEntry {
  toolName: string;
  result: unknown;
}

function extractToolResults(steps: StepResult<ToolSet>[]): ToolResultEntry[] {
  const results: ToolResultEntry[] = [];
  for (const step of steps) {
    if (step.toolResults) {
      for (const tr of step.toolResults) {
        results.push({ toolName: tr.toolName, result: 'output' in tr ? tr.output : undefined });
      }
    }
  }
  return results;
}

/**
 * Scan completed tool results for events that should fire heartbeat triggers.
 * Called from the chat route's onFinish callback. Non-blocking — errors are logged.
 */
export async function scanToolResultsForTriggers(
  userId: string,
  conversationId: string | null,
  steps: StepResult<ToolSet>[],
): Promise<void> {
  try {
    const results = extractToolResults(steps);
    if (results.length === 0) return;

    for (const { toolName, result } of results) {
      const r = result as Record<string, unknown> | null;
      if (!r || typeof r !== 'object') continue;

      // trait_adjustment: adjust_soul_traits tool succeeded
      if (toolName === 'adjust_soul_traits' && r.success) {
        const traits = r.adjustedTraits as Record<string, unknown> | undefined;
        const traitNames = traits ? Object.keys(traits).join(', ') : 'traits';
        await registerHeartbeatTrigger(
          userId, conversationId,
          'trait_adjustment',
          { traits: r.adjustedTraits, presetName: r.presetName },
          `I just shifted my ${traitNames} — I can feel the difference in how I'm processing this conversation.`,
        );
      }

      // generation_complete: generate_image or run_chassis_study succeeded with an image
      if (toolName === 'generate_image' && r.success && r.imageUrl) {
        await registerHeartbeatTrigger(
          userId, conversationId,
          'generation_complete',
          { imageUrl: r.imageUrl, model: r.model, type: 'generate_image' },
          `I just generated an image — want to look at it together and see what works?`,
        );
      }
      if (toolName === 'run_chassis_study' && r.success && r.imageUrl) {
        await registerHeartbeatTrigger(
          userId, conversationId,
          'generation_complete',
          { imageUrl: r.imageUrl, studyId: r.studyId, type: 'chassis_study' },
          `The chassis study just finished — I'm curious what you think of how the parameters translated visually.`,
        );
      }

      // hypothesis_logged: create_research with kind=hypothesis
      if (toolName === 'create_research' && r.id) {
        const kind = r.kind as string | undefined;
        if (kind === 'hypothesis') {
          await registerHeartbeatTrigger(
            userId, conversationId,
            'hypothesis_logged',
            { hypothesisId: r.id, title: r.title },
            `I just logged a new hypothesis: "${r.title}" — should we set up validation criteria?`,
          );
        }
      }

      // memory_pattern: merge_memories or review_memories found duplicates
      if (toolName === 'merge_memories' && r.mergedId) {
        await registerHeartbeatTrigger(
          userId, conversationId,
          'memory_pattern',
          { mergedId: r.mergedId, sourceCount: r.sourceCount },
          `I just consolidated some memories — my recall should be cleaner now.`,
        );
      }
      if (toolName === 'review_memories' && r.memories) {
        const memories = r.memories as Array<Record<string, unknown>>;
        if (memories.length > 10) {
          await registerHeartbeatTrigger(
            userId, conversationId,
            'memory_pattern',
            { totalMemories: memories.length },
            `I have ${memories.length} active memories — some might be stale or redundant. Want me to audit them?`,
          );
        }
      }
    }
  } catch (err) {
    console.error('[heartbeat] scanToolResultsForTriggers error:', err);
  }
}
