/**
 * Luv: Parameter Diff Utility
 *
 * Computes a structured diff between two parameter snapshots,
 * optionally enriched with schema labels.
 */

import type { ParameterDef } from '@/lib/luv/chassis-schemas';

export type DiffType = 'added' | 'changed' | 'removed';

export interface ParamDiffEntry {
  key: string;
  label: string;
  type: DiffType;
  oldValue?: unknown;
  newValue?: unknown;
}

export function diffParameters(
  oldParams: Record<string, unknown>,
  newParams: Record<string, unknown>,
  schema?: ParameterDef[]
): ParamDiffEntry[] {
  const labelMap = new Map<string, string>();
  if (schema) {
    for (const p of schema) {
      labelMap.set(p.key, p.label);
    }
  }

  const allKeys = new Set([...Object.keys(oldParams), ...Object.keys(newParams)]);
  const diffs: ParamDiffEntry[] = [];

  for (const key of allKeys) {
    const hasOld = key in oldParams;
    const hasNew = key in newParams;
    const label = labelMap.get(key) ?? key;

    if (!hasOld && hasNew) {
      diffs.push({ key, label, type: 'added', newValue: newParams[key] });
    } else if (hasOld && !hasNew) {
      diffs.push({ key, label, type: 'removed', oldValue: oldParams[key] });
    } else if (hasOld && hasNew) {
      const oldVal = oldParams[key];
      const newVal = newParams[key];
      // Deep compare via JSON for objects/arrays
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffs.push({ key, label, type: 'changed', oldValue: oldVal, newValue: newVal });
      }
    }
  }

  return diffs;
}

export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
