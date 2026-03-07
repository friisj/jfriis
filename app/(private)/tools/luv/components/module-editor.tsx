'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock } from 'lucide-react';
import { getSchema } from '@/lib/luv/chassis-schemas';
import type { ParameterDef, ParameterTier } from '@/lib/luv/chassis-schemas';
import type { LuvChassisModule, ParameterConstraint } from '@/lib/types/luv-chassis';
import { saveModuleWithVersion } from '@/lib/luv-chassis';
import { validateModuleConstraints } from '@/lib/luv/chassis-constraints';
import type { ConstraintViolation } from '@/lib/luv/chassis-constraints';
import { ParameterControl } from './parameter-control';

interface StudyLock {
  studySlug: string;
  studyTitle: string;
  constraints: Record<string, ParameterConstraint>;
}

interface ModuleEditorProps {
  module: LuvChassisModule;
  allModules?: LuvChassisModule[];
  studyLocks?: StudyLock[];
  onSaved?: () => void;
}

const TIER_ORDER: ParameterTier[] = ['basic', 'intermediate', 'advanced', 'clinical'];
const TIER_LABELS: Record<ParameterTier, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  clinical: 'Clinical',
};

export function ModuleEditor({ module, allModules = [], studyLocks = [], onSaved }: ModuleEditorProps) {
  const schema = getSchema(module.schema_key);
  const [parameters, setParameters] = useState<Record<string, unknown>>(
    module.parameters
  );
  const [saving, setSaving] = useState(false);
  const [violations, setViolations] = useState<ConstraintViolation[]>([]);

  // Build a map of locked parameter keys → study info
  const lockedParams = useMemo(() => {
    const map = new Map<string, { value: unknown; reason: string; studySlug: string; studyTitle: string }>();
    for (const lock of studyLocks) {
      for (const [key, constraint] of Object.entries(lock.constraints)) {
        map.set(key, {
          value: constraint.value,
          reason: constraint.reason,
          studySlug: lock.studySlug,
          studyTitle: lock.studyTitle,
        });
      }
    }
    return map;
  }, [studyLocks]);

  const updateParam = useCallback((key: string, value: unknown) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    // Run constraint validation before saving
    if (allModules.length > 0) {
      const result = validateModuleConstraints(module.slug, parameters, allModules);
      setViolations(result.violations);
    }

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

  // Compute which parameter keys have constraint violations
  const violatedParams = useMemo(() => {
    const set = new Set<string>();
    for (const v of violations) {
      if (v.sourceModule === module.slug) set.add(v.sourceParam);
      if (v.targetModule === module.slug) set.add(v.targetParam);
    }
    return set;
  }, [violations, module.slug]);

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
        <button
          onClick={() => {
            document.getElementById('version-history')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="cursor-pointer"
          title="View version history"
        >
          <Badge variant="outline" className="text-[10px] hover:bg-accent transition-colors">
            v{module.current_version}
          </Badge>
        </button>
      </div>

      {violations.length > 0 && (
        <div className="rounded border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-1">
          {violations.map((v, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{v.message}</span>
            </div>
          ))}
        </div>
      )}

      {TIER_ORDER.filter((t) => grouped.has(t)).map((tier) => (
        <section key={tier} className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {TIER_LABELS[tier]}
          </h4>
          <div className="space-y-3">
            {grouped.get(tier)!.map((param) => {
              const lock = lockedParams.get(param.key);
              const isLocked = !!lock;

              return (
                <div
                  key={param.key}
                  className={
                    isLocked
                      ? 'rounded ring-1 ring-blue-500/30 bg-blue-500/5 p-1.5 -m-1.5'
                      : violatedParams.has(param.key)
                        ? 'rounded ring-1 ring-yellow-500/40 p-1.5 -m-1.5'
                        : ''
                  }
                >
                  {isLocked && (
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-blue-600 dark:text-blue-400">
                      <Lock className="h-2.5 w-2.5" />
                      <span>
                        Locked by{' '}
                        <Link
                          href={`/tools/luv/studies/${lock.studySlug}`}
                          className="underline hover:text-blue-700"
                        >
                          {lock.studyTitle}
                        </Link>
                        {lock.reason && ` — ${lock.reason}`}
                      </span>
                    </div>
                  )}
                  <div className={isLocked ? 'opacity-60 pointer-events-none' : ''}>
                    <ParameterControl
                      param={param}
                      value={isLocked ? lock.value : parameters[param.key]}
                      onChange={(v) => updateParam(param.key, v)}
                    />
                  </div>
                </div>
              );
            })}
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
