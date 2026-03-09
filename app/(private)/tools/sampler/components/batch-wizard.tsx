'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { IconLoader2, IconX, IconSparkles, IconBolt } from '@tabler/icons-react';
import type { SamplerCollection, GenerationMethod, BatchPrompt, BatchSpec } from '@/lib/types/sampler';

interface BatchWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: SamplerCollection;
}

export function BatchWizard({ open, onOpenChange, collection }: BatchWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<GenerationMethod>('synth');
  const [count, setCount] = useState(8);
  const [description, setDescription] = useState('');
  const [prompts, setPrompts] = useState<BatchPrompt[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep(0);
    setMethod('synth');
    setCount(8);
    setDescription('');
    setPrompts([]);
    setError(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  async function generatePrompts() {
    setError(null);
    setStep(2);

    try {
      const res = await fetch('/api/sampler/batch-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, count, method }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate prompts');
      }

      const data = await res.json();
      setPrompts(data.prompts);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompts');
      setStep(1);
    }
  }

  function updatePrompt(index: number, field: 'prompt' | 'label', value: string) {
    setPrompts((prev) =>
      prev.map((p) => (p.index === index ? { ...p, [field]: value } : p))
    );
  }

  function removePrompt(index: number) {
    setPrompts((prev) => prev.filter((p) => p.index !== index));
  }

  function runBatch() {
    const spec: BatchSpec = {
      collectionId: collection.id,
      method,
      prompts,
    };
    sessionStorage.setItem(`sampler-batch-${collection.id}`, JSON.stringify(spec));
    handleOpenChange(false);
    router.push(`/tools/sampler/${collection.slug}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Batch Generate &mdash; {collection.name}
          </DialogTitle>
        </DialogHeader>

        {/* Step 0: Method + Count */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Generation Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('elevenlabs')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    method === 'elevenlabs'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <IconSparkles size={20}  />
                  <span className="text-sm font-medium">ElevenLabs</span>
                  <span className="text-xs text-muted-foreground text-center">Realistic audio samples</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('synth')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    method === 'synth'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <IconBolt size={20}  />
                  <span className="text-sm font-medium">Synth</span>
                  <span className="text-xs text-muted-foreground text-center">Tone.js procedural sounds</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Number of Sounds</Label>
                <span className="text-sm font-mono text-muted-foreground">{count}</span>
              </div>
              <Slider
                value={[count]}
                onValueChange={([v]) => setCount(v)}
                min={1}
                max={32}
                step={1}
              />
            </div>

            <Button onClick={() => setStep(1)} className="w-full">
              Next
            </Button>
          </div>
        )}

        {/* Step 1: Description */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch-desc">Describe what you need</Label>
              <Textarea
                id="batch-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  method === 'elevenlabs'
                    ? 'e.g. "a complete 808 drum kit with punchy kick, snappy snare, crisp hi-hats..."'
                    : 'e.g. "a set of lo-fi synth percussion: warm kicks, soft clicks, ambient textures..."'
                }
                rows={4}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Be descriptive — this will be decomposed into {count} individual sound prompts.
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={generatePrompts}
                disabled={!description.trim()}
                className="flex-1"
              >
                Generate Prompts
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Loading */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <IconLoader2 size={32} className="animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Generating {count} sound prompts...
            </p>
          </div>
        )}

        {/* Step 3: Review / Edit */}
        {step === 3 && (
          <div className="flex flex-col gap-4 min-h-0">
            <p className="text-sm text-muted-foreground">
              Review and edit the prompts below, then run the batch.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 max-h-[50vh] pr-1">
              {prompts.map((p) => (
                <div key={p.index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">
                      {p.index + 1}
                    </span>
                    <Input
                      value={p.label || ''}
                      onChange={(e) => updatePrompt(p.index, 'label', e.target.value)}
                      placeholder="Label"
                      className="h-7 text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => removePrompt(p.index)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Remove prompt"
                    >
                      <IconX size={16}  />
                    </button>
                  </div>
                  <Textarea
                    value={p.prompt}
                    onChange={(e) => updatePrompt(p.index, 'prompt', e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={runBatch}
                disabled={prompts.length === 0}
                className="flex-1"
              >
                Run Batch ({prompts.length} sounds)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
