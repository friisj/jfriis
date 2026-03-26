'use client';

import { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface TriggerConfig {
  enabled: boolean;
  delay_ms: number;
  cooldown_ms: number;
  max_per_session: number;
}

interface HeartbeatSettings {
  enabled: boolean;
  presence_enabled: boolean;
  event_triggers: Record<string, TriggerConfig>;
}

const triggerLabels: Record<string, string> = {
  chassis_change: 'Chassis changes',
  trait_adjustment: 'Trait adjustments',
  generation_complete: 'Image generation',
  hypothesis_logged: 'New hypotheses',
  memory_pattern: 'Memory patterns',
  conversation_lull: 'Conversation lull',
};

export function HeartbeatSettingsPanel() {
  const [settings, setSettings] = useState<HeartbeatSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/luv/heartbeat/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const save = useCallback(async (updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/luv/heartbeat/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleGlobal = useCallback((enabled: boolean) => {
    setSettings((prev) => prev ? { ...prev, enabled } : prev);
    save({ enabled });
  }, [save]);

  const togglePresence = useCallback((presence_enabled: boolean) => {
    setSettings((prev) => prev ? { ...prev, presence_enabled } : prev);
    save({ presence_enabled });
  }, [save]);

  const toggleTrigger = useCallback((key: string, enabled: boolean) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        event_triggers: {
          ...prev.event_triggers,
          [key]: { ...prev.event_triggers[key], enabled },
        },
      };
    });
    save({ event_triggers: { [key]: { enabled } } });
  }, [save]);

  if (!settings) {
    return <div className="p-4 text-xs text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-5">
      {/* Global toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Heartbeat</Label>
          <p className="text-[11px] text-muted-foreground">Event-driven nudges between turns</p>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={toggleGlobal}
          disabled={saving}
        />
      </div>

      {/* Presence toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Presence signals</Label>
          <p className="text-[11px] text-muted-foreground">Real-time indicators in chat</p>
        </div>
        <Switch
          checked={settings.presence_enabled}
          onCheckedChange={togglePresence}
          disabled={saving}
        />
      </div>

      {/* Per-trigger toggles */}
      {settings.enabled && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Triggers</p>
          {Object.entries(settings.event_triggers).map(([key, config]) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-xs">{triggerLabels[key] ?? key}</span>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => toggleTrigger(key, checked)}
                disabled={saving}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
