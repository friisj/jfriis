/**
 * Audit Configuration Component
 *
 * Allows logged-in users to enable audit mode for gameplay logging
 */

'use client';

import { AuditMode } from '@/lib/studio/ludo/audit/types';

export interface AuditConfig {
  enabled: boolean;
  mode: AuditMode;
  notes?: string;
  enableMCTS?: boolean;
}

interface AuditConfigProps {
  value: AuditConfig;
  onChange: (config: AuditConfig) => void;
  isAuthenticated: boolean;
}

export function AuditConfigComponent({ value, onChange, isAuthenticated }: AuditConfigProps) {
  if (!isAuthenticated) {
    return null; // Only show for authenticated users
  }

  return (
    <div className="border border-purple-500/30 rounded-lg p-4 bg-purple-500/5 space-y-3">
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) =>
              onChange({
                ...value,
                enabled: e.target.checked
              })
            }
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">📊 Enable Gameplay Audit</span>
        </label>
        <p className="text-xs text-gray-400">
          Log dice rolls, moves, and hits for analysis and debugging.
        </p>
      </div>

      {value.enabled && (
        <div className="space-y-2 pt-2 border-t border-purple-500/20">
          <label className="text-sm font-medium text-gray-300">Notes (Optional)</label>
          <textarea
            value={value.notes || ''}
            onChange={(e) =>
              onChange({
                ...value,
                notes: e.target.value
              })
            }
            placeholder="Purpose of this session, test cases, etc..."
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-600 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
