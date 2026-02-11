'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PipelineStepConfig } from './pipeline-builder-form';
import type { CogImageModel, CogImageSize, CogAspectRatio } from '@/lib/types/cog';

interface StepConfigPanelProps {
  step: PipelineStepConfig;
  onChange: (updates: Partial<PipelineStepConfig>) => void;
}

const IMAGE_MODELS: CogImageModel[] = [
  'gemini-2.0-flash-exp',
  'imagen-3-capability',
  'flux-2-pro',
];

const IMAGE_SIZES: CogImageSize[] = ['1K', '2K', '4K'];

const ASPECT_RATIOS: CogAspectRatio[] = [
  '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9',
];

export function StepConfigPanel({ step, onChange }: StepConfigPanelProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({
      config: {
        ...step.config,
        [key]: value,
      },
    });
  };

  const updateModel = (model: string) => {
    onChange({ model });
  };

  // Common fields for generate, refine
  const showImageGenFields = step.step_type === 'generate' || step.step_type === 'refine';

  return (
    <div className="space-y-3 p-3 bg-background rounded-lg border">
      {/* Model Selection */}
      <div className="space-y-2">
        <Label>Model</Label>
        <Select value={step.model} onValueChange={updateModel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_MODELS.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Generate Step */}
      {step.step_type === 'generate' && (
        <>
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={(step.config.prompt as string) || ''}
              onChange={(e) => updateConfig('prompt', e.target.value)}
              placeholder="Additional prompt for this generation step..."
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Image Size</Label>
              <Select
                value={(step.config.imageSize as string) || '2K'}
                onValueChange={(v) => updateConfig('imageSize', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select
                value={(step.config.aspectRatio as string) || '1:1'}
                onValueChange={(v) => updateConfig('aspectRatio', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio} value={ratio}>
                      {ratio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {/* Refine Step */}
      {step.step_type === 'refine' && (
        <>
          <div className="space-y-2">
            <Label>Refinement Prompt</Label>
            <Textarea
              value={(step.config.refinementPrompt as string) || ''}
              onChange={(e) => updateConfig('refinementPrompt', e.target.value)}
              placeholder="How should the previous output be refined..."
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Image Size</Label>
              <Select
                value={(step.config.imageSize as string) || '2K'}
                onValueChange={(v) => updateConfig('imageSize', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select
                value={(step.config.aspectRatio as string) || '1:1'}
                onValueChange={(v) => updateConfig('aspectRatio', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio} value={ratio}>
                      {ratio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {/* Inpaint Step */}
      {step.step_type === 'inpaint' && (
        <>
          <div className="space-y-2">
            <Label>Mask Prompt</Label>
            <Input
              value={(step.config.maskPrompt as string) || ''}
              onChange={(e) => updateConfig('maskPrompt', e.target.value)}
              placeholder="What area to modify..."
            />
          </div>
          <div className="space-y-2">
            <Label>Fill Prompt</Label>
            <Textarea
              value={(step.config.fillPrompt as string) || ''}
              onChange={(e) => updateConfig('fillPrompt', e.target.value)}
              placeholder="What to fill the masked area with..."
              className="min-h-[60px]"
            />
          </div>
        </>
      )}

      {/* Eval Step */}
      {step.step_type === 'eval' && (
        <div className="space-y-2">
          <Label>Evaluation Criteria</Label>
          <Textarea
            value={(step.config.evalCriteria as string) || ''}
            onChange={(e) => updateConfig('evalCriteria', e.target.value)}
            placeholder="What criteria should be used to select the best image..."
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            If previous step generated multiple outputs, eval will select one winner
          </p>
        </div>
      )}

      {/* Upscale Step */}
      {step.step_type === 'upscale' && (
        <div className="space-y-2">
          <Label>Target Size</Label>
          <Select
            value={(step.config.targetSize as string) || '4K'}
            onValueChange={(v) => updateConfig('targetSize', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2K">2K</SelectItem>
              <SelectItem value="4K">4K</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
