'use client';

import { Button } from '@/components/ui/button';
import { getCogImageUrl } from '@/lib/cog';
import type { CogPipelineStepWithOutput } from '@/lib/types/cog';

interface PipelineStepCardProps {
  step: CogPipelineStepWithOutput;
  stepNumber: number;
  isActive: boolean;
  seriesId: string;
  onRetryFromStep?: (stepId: string) => void;
}

export function PipelineStepCard({ step, stepNumber, isActive, onRetryFromStep }: PipelineStepCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  const getStepTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isActive ? 'border-primary shadow-md' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono bg-background px-2 py-1 rounded">
              Step {stepNumber}
            </span>
            <span className="text-sm font-medium">{getStepTypeLabel(step.step_type)}</span>
            <span className="text-xs text-muted-foreground">({step.model})</span>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(step.status)}`}>
              {step.status}
            </span>
          </div>

          {/* Step configuration preview */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {typeof step.config.prompt === 'string' && step.config.prompt && (
              <p className="line-clamp-1">Prompt: {step.config.prompt}</p>
            )}
            {typeof step.config.refinementPrompt === 'string' && step.config.refinementPrompt && (
              <p className="line-clamp-1">Refinement: {step.config.refinementPrompt}</p>
            )}
            {typeof step.config.evalCriteria === 'string' && step.config.evalCriteria && (
              <p className="line-clamp-1">Criteria: {step.config.evalCriteria}</p>
            )}
            {typeof step.config.imageSize === 'string' && step.config.imageSize && (
              <p>Size: {step.config.imageSize}</p>
            )}
          </div>

          {/* Error message */}
          {step.error_message && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs text-destructive">
              <p>{step.error_message}</p>
              {step.status === 'failed' && onRetryFromStep && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-6 text-xs"
                  onClick={() => onRetryFromStep(step.id)}
                >
                  Retry from here
                </Button>
              )}
            </div>
          )}

          {/* Output indicator with thumbnail */}
          {step.output && (
            <div className="mt-2 flex items-center gap-2">
              {step.output.storage_path ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getCogImageUrl(step.output.storage_path)}
                  alt={`Step ${stepNumber} output`}
                  className="w-20 h-20 object-cover rounded border"
                />
              ) : (
                <span className="text-xs text-muted-foreground">✓ Output generated</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
