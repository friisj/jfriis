'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MessageSquare, Loader2, Clock } from 'lucide-react';
import { refineCogImage } from '@/lib/ai/actions/refine-cog-image';

interface RefinementHistoryEntry {
  feedback: string;
  imageUrl: string;
  storagePath: string;
  durationMs: number;
  timestamp: string;
}

interface RefineImageDialogProps {
  stepId: string;
  currentImageUrl: string;
  refinementHistory?: RefinementHistoryEntry[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RefineImageDialog({
  stepId,
  currentImageUrl,
  refinementHistory = [],
}: RefineImageDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefine() {
    if (!feedback.trim()) return;

    setIsRefining(true);
    setError(null);

    try {
      const result = await refineCogImage({
        stepId,
        feedback: feedback.trim(),
      });

      if (result.success) {
        setFeedback('');
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error || 'Refinement failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRefining(false);
    }
  }

  const suggestions = [
    'Make the lighting warmer',
    'Increase contrast slightly',
    'Make the background more blurred',
    'Adjust the expression to be more natural',
    'Make the colors more vibrant',
    'Soften the shadows',
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Refine
          {refinementHistory.length > 0 && (
            <span className="text-xs bg-muted px-1.5 rounded">
              {refinementHistory.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Refine Image</DialogTitle>
          <DialogDescription>
            Describe what you'd like to change. The AI will modify the image based on your feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Current image */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Current Image</p>
            <img
              src={currentImageUrl}
              alt="Current"
              className="w-full rounded border"
            />
          </div>

          {/* Feedback input */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Your Feedback</p>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe what you'd like to change..."
                rows={4}
                disabled={isRefining}
              />
            </div>

            {/* Quick suggestions */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setFeedback(suggestion)}
                    disabled={isRefining}
                    className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Refinement history */}
        {refinementHistory.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-xs text-muted-foreground mb-2">
              Refinement History ({refinementHistory.length})
            </p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {refinementHistory.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-xs p-2 bg-muted/50 rounded"
                >
                  <img
                    src={entry.imageUrl}
                    alt={`Refinement ${index + 1}`}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{entry.feedback}</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(entry.durationMs)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isRefining}>
            Cancel
          </Button>
          <Button onClick={handleRefine} disabled={!feedback.trim() || isRefining}>
            {isRefining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refining...
              </>
            ) : (
              'Refine Image'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
