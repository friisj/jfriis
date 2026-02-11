'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StepConfigPanel } from './step-config-panel';
import type { PipelineStepConfig } from './pipeline-builder-form';
import type { CogPipelineStepType } from '@/lib/types/cog';

interface StepBuilderProps {
  steps: PipelineStepConfig[];
  onStepsChange: (steps: PipelineStepConfig[]) => void;
}

export function StepBuilder({ steps, onStepsChange }: StepBuilderProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addStep = (type: CogPipelineStepType) => {
    const newStep: PipelineStepConfig = {
      step_order: steps.length,
      step_type: type,
      model: 'auto',
      config: {},
      status: 'pending',
    };
    onStepsChange([...steps, newStep]);
    setEditingIndex(steps.length);
  };

  const removeStep = (index: number) => {
    onStepsChange(steps.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    onStepsChange(newSteps);
  };

  const updateStep = (index: number, updates: Partial<PipelineStepConfig>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onStepsChange(newSteps);
  };

  return (
    <div className="space-y-4">
      {steps.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground mb-4">
            No steps added yet. Add your first step to begin building the pipeline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="border rounded-lg p-4 bg-muted/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono bg-background px-2 py-1 rounded">
                      Step {idx + 1}
                    </span>
                    <span className="text-sm font-medium capitalize">
                      {step.step_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({step.model})
                    </span>
                  </div>

                  {editingIndex === idx ? (
                    <div className="space-y-3">
                      <StepConfigPanel
                        step={step}
                        onChange={(updates) => updateStep(idx, updates)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingIndex(null)}
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {Object.keys(step.config).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {Object.keys(step.config).length} configuration(s) set
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingIndex(idx)}
                      >
                        Configure
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveStep(idx, 'up')}
                    disabled={idx === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveStep(idx, 'down')}
                    disabled={idx === steps.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeStep(idx)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Step Buttons */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Add Step:</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => addStep('generate')}
          >
            + Generate
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addStep('refine')}
          >
            + Refine
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addStep('inpaint')}
          >
            + Inpaint
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addStep('eval')}
          >
            + Eval
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addStep('upscale')}
          >
            + Upscale
          </Button>
        </div>
      </div>
    </div>
  );
}
