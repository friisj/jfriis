'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { IconCheck, IconX } from '@tabler/icons-react';
import { updateContextPack } from '@/lib/luv-chassis';
import type {
  LuvChassisContextPack,
  EvaluationCriterion,
  CorrectionEntry,
} from '@/lib/types/luv-chassis';

interface ContextPackEvaluatorProps {
  pack: LuvChassisContextPack;
  mediaUrl?: string;
  onUpdated?: () => void;
}

export function ContextPackEvaluator({
  pack,
  mediaUrl,
  onUpdated,
}: ContextPackEvaluatorProps) {
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(
    pack.evaluation_criteria
  );
  const [corrections, setCorrections] = useState<CorrectionEntry[]>(
    pack.corrections
  );
  const [newCorrection, setNewCorrection] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleCriterion = (idx: number, passed: boolean) => {
    setCriteria((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, passed } : c))
    );
  };

  const addCorrection = (criterion: EvaluationCriterion) => {
    if (!newCorrection.trim()) return;
    const entry: CorrectionEntry = {
      criterion: criterion.label,
      observation: `Expected: ${criterion.expectedValue}`,
      correction: newCorrection.trim(),
      created_at: new Date().toISOString(),
    };
    setCorrections((prev) => [...prev, entry]);
    setNewCorrection('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateContextPack(pack.id, {
        evaluation_criteria: criteria,
        corrections,
      });
      onUpdated?.();
    } catch (err) {
      console.error('Failed to save evaluation:', err);
    } finally {
      setSaving(false);
    }
  };

  const passedCount = criteria.filter((c) => c.passed === true).length;
  const failedCount = criteria.filter((c) => c.passed === false).length;
  const totalActive = criteria.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Evaluation
        </h4>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            v{pack.version}
          </Badge>
          <Badge
            variant={pack.status === 'active' ? 'default' : 'outline'}
            className="text-[10px]"
          >
            {pack.status}
          </Badge>
        </div>
      </div>

      {/* Side-by-side layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Image / Prompt */}
        <div className="space-y-2">
          {mediaUrl ? (
            <div className="rounded border overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl}
                alt="Generated output for evaluation"
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="rounded border border-dashed p-8 text-center text-xs text-muted-foreground">
              No image to evaluate. Upload or generate one first.
            </div>
          )}
          <div className="rounded border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-auto">
            {pack.generation_prompt || 'No prompt'}
          </div>
        </div>

        {/* Right: Criteria checklist */}
        <div className="space-y-3">
          <div className="text-[10px] text-muted-foreground">
            {passedCount}/{totalActive} passed
            {failedCount > 0 && `, ${failedCount} failed`}
          </div>

          <div className="space-y-1">
            {criteria.map((c, i) => (
              <div
                key={c.parameterKey}
                className="rounded border px-2 py-1.5 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <Button
                    variant={c.passed === true ? 'default' : 'outline'}
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => toggleCriterion(i, true)}
                  >
                    <IconCheck size={12}  />
                  </Button>
                  <Button
                    variant={c.passed === false ? 'destructive' : 'outline'}
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => toggleCriterion(i, false)}
                  >
                    <IconX size={12}  />
                  </Button>
                  <span className="text-xs flex-1">
                    {c.label}:{' '}
                    <span className="text-muted-foreground">
                      {c.expectedValue || '(unset)'}
                    </span>
                  </span>
                </div>
                {c.passed === false && (
                  <div className="flex items-center gap-1 pl-12">
                    <Textarea
                      value={newCorrection}
                      onChange={(e) => setNewCorrection(e.target.value)}
                      placeholder="What needs to change?"
                      rows={1}
                      className="text-[10px] h-6 min-h-6"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => addCorrection(c)}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {corrections.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">
                Corrections ({corrections.length})
              </p>
              {corrections.map((c, i) => (
                <div
                  key={i}
                  className="text-[10px] text-muted-foreground rounded border px-2 py-1"
                >
                  <span className="font-medium">{c.criterion}</span>: {c.correction}
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save Evaluation'}
          </Button>
        </div>
      </div>
    </div>
  );
}
