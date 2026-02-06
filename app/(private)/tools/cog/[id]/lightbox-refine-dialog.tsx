'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { refineCogImageStandalone } from '@/lib/ai/actions/refine-cog-image-standalone';

type RefinementModel = 'gemini-3-pro' | 'flux-2-pro' | 'flux-2-dev';

const modelLabels: Record<RefinementModel, string> = {
  'gemini-3-pro': 'Gemini 3 Pro',
  'flux-2-pro': 'Flux 2 Pro',
  'flux-2-dev': 'Flux 2 Dev',
};

const modelDescriptions: Record<RefinementModel, string> = {
  'gemini-3-pro': 'Conversational refinement, best for subtle edits',
  'flux-2-pro': 'High quality regeneration with reference',
  'flux-2-dev': 'Fast regeneration with reference',
};

interface LightboxRefineDialogProps {
  imageId: string;
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newImageId: string) => void;
}

export function LightboxRefineDialog({
  imageId,
  imageUrl,
  isOpen,
  onClose,
  onSuccess,
}: LightboxRefineDialogProps) {
  const [feedback, setFeedback] = useState('');
  const [model, setModel] = useState<RefinementModel>('gemini-3-pro');
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRefining) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRefining, onClose]);

  async function handleRefine() {
    if (!feedback.trim() || isRefining) return;

    setIsRefining(true);
    setError(null);

    try {
      const result = await refineCogImageStandalone({
        imageId,
        feedback: feedback.trim(),
        model,
      });

      if (result.success && result.newImageId) {
        setFeedback('');
        onSuccess(result.newImageId);
        onClose();
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
    'Increase contrast',
    'More vibrant colors',
    'Soften the shadows',
    'Make background blurrier',
    'Adjust expression',
  ];

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-x-4 top-20 z-20 max-w-2xl mx-auto bg-black/95 border border-white/20 rounded-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-medium">Refine Image</h3>
        <button
          onClick={onClose}
          disabled={isRefining}
          className="text-white/60 hover:text-white text-lg disabled:opacity-50"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preview */}
          <div>
            <p className="text-xs text-white/50 mb-2">Current Image</p>
            <img
              src={imageUrl}
              alt="Current"
              className="w-full rounded border border-white/20 max-h-48 object-contain bg-black"
            />
          </div>

          {/* Feedback */}
          <div className="space-y-3">
            {/* Model selector */}
            <div>
              <p className="text-xs text-white/50 mb-2">Model</p>
              <Select
                value={model}
                onValueChange={(v) => setModel(v as RefinementModel)}
                disabled={isRefining}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-3-pro">{modelLabels['gemini-3-pro']}</SelectItem>
                  <SelectItem value="flux-2-pro">{modelLabels['flux-2-pro']}</SelectItem>
                  <SelectItem value="flux-2-dev">{modelLabels['flux-2-dev']}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-white/40 mt-1">{modelDescriptions[model]}</p>
            </div>

            <div>
              <p className="text-xs text-white/50 mb-2">Your Feedback</p>
              <Textarea
                ref={textareaRef}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe what you'd like to change..."
                rows={4}
                disabled={isRefining}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleRefine();
                  }
                }}
              />
            </div>

            {/* Suggestions */}
            <div>
              <p className="text-xs text-white/50 mb-1.5">Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setFeedback(suggestion)}
                    disabled={isRefining}
                    className="text-xs px-2 py-1 rounded border border-white/20 text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-white/10">
        <p className="text-xs text-white/40">
          <kbd className="px-1 py-0.5 bg-white/10 rounded">⌘</kbd>+
          <kbd className="px-1 py-0.5 bg-white/10 rounded">Enter</kbd> to submit
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isRefining}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleRefine}
            disabled={!feedback.trim() || isRefining}
            className="bg-white text-black hover:bg-white/90"
          >
            {isRefining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refining...
              </>
            ) : (
              'Refine'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
