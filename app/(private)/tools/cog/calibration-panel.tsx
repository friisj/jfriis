'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, X, RefreshCw, Sparkles, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCogImageUrl, getBenchmarkRoundsForConfig, updateBenchmarkImageRating, getCalibrationSeeds } from '@/lib/cog';
import {
  distillPhotographer,
  runBenchmarkRound,
  refineDistilledPrompt,
  approveBenchmarkRound,
} from '@/lib/ai/actions/calibrate-photographer';
import type {
  CogPhotographerType,
  CogBenchmarkRoundWithImages,
  CogBenchmarkImage,
  CogCalibrationSeed,
} from '@/lib/types/cog';

interface CalibrationPanelProps {
  configId: string;
  photographerType: CogPhotographerType | null;
  currentDistilledPrompt: string | null;
  onDistilledPromptUpdated: (prompt: string) => void;
}

export function CalibrationPanel({
  configId,
  photographerType,
  currentDistilledPrompt,
  onDistilledPromptUpdated,
}: CalibrationPanelProps) {
  const [prompt, setPrompt] = useState(currentDistilledPrompt || '');
  const [rounds, setRounds] = useState<CogBenchmarkRoundWithImages[]>([]);
  const [seed, setSeed] = useState<CogCalibrationSeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [distilling, setDistilling] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRounds = useCallback(async () => {
    try {
      const data = await getBenchmarkRoundsForConfig(configId, 'photographer');
      setRounds(data);
    } catch {
      // Ignore load errors silently
    }
  }, [configId]);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  useEffect(() => {
    if (!photographerType) { setSeed(null); return; }
    getCalibrationSeeds().then(seeds => {
      setSeed(seeds.find(s => s.type_key === photographerType) ?? null);
    }).catch(() => setSeed(null));
  }, [photographerType]);

  useEffect(() => {
    setPrompt(currentDistilledPrompt || '');
  }, [currentDistilledPrompt]);

  if (!photographerType) {
    return (
      <div className="border-t pt-4 mt-4">
        <p className="text-xs text-muted-foreground">Set a photographer type to enable calibration.</p>
      </div>
    );
  }

  const activeRound = rounds.find(r => r.status === 'active');
  const nextRoundNumber = rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) + 1 : 1;

  async function handleDistill() {
    setDistilling(true);
    setError(null);
    try {
      const result = await distillPhotographer(configId);
      setPrompt(result.distilledPrompt);
      onDistilledPromptUpdated(result.distilledPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Distillation failed');
    } finally {
      setDistilling(false);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      await runBenchmarkRound({
        configId,
        distilledPrompt: prompt.trim(),
        roundNumber: nextRoundNumber,
      });
      await loadRounds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benchmark generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRateImage(imageId: string, rating: 'approved' | 'rejected') {
    try {
      await updateBenchmarkImageRating(imageId, rating, null);
      await loadRounds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rate image');
    }
  }

  async function handleImageFeedback(imageId: string, feedback: string) {
    try {
      const image = activeRound?.images.find(i => i.id === imageId);
      await updateBenchmarkImageRating(imageId, image?.rating ?? null, feedback || null);
      await loadRounds();
    } catch {
      // Silently handle feedback save errors
    }
  }

  async function handleRefine() {
    if (!activeRound) return;
    setRefining(true);
    setError(null);
    try {
      const result = await refineDistilledPrompt({
        configId,
        roundId: activeRound.id,
      });
      setPrompt(result.refinedPrompt);
      onDistilledPromptUpdated(result.refinedPrompt);
      await loadRounds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed');
    } finally {
      setRefining(false);
    }
  }

  async function handleApprove() {
    if (!activeRound) return;
    setApproving(true);
    setError(null);
    try {
      await approveBenchmarkRound({ configId, roundId: activeRound.id });
      onDistilledPromptUpdated(activeRound.distilled_prompt);
      await loadRounds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApproving(false);
    }
  }

  const busy = distilling || generating || refining || approving || loading;

  return (
    <div className="border-t pt-4 mt-4 space-y-4">
      <h4 className="text-sm font-semibold">Calibration</h4>

      {error && <div className="p-2 text-xs text-destructive bg-destructive/10 rounded">{error}</div>}

      {/* Distilled prompt */}
      <div className="space-y-1.5">
        <Label className="text-xs">Distilled Prompt</Label>
        <Textarea
          value={prompt}
          onChange={e => {
            setPrompt(e.target.value);
            onDistilledPromptUpdated(e.target.value);
          }}
          placeholder="Distilled prompt fragment will appear here..."
          className="text-sm"
          rows={4}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleDistill} disabled={busy} className="h-7 text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {distilling ? 'Distilling...' : prompt.trim() ? 'Re-distill' : 'Distill'}
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={busy || !prompt.trim()} className="h-7 text-xs">
            {generating ? 'Generating...' : 'Generate Benchmark'}
          </Button>
        </div>
      </div>

      {/* Active round */}
      {activeRound && (
        <ActiveRoundView
          round={activeRound}
          seedImageUrl={seed?.seed_image_path ? getCogImageUrl(seed.seed_image_path) : null}
          seedLabel={seed?.label ?? null}
          onRate={handleRateImage}
          onFeedback={handleImageFeedback}
          onRefine={handleRefine}
          onApprove={handleApprove}
          refining={refining}
          approving={approving}
          busy={busy}
        />
      )}

      {/* Round history */}
      {rounds.filter(r => r.status !== 'active').length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-muted-foreground">Round History</h5>
          {rounds.filter(r => r.status !== 'active').map(round => (
            <RoundHistoryItem key={round.id} round={round} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Active Round View
// ============================================================================

function ActiveRoundView({
  round,
  seedImageUrl,
  seedLabel,
  onRate,
  onFeedback,
  onRefine,
  onApprove,
  refining,
  approving,
  busy,
}: {
  round: CogBenchmarkRoundWithImages;
  seedImageUrl: string | null;
  seedLabel: string | null;
  onRate: (imageId: string, rating: 'approved' | 'rejected') => void;
  onFeedback: (imageId: string, feedback: string) => void;
  onRefine: () => void;
  onApprove: () => void;
  refining: boolean;
  approving: boolean;
  busy: boolean;
}) {
  return (
    <div className="space-y-3 p-3 border rounded-md bg-muted/20">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">Round {round.round_number}</p>
        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">active</span>
      </div>

      {/* Seed reference + Benchmark images */}
      <div className="grid grid-cols-4 gap-3">
        {/* Seed reference image */}
        <div className="space-y-1.5">
          {seedImageUrl ? (
            <div className="relative aspect-square rounded overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={seedImageUrl}
                alt={seedLabel || 'Seed reference'}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-square rounded bg-muted/50 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
              <span className="text-xs text-muted-foreground/40">No seed</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">
            {seedLabel ? `${seedLabel} ref` : 'Reference'}
          </p>
        </div>

        {/* Benchmark images */}
        {round.images.map(img => (
          <BenchmarkImageCard
            key={img.id}
            image={img}
            onRate={onRate}
            onFeedback={onFeedback}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onRefine} disabled={busy} className="h-7 text-xs">
          <RefreshCw className="h-3 w-3 mr-1" />
          {refining ? 'Refining...' : 'Refine'}
        </Button>
        <Button size="sm" onClick={onApprove} disabled={busy} className="h-7 text-xs">
          <ThumbsUp className="h-3 w-3 mr-1" />
          {approving ? 'Approving...' : 'Approve'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Benchmark Image Card
// ============================================================================

function BenchmarkImageCard({
  image,
  onRate,
  onFeedback,
}: {
  image: CogBenchmarkImage;
  onRate: (imageId: string, rating: 'approved' | 'rejected') => void;
  onFeedback: (imageId: string, feedback: string) => void;
}) {
  const [feedbackText, setFeedbackText] = useState(image.feedback || '');

  return (
    <div className="space-y-1.5">
      <div className="relative aspect-square rounded overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getCogImageUrl(image.storage_path)}
          alt={`Benchmark image ${image.image_index + 1}`}
          className="w-full h-full object-cover"
        />
        {image.rating && (
          <div className={`absolute top-1 right-1 rounded-full p-0.5 ${
            image.rating === 'approved' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {image.rating === 'approved' ? (
              <Check className="h-3 w-3 text-white" />
            ) : (
              <X className="h-3 w-3 text-white" />
            )}
          </div>
        )}
      </div>

      {/* Rating buttons */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={image.rating === 'approved' ? 'default' : 'outline'}
          onClick={() => onRate(image.id, 'approved')}
          className="h-6 flex-1 text-xs px-1"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant={image.rating === 'rejected' ? 'destructive' : 'outline'}
          onClick={() => onRate(image.id, 'rejected')}
          className="h-6 flex-1 text-xs px-1"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Feedback */}
      <Input
        value={feedbackText}
        onChange={e => setFeedbackText(e.target.value)}
        onBlur={() => onFeedback(image.id, feedbackText)}
        placeholder="Feedback..."
        className="text-xs h-6"
      />
    </div>
  );
}

// ============================================================================
// Round History Item
// ============================================================================

function RoundHistoryItem({ round }: { round: CogBenchmarkRoundWithImages }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-md p-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs cursor-pointer"
      >
        <span className="font-medium">Round {round.round_number}</span>
        <span className={`px-1.5 py-0.5 rounded ${
          round.status === 'approved'
            ? 'bg-green-500/10 text-green-600'
            : 'bg-muted text-muted-foreground'
        }`}>
          {round.status}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{round.distilled_prompt}</p>
          {round.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {round.images.map(img => (
                <div key={img.id} className="relative aspect-square rounded overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getCogImageUrl(img.storage_path)}
                    alt={`Round ${round.round_number} image ${img.image_index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {img.rating && (
                    <div className={`absolute top-1 right-1 rounded-full p-0.5 ${
                      img.rating === 'approved' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {img.rating === 'approved' ? (
                        <Check className="h-2.5 w-2.5 text-white" />
                      ) : (
                        <X className="h-2.5 w-2.5 text-white" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
