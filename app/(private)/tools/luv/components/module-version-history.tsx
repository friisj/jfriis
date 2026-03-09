'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { IconChevronDown, IconChevronRight, IconRotate, IconPlus, IconMinus, IconArrowRight } from '@tabler/icons-react';
import { getModuleVersions, saveModuleWithVersion } from '@/lib/luv-chassis';
import { diffParameters, formatDiffValue } from '@/lib/luv/param-diff';
import type { ParamDiffEntry } from '@/lib/luv/param-diff';
import type { LuvChassisModuleVersion, ParameterDef } from '@/lib/types/luv-chassis';

interface ModuleVersionHistoryProps {
  moduleId: string;
  parameterSchema?: ParameterDef[];
  currentVersion: number;
  onRestored?: () => void;
}

export function ModuleVersionHistory({
  moduleId,
  parameterSchema,
  currentVersion,
  onRestored,
}: ModuleVersionHistoryProps) {
  const [versions, setVersions] = useState<LuvChassisModuleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getModuleVersions(moduleId).then((data) => {
      if (!cancelled) {
        setVersions(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [moduleId, currentVersion]);

  const handleRestore = async (version: LuvChassisModuleVersion) => {
    setRestoring(version.id);
    try {
      await saveModuleWithVersion(
        moduleId,
        version.parameters,
        `Restored from v${version.version}`
      );
      onRestored?.();
    } catch (err) {
      console.error('Failed to restore version:', err);
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        Loading version history...
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        No version history yet.
      </div>
    );
  }

  return (
    <div id="version-history" className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Version History
      </h4>
      <div className="space-y-1">
        {versions.map((version) => {
          const isCurrent = version.version === currentVersion;
          const isExpanded = expandedId === version.id;

          return (
            <Collapsible
              key={version.id}
              open={isExpanded}
              onOpenChange={(open) =>
                setExpandedId(open ? version.id : null)
              }
            >
              <div className="rounded border px-3 py-2">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-xs hover:text-foreground transition-colors">
                      {isExpanded ? (
                        <IconChevronDown size={12}  />
                      ) : (
                        <IconChevronRight size={12}  />
                      )}
                      <Badge
                        variant={isCurrent ? 'default' : 'outline'}
                        className="text-[10px]"
                      >
                        v{version.version}
                      </Badge>
                      <span className="text-muted-foreground">
                        {version.change_summary ?? 'No summary'}
                      </span>
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(version.created_at).toLocaleDateString(
                        undefined,
                        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => handleRestore(version)}
                        disabled={restoring === version.id}
                      >
                        <IconRotate size={12} className="mr-1" />
                        {restoring === version.id ? 'Restoring...' : 'Restore'}
                      </Button>
                    )}
                  </div>
                </div>
                <CollapsibleContent>
                  <VersionDiff
                    version={version}
                    versions={versions}
                    schemaParams={parameterSchema}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function VersionDiff({
  version,
  versions,
  schemaParams,
}: {
  version: LuvChassisModuleVersion;
  versions: LuvChassisModuleVersion[];
  schemaParams?: ParameterDef[];
}) {
  // versions are sorted desc, so previous version is the next item
  const idx = versions.findIndex((v) => v.id === version.id);
  const prev = idx < versions.length - 1 ? versions[idx + 1] : null;

  if (!prev) {
    // First version — show all parameters as "initial"
    return (
      <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
        <p className="italic mb-1">Initial version</p>
        <pre className="font-mono whitespace-pre-wrap max-h-48 overflow-auto">
          {JSON.stringify(version.parameters, null, 2)}
        </pre>
      </div>
    );
  }

  const diffs = diffParameters(prev.parameters, version.parameters, schemaParams);

  if (diffs.length === 0) {
    return (
      <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground italic">
        No parameter changes from v{prev.version}
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t space-y-1">
      {diffs.map((d) => (
        <DiffRow key={d.key} diff={d} />
      ))}
    </div>
  );
}

function DiffRow({ diff }: { diff: ParamDiffEntry }) {
  const icon =
    diff.type === 'added' ? (
      <IconPlus size={8} className=".5 .5 text-green-500" />
    ) : diff.type === 'removed' ? (
      <IconMinus size={8} className=".5 .5 text-red-500" />
    ) : (
      <IconArrowRight size={8} className=".5 .5 text-blue-500" />
    );

  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      {icon}
      <span className="font-medium">{diff.label}</span>
      {diff.type === 'changed' && (
        <>
          <span className="text-muted-foreground line-through">
            {formatDiffValue(diff.oldValue)}
          </span>
          <IconArrowRight size={8} className="text-muted-foreground" />
          <span>{formatDiffValue(diff.newValue)}</span>
        </>
      )}
      {diff.type === 'added' && (
        <span>{formatDiffValue(diff.newValue)}</span>
      )}
      {diff.type === 'removed' && (
        <span className="text-muted-foreground line-through">
          {formatDiffValue(diff.oldValue)}
        </span>
      )}
    </div>
  );
}
