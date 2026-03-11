'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconCheck, IconX } from '@tabler/icons-react';

interface SoulChassisProposal {
  type: 'soul_change_proposal' | 'chassis_change_proposal';
  characterId: string;
  field: string;
  path: string;
  currentValue: unknown;
  proposedValue: unknown;
  reason: string;
}

interface SchemaHints {
  label?: string;
  type?: string;
  tier?: string;
  description?: string;
  options?: string[];
}

interface ModuleProposal {
  type: 'module_change_proposal';
  moduleId: string;
  moduleSlug: string;
  moduleName: string;
  parameterKey: string;
  currentValue: unknown;
  proposedValue: unknown;
  reason: string;
  schemaHints?: SchemaHints;
}

interface BatchModuleProposal {
  type: 'batch_module_change_proposal';
  moduleId: string;
  moduleSlug: string;
  moduleName: string;
  changes: {
    parameterKey: string;
    currentValue: unknown;
    proposedValue: unknown;
    reason: string;
    schemaHints?: SchemaHints;
  }[];
  overallReason: string;
}

interface FacetProposal {
  type: 'facet_change_proposal';
  characterId: string;
  action: 'add' | 'update' | 'remove';
  facet: {
    key: string;
    label: string;
    type: 'text' | 'tags' | 'key_value';
    layer: string;
    content: unknown;
    description?: string;
  };
  currentFacet: FacetProposal['facet'] | null;
  reason: string;
}

