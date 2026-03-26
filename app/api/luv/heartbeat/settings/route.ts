import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { createClient } from '@/lib/supabase-server';

const DEFAULT_TRIGGERS: Record<string, { enabled: boolean; delay_ms: number; cooldown_ms: number; max_per_session: number }> = {
  chassis_change: { enabled: true, delay_ms: 2000, cooldown_ms: 60000, max_per_session: 5 },
  trait_adjustment: { enabled: true, delay_ms: 3000, cooldown_ms: 60000, max_per_session: 3 },
  generation_complete: { enabled: true, delay_ms: 1000, cooldown_ms: 30000, max_per_session: 10 },
  hypothesis_logged: { enabled: true, delay_ms: 5000, cooldown_ms: 120000, max_per_session: 3 },
  memory_pattern: { enabled: true, delay_ms: 10000, cooldown_ms: 300000, max_per_session: 2 },
  conversation_lull: { enabled: true, delay_ms: 0, cooldown_ms: 600000, max_per_session: 2 },
};

export async function GET() {
  const { user, error } = await requireAuth();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('luv_heartbeat_config')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    enabled: data?.enabled ?? true,
    presence_enabled: data?.presence_enabled ?? true,
    event_triggers: data?.event_triggers ?? DEFAULT_TRIGGERS,
  });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await request.json();
  const supabase = await createClient();

  // Load existing config (or defaults)
  const { data: existing } = await (supabase as any)
    .from('luv_heartbeat_config')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const currentTriggers = existing?.event_triggers ?? DEFAULT_TRIGGERS;

  // Merge trigger updates
  const mergedTriggers = { ...currentTriggers };
  if (body.event_triggers) {
    for (const [key, updates] of Object.entries(body.event_triggers)) {
      mergedTriggers[key] = { ...(mergedTriggers[key] ?? {}), ...(updates as Record<string, unknown>) };
    }
  }

  const upsertData = {
    user_id: user.id,
    enabled: body.enabled ?? existing?.enabled ?? true,
    presence_enabled: body.presence_enabled ?? existing?.presence_enabled ?? true,
    event_triggers: mergedTriggers,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await (supabase as any)
    .from('luv_heartbeat_config')
    .upsert(upsertData, { onConflict: 'user_id' });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json(upsertData);
}
