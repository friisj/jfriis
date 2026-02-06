'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { MaskCanvas } from './mask-canvas';
import { touchupCogImage } from '@/lib/ai/actions/touchup-cog-image';

interface LightboxTouchupDialogProps {
  imageId: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newImageId: string) => void;
}

type Mode = 'spot_removal' | 'guided_edit';

export function LightboxTouchupDialog({
  imageId,
  imageUrl,
  imageWidth,
  imageHeight,
  isOpen,
  onClose,
  onSuccess,
}: LightboxTouchupDialogProps) {
  const [mode, setMode] = useState<Mode>('spot_removal');
  const [maskBase64, setMaskBase64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setMaskBase64(null);
      setPrompt('');
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Focus prompt when switching to guided edit mode
  useEffect(() => {
    if (mode === 'guided_edit' && promptRef.current) {
      promptRef.current.focus();
    }
  }, [mode]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  async function handleSubmit() {
    if (!maskBase64) {
      setError('Please draw a mask on the image first');
      return;
    }

    if (mode === 'guided_edit' && !prompt.trim()) {
      setError('Please enter a prompt describing the desired change');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await touchupCogImage({
        imageId,
        maskBase64,
        mode,
        prompt: mode === 'guided_edit' ? prompt.trim() : undefined,
      });

      if (result.success && result.newImageId) {
        onSuccess(result.newImageId);
        onClose();
      } else {
        setError(result.error || 'Touchup failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }

  if (!isOpen) return null;

  const canSubmit = maskBase64 && (mode === 'spot_removal' || prompt.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        className="bg-zinc-900 border border-white/20 rounded-lg overflow-hidden w-[95vw] max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h3 className="text-white font-medium">Touchup Image</h3>

            {/* Mode tabs */}
            <div className="flex gap-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setMode('spot_removal')}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  mode === 'spot_removal'
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Spot Removal
              </button>
              <button
                onClick={() => setMode('guided_edit')}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  mode === 'guided_edit'
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Guided Edit
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/60 hover:text-white text-lg disabled:opacity-50 p-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mode description */}
          <p className="text-sm text-white/60">
            {mode === 'spot_removal'
              ? 'Paint over areas to remove (blemishes, objects, unwanted elements). The AI will fill them naturally.'
              : 'Paint over areas to change, then describe what you want instead.'}
          </p>

          {/* Mask canvas */}
          <MaskCanvas
            imageUrl={imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            onMaskChange={setMaskBase64}
          />

          {/* Prompt input (only for guided edit) */}
          {mode === 'guided_edit' && (
            <div className="space-y-2">
              <label className="text-sm text-white/70">
                Describe the change:
              </label>
              <Textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'Add a blue flower' or 'Change hair color to blonde'"
                rows={2}
                disabled={isProcessing}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                {[
                  'Smooth skin',
                  'Remove shadows',
                  'Brighten area',
                  'Add detail',
                  'Change color',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrompt(suggestion)}
                    disabled={isProcessing}
                    className="text-xs px-2 py-1 rounded border border-white/20 text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Spot removal presets */}
          {mode === 'spot_removal' && (
            <div className="text-xs text-white/50">
              Tip: For best results with spot removal, use a brush just slightly larger than the area you want to remove.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10">
          <div className="text-xs text-white/40">
            {mode === 'guided_edit' && (
              <>
                <kbd className="px-1 py-0.5 bg-white/10 rounded">⌘</kbd>+
                <kbd className="px-1 py-0.5 bg-white/10 rounded">Enter</kbd> to
                submit
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isProcessing}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || isProcessing}
              className="bg-white text-black hover:bg-white/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : mode === 'spot_removal' ? (
                'Remove'
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
