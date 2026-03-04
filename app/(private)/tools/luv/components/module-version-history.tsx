'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { getModuleVersions, saveModuleWithVersion } from '@/lib/luv-chassis';
import type { LuvChassisModuleVersion } from '@/lib/types/luv-chassis';

interface ModuleVersionHistoryProps {
  moduleId: string;
  currentVersion: number;
  onRestored?: () => void;
}

export function ModuleVersionHistory({
  moduleId,
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
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
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
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {restoring === version.id ? 'Restoring...' : 'Restore'}
                      </Button>
                    )}
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="mt-2 pt-2 border-t">
                    <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap max-h-48 overflow-auto">
                      {JSON.stringify(version.parameters, null, 2)}
                    </pre>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