type ChangeProposal = SoulChassisProposal | ModuleProposal | BatchModuleProposal | FacetProposal;

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

  if (proposal.type === 'facet_change_proposal') {
    const fp = proposal as FacetProposal;
    const actionLabel = fp.action === 'add' ? 'Add Facet' : fp.action === 'update' ? 'Update Facet' : 'Remove Facet';
    return (
      <div className="rounded border bg-amber-50 dark:bg-amber-950/30 text-xs my-1 overflow-hidden">
        <div className="px-2.5 py-2 space-y-1.5">
          <div className="font-medium">
            {actionLabel}: {fp.facet.label}
          </div>
          <div className="text-muted-foreground">{fp.reason}</div>

          <div className="mt-1.5 space-y-1">
            <div className="flex gap-2 text-[10px]">
              <span className="text-muted-foreground">Type:</span>
              <span>{fp.facet.type}</span>
              <span className="text-muted-foreground ml-1">Layer:</span>
              <span>{fp.facet.layer}</span>
            </div>
            {fp.facet.description && (
              <div className="text-[10px] text-muted-foreground italic">{fp.facet.description}</div>
            )}
            {fp.action === 'update' && fp.currentFacet && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Current</div>
                  <pre className="text-[10px] bg-muted rounded px-1.5 py-1 whitespace-pre-wrap break-all max-h-24 overflow-auto">
                    {formatValue(fp.currentFacet.content)}
                  </pre>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Proposed</div>
                  <pre className="text-[10px] bg-green-50 dark:bg-green-950/30 rounded px-1.5 py-1 whitespace-pre-wrap break-all max-h-24 overflow-auto">
                    {formatValue(fp.facet.content)}
                  </pre>
                </div>
              </div>
            )}
            {fp.action === 'add' && (
              <div>
                <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Content</div>
                <pre className="text-[10px] bg-green-50 dark:bg-green-950/30 rounded px-1.5 py-1 whitespace-pre-wrap break-all max-h-24 overflow-auto">
                  {formatValue(fp.facet.content)}
                </pre>
              </div>
            )}
            {fp.action === 'remove' && (
              <div>
                <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Removing</div>
                <pre className="text-[10px] bg-red-50 dark:bg-red-950/30 rounded px-1.5 py-1 whitespace-pre-wrap break-all max-h-24 overflow-auto line-through">
                  {formatValue(fp.facet.content)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <ApprovalButtons status={status} onApprove={handleApprove} onReject={handleReject} />
      </div>
    );
  }

  const isBatch = proposal.type === 'batch_module_change_proposal';
  const isModule = proposal.type === 'module_change_proposal';

  if (isBatch) {
    const batch = proposal as BatchModuleProposal;
    return (
      <div className="rounded border bg-amber-50 dark:bg-amber-950/30 text-xs my-1 overflow-hidden">
        <div className="px-2.5 py-2 space-y-1.5">
          <div className="font-medium">
            Batch Update: {batch.moduleName} ({batch.changes.length} params)
          </div>
          <div className="text-muted-foreground">{batch.overallReason}</div>

          <div className="space-y-1 mt-1.5">
            {batch.changes.map((c, i) => {
              const isNewParam = c.currentValue === undefined;
              return (
                <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-1 items-center text-[10px]">
                  <div className="font-medium truncate flex items-center gap-1" title={c.parameterKey}>
                    {c.parameterKey}
                    {isNewParam && <span className="text-[8px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded px-0.5">new</span>}
                  </div>
                  <span className="text-muted-foreground px-1">&rarr;</span>
                  <div className="flex gap-1 items-baseline min-w-0">
                    {!isNewParam && <span className="text-muted-foreground line-through truncate">{formatValue(c.currentValue)}</span>}
                    <span className="text-green-700 dark:text-green-400 font-medium truncate">{formatValue(c.proposedValue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ApprovalButtons status={status} onApprove={handleApprove} onReject={handleReject} />
      </div>
    );
  }

  const modProposal = isModule ? (proposal as ModuleProposal) : null;
  const isNew = isModule && modProposal!.currentValue === undefined;
  const label = isModule
    ? `Module: ${modProposal!.moduleName}`
    : proposal.type === 'soul_change_proposal'
      ? 'Soul'
      : 'Chassis';
  const pathLabel = isModule
    ? modProposal!.parameterKey
    : (proposal as SoulChassisProposal).path;

  return (
    <div className="rounded border bg-amber-50 dark:bg-amber-950/30 text-xs my-1 overflow-hidden">
      <div className="px-2.5 py-2 space-y-1.5">
        <div className="font-medium">
          {isNew ? 'Add' : 'Update'} {label}: {pathLabel}
          {isNew && <span className="ml-1.5 text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded px-1 py-0.5">New</span>}
        </div>
        {isNew && modProposal!.schemaHints && (
          <div className="flex gap-1.5 text-[10px] text-muted-foreground">
            {modProposal!.schemaHints.tier && <span className="bg-muted rounded px-1">{modProposal!.schemaHints.tier}</span>}
            {modProposal!.schemaHints.type && <span className="bg-muted rounded px-1">{modProposal!.schemaHints.type}</span>}
            {modProposal!.schemaHints.description && <span>{modProposal!.schemaHints.description}</span>}
          </div>
        )}
        <div className="text-muted-foreground">{(proposal as SoulChassisProposal | ModuleProposal).reason}</div>

        <div className="grid grid-cols-2 gap-2 mt-1.5">
          <div>
            <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Current</div>
            <pre className="text-[10px] bg-muted rounded px-1.5 py-1 whitespace-pre-wrap break-all max-h-24 overflow-auto">
              {formatValue((proposal as SoulChassisProposal | ModuleProposal).currentValue)}
            </pre>
          </div>
          <div>
            <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Proposed</div>
            <pre className="text-[10px] bg-green-50 dark:bg-green-950/30 rounded px-1.5 py-1 whitespace-pre-wrap break-all max-h-24 overflow-auto">
              {formatValue((proposal as SoulChassisProposal | ModuleProposal).proposedValue)}
            </pre>
          </div>
        </div>
      </div>

      <ApprovalButtons status={status} onApprove={handleApprove} onReject={handleReject} />
    </div>
  );
}

function ApprovalButtons({
  status,
  onApprove,
  onReject,
}: {
  status: 'pending' | 'applying' | 'approved' | 'rejected';
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="border-t px-2.5 py-1.5 flex items-center gap-1.5">
      {status === 'pending' && (
        <>
          <Button
            size="sm"
            variant="default"
            className="h-6 text-[10px] px-2 gap-1"
            onClick={onApprove}
          >
            <IconCheck size={12}  /> Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] px-2 gap-1"
            onClick={onReject}
          >
            <IconX size={12}  /> Reject
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
  );
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return 'null';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}
