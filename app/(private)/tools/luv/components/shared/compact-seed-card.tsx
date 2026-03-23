'use client';

import { useState } from 'react';
import { IconChevronDown, IconChevronRight, IconSparkles } from '@tabler/icons-react';
import type { LuvCompactSummary } from '@/lib/types/luv';

export function CompactSeedCard({
  summary,
  onBranch,
  branching,
}: {
  summary: LuvCompactSummary;
  onBranch: () => void;
  branching: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-3 mb-2 rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 text-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-violet-600 dark:text-violet-400 hover:bg-violet-100/50 transition-colors"
      >
        <IconSparkles size={12} className="shrink-0" />
        {open ? <IconChevronDown size={12} className="shrink-0" /> : <IconChevronRight size={12} className="shrink-0" />}
        <span className="text-[10px] font-medium">Seeded from compacted session</span>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 space-y-2">
          <p className="text-[10px] text-violet-700 dark:text-violet-300 leading-relaxed">
            {summary.carry_forward_summary}
          </p>
          {summary.goals.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 mb-0.5">Goals</p>
              <ul className="text-[10px] text-violet-700 dark:text-violet-300 space-y-0.5 list-disc list-inside">
                {summary.goals.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
          {summary.open_threads.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 mb-0.5">Open threads</p>
              <ul className="text-[10px] text-violet-700 dark:text-violet-300 space-y-0.5 list-disc list-inside">
                {summary.open_threads.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
