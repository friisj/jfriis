'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSchema } from '@/lib/luv/chassis-schemas';
import type { ParameterDef, ParameterTier } from '@/lib/luv/chassis-schemas';
import type { LuvChassisModule } from '@/lib/types/luv-chassis';
import { saveModuleWithVersion } from '@/lib/luv-chassis';
import { ParameterControl } from './parameter-control';

interface ModuleEditorProps {
  module: LuvChassisModule;
  onSaved?: () => void;
}

const TIER_ORDER: ParameterTier[] = ['basic', 'intermediate', 'advanced', 'clinical'];
const TIER_LABELS: Record<ParameterTier, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  clinical: 'Clinical',
};

export function ModuleEditor({ module, onSaved }: ModuleEditorProps) {
  const schema = getSchema(module.schema_key);
  const [parameters, setParameters] = useState<Record<string, unknown>>(
    module.parameters
  );
  const [saving, setSaving] = useState(false);

  const updateParam = useCallback((key: string, value: unknown) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveModuleWithVersion(module.id, parameters, 'Manual edit');
      onSaved?.();
    } catch (err) {
      console.error('Failed to save module:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!schema) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Unknown schema: {module.schema_key}
      </div>
    );
  }

  // Group parameters by tier
  const grouped = new Map<ParameterTier, ParameterDef[]>();
  for (const param of schema.parameters) {
    const tier = param.tier ?? 'basic';
    const group = grouped.get(tier) ?? [];
    group.push(param);
    grouped.set(tier, group);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{schema.label}</h3>
          {schema.description && (
            <p className="text-xs text-muted-foreground">{schema.description}</p>
          )}
        </div>
        <Badge variant="outline" className="text-[10px]">
          v{module.current_version}
        </Badge>
      </div>

      {TIER_ORDER.filter((t) => grouped.has(t)).map((tier) => (
        <section key={tier} className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {TIER_LABELS[tier]}
          </h4>
          <div className="space-y-3">
            {grouped.get(tier)!.map((param) => (
              <ParameterControl
                key={param.key}
                param={param}
                value={parameters[param.key]}
                onChange={(v) => updateParam(param.key, v)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
