'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface ChangeProposal {
  type: 'soul_change_proposal' | 'chassis_change_proposal';
  characterId: string;
  field: string;
  path: string;
  currentValue: unknown;
  proposedValue: unknown;
  reason: string;
}

interface ProposalCardProps {
  proposal: ChangeProposal;
  onApplied?: () => void;
}

export function ProposalCard({ proposal, onApplied }: ProposalCardProps) {
  const [status, setStatus] = useState<'pending' | 'applying' | 'approved' | 'rejected'>('pending');

  const handleApprove = async () => {
    setStatus('applying');
    try {
      const res = await fetch('/api/luv/apply-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposal),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStatus('approved');
      onApplied?.();
    } catch (err) {
      console.error('Failed to apply change:', err);
      setStatus('pending');
    }
  };

  const handleReject = () => {
    setStatus('rejected');
  };

  const isSoul = proposal.type === 'soul_change_proposal';
  const label = isSoul ? 'Soul' : 'Chassis';

  return (
    <div className="rounded border bg-amber-50 dark:bg-amber-950/30 text-xs my-1 overflow-hidden">
      <div className="px-2.5 py-2 space-y-1.5">
        <div className="font-medium">
          Update {label}: {proposal.path}
        </div>
        <div className="text-muted-foreground">{proposal.reason}</div>

        <div className="grid grid-cols-2 gap-2 mt-1.5">
          <div>
            <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Current</div>
            <pre className="text-[10px] bg-muted rounded px-1.5 py-1 whitespace-pre-wrap break-all max-h-24 overflow-auto">
              {formatValue(proposal.currentValue)}
            </pre>
          </div>
          <div>
            <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Proposed</div>
            <pre className="text-[10px] bg-green-50 dark:bg-green-950/30 rounded px-1.5 py-1 whitespace-pre-wrap break-all max-h-24 overflow-auto">
              {formatValue(proposal.proposedValue)}
            </pre>
          </div>
        </div>
      </div>

      <div className="border-t px-2.5 py-1.5 flex items-center gap-1.5">
        {status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="default"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={handleApprove}
            >
              <Check className="size-3" /> Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={handleReject}
            >
              <X className="size-3" /> Reject
            </Button>
          </>
        )}
        {status === 'applying' && (
          <span className="text-muted-foreground animate-pulse">Applying...</span>
        )}
        {status === 'approved' && (
          <span className="text-green-600 dark:text-green-400 font-medium">Applied</span>
        )}
        {status === 'rejected' && (
          <span className="text-muted-foreground">Rejected</span>
        )}
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return 'null';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}
