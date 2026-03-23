'use client';

import { RecentConversations } from '../recent-conversations';

interface EmptyStateProps {
  /** Compact display for panel context */
  compact?: boolean;
}

export function EmptyState({ compact = false }: EmptyStateProps) {
  return (
    <div className="text-center">
      <RecentConversations compact={compact} />
    </div>
  );
}
