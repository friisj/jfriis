'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Shuffle, Trash2, Paintbrush, Eraser } from 'lucide-react';
import { MaskCanvas, type MaskCanvasRef, type MaskTool } from './mask-canvas';
import { touchupCogImage } from '@/lib/ai/actions/touchup-cog-image';
import { refineCogImageStandalone } from '@/lib/ai/actions/refine-cog-image-standalone';

type EditMode = 'spot_removal' | 'guided_edit' | 'refine';
type TouchupModel = 'flux-fill-dev';
type RefinementModel = 'gemini-3-pro' | 'flux-2-pro' | 'flux-2-dev';
type ImageSize = '1K' | '2K' | '4K';
type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

const editModeLabels: Record<EditMode, string> = {
  spot_removal: 'Spot Removal',
  guided_edit: 'Guided Edit',
  refine: 'Refine',
};

const editModeDescriptions: Record<EditMode, string> = {
  spot_removal: 'Paint over areas to remove (blemishes, objects). AI fills naturally.',
  guided_edit: 'Paint areas to change, describe what you want instead.',
  refine: 'Describe changes to regenerate the image with reference.',
};

const refinementModelLabels: Record<RefinementModel, string> = {
  'gemini-3-pro': 'Gemini 3 Pro',
  'flux-2-pro': 'Flux 2 Pro',
  'flux-2-dev': 'Flux 2 Dev',
};

const refinementModelDescriptions: Record<RefinementModel, string> = {
  'gemini-3-pro': 'Conversational refinement, best for subtle edits',
  'flux-2-pro': 'High quality regeneration with reference',
  'flux-2-dev': 'Fast regeneration with reference',
};

const imageSizeLabels: Record<ImageSize, string> = {
  '1K': '1K (~1024px)',
  '2K': '2K (~2048px)',
  '4K': '4K (~4096px)',
};

const aspectRatioLabels: Record<AspectRatio, string> = {
  '1:1': '1:1 Square',
  '2:3': '2:3 Portrait',
  '3:2': '3:2 Landscape',
  '3:4': '3:4 Portrait',
  '4:3': '4:3 Landscape',
  '4:5': '4:5 Portrait',
  '5:4': '5:4 Landscape',
  '9:16': '9:16 Tall',
  '16:9': '16:9 Wide',
  '21:9': '21:9 Ultra-wide',
};

interface LightboxEditModeProps {
  imageId: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  onClose: () => void;
  onSuccess: (newImageId: string) => void;
}

export function LightboxEditMode({
  imageId,
  imageUrl,
  imageWidth,
  imageHeight,
  onClose,
  onSuccess,
}: LightboxEditModeProps) {
  // Edit mode state
  const [mode, setMode] = useState<EditMode>('spot_removal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mask state (for touchup modes)
  const [maskBase64, setMaskBase64] = useState<string | null>(null);
  const maskCanvasRef = useRef<MaskCanvasRef | null>(null);

  // Brush tool state
  const [brushTool, setBrushTool] = useState<MaskTool>('brush');
  const [brushSize, setBrushSize] = useState(30);
  const [maskOpacity, setMaskOpacity] = useState(0.5);

  // Prompt state
  const [prompt, setPrompt] = useState('');
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [guidance, setGuidance] = useState(30);
  const [quality, setQuality] = useState(28);
  const [seed, setSeed] = useState<string>('');

  // Model selection (for refine mode)
  const [refinementModel, setRefinementModel] = useState<RefinementModel>('gemini-3-pro');
  const [imageSize, setImageSize] = useState<ImageSize>('2K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

  // Reset state when mode changes
  useEffect(() => {
    setError(null);
    setPrompt('');
    if (mode === 'spot_removal') {
      setGuidance(25);
    } else if (mode === 'guided_edit') {
      setGuidance(30);
    }
  }, [mode]);

  // Focus prompt when in guided edit or refine mode
  useEffect(() => {
    if ((mode === 'guided_edit' || mode === 'refine') && promptRef.current) {
      promptRef.current.focus();
    }
  }, [mode]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Still handle Escape
        if (e.key === 'Escape' && !isProcessing) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
        return;
      }

      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // Only handle brush shortcuts when mask mode is active (spot_removal or guided_edit)
      if ((mode === 'spot_removal' || mode === 'guided_edit') && !isProcessing) {
        switch (e.key.toLowerCase()) {
          case 'b':
            setBrushTool('brush');
            break;
          case 'x':
          case 'e':
            // Only switch to eraser if not in a text input
            setBrushTool('eraser');
            break;
          case '[':
            setBrushSize((s) => Math.max(5, s - 5));
            break;
          case ']':
            setBrushSize((s) => Math.min(200, s + 5));
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, onClose, mode]);

  const handleClearMask = useCallback(() => {
    maskCanvasRef.current?.clearMask();
    setMaskBase64(null);
  }, []);

  const canSubmit = (() => {
    if (mode === 'refine') {
      return prompt.trim().length > 0;
    }
    // Touchup modes require mask
    if (!maskBase64) return false;
    if (mode === 'guided_edit' && !prompt.trim()) return false;
    return true;
  })();

  async function handleSubmit() {
    if (!canSubmit || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (mode === 'refine') {
        // Use refinement action
        const result = await refineCogImageStandalone({
          imageId,
          feedback: prompt.trim(),
          model: refinementModel,
          imageSize,
          aspectRatio,
        });

        if (result.success && result.newImageId) {
          onSuccess(result.newImageId);
        } else {
          setError(result.error || 'Refinement failed');
        }
      } else {
        // Use touchup action (spot_removal or guided_edit)
        const result = await touchupCogImage({
          imageId,
          maskBase64: maskBase64!,
          mode: mode as 'spot_removal' | 'guided_edit',
          prompt: mode === 'guided_edit' ? prompt.trim() : undefined,
          guidance,
          quality,
          seed: seed.trim() ? parseInt(seed.trim(), 10) : undefined,
        });

        if (result.success && result.newImageId) {
          onSuccess(result.newImageId);
        } else {
          setError(result.error || 'Touchup failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }

  const needsMask = mode === 'spot_removal' || mode === 'guided_edit';
  const needsPrompt = mode === 'guided_edit' || mode === 'refine';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-white/10 rounded-lg p-1">
            {(Object.keys(editModeLabels) as EditMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={isProcessing}
                className={`px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 ${
                  mode === m
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {editModeLabels[m]}
              </button>
            ))}
          </div>

          {/* Model selector for refine mode */}
          {mode === 'refine' && (
            <>
              <Select
                value={refinementModel}
                onValueChange={(v) => setRefinementModel(v as RefinementModel)}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(refinementModelLabels) as RefinementModel[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {refinementModelLabels[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Size and aspect ratio - available for all refinement models */}
              <Select
                value={imageSize}
                onValueChange={(v) => setImageSize(v as ImageSize)}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(imageSizeLabels) as ImageSize[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {imageSizeLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={aspectRatio}
                onValueChange={(v) => setAspectRatio(v as AspectRatio)}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(aspectRatioLabels) as AspectRatio[]).map((ar) => (
                    <SelectItem key={ar} value={ar}>
                      {aspectRatioLabels[ar]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">
            {editModeDescriptions[mode]}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Main content - Image area with floating palettes */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative">
        {needsMask ? (
          <MaskCanvas
            ref={maskCanvasRef}
            imageUrl={imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            onMaskChange={setMaskBase64}
            maxHeight="calc(100vh - 200px)"
            hideToolbar
            tool={brushTool}
            brushSize={brushSize}
            maskOpacity={maskOpacity}
          />
        ) : (
          <img
            src={imageUrl}
            alt="Image to refine"
            className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded"
          />
        )}

        {/* Floating Tool Palette */}
        {needsMask && (
          <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-black/80 backdrop-blur-sm rounded-lg p-2 border border-white/20">
            {/* Tool selection */}
            <div className="flex gap-1 bg-white/10 rounded-md p-0.5">
              <Button
                variant={brushTool === 'brush' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBrushTool('brush')}
                disabled={isProcessing}
                className="h-8 px-2"
                title="Brush (B)"
              >
                <Paintbrush className="w-4 h-4" />
              </Button>
              <Button
                variant={brushTool === 'eraser' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBrushTool('eraser')}
                disabled={isProcessing}
                className="h-8 px-2"
                title="Eraser (E/X)"
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-white/20" />

            {/* Brush size */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Size</span>
              <Slider
                value={[brushSize]}
                onValueChange={([v]) => setBrushSize(v)}
                min={5}
                max={200}
                step={1}
                disabled={isProcessing}
                className="w-24"
              />
              <span className="text-xs text-white/60 w-6 text-right">{brushSize}</span>
            </div>

            <div className="w-px h-6 bg-white/20" />

            {/* Mask opacity */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Opacity</span>
              <Slider
                value={[maskOpacity * 100]}
                onValueChange={([v]) => setMaskOpacity(v / 100)}
                min={10}
                max={90}
                step={5}
                disabled={isProcessing}
                className="w-20"
              />
            </div>

            <div className="w-px h-6 bg-white/20" />

            {/* Clear mask */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearMask}
              disabled={isProcessing || !maskBase64}
              className="h-8 px-2 text-white/70 hover:text-white hover:bg-white/10"
              title="Clear mask"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            {maskBase64 && (
              <span className="text-xs text-green-400 ml-1">Ready</span>
            )}
          </div>
        )}

        {/* Floating Advanced Options Palette */}
        {needsMask && showAdvanced && (
          <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20 w-64">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/70 font-medium">Advanced</span>
              <button
                onClick={() => setShowAdvanced(false)}
                className="text-white/40 hover:text-white/70 text-sm"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {/* Guidance */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-white/60">Guidance</label>
                  <span className="text-xs text-white/50 font-mono">{guidance}</span>
                </div>
                <Slider
                  value={[guidance]}
                  onValueChange={([v]) => setGuidance(v)}
                  min={0}
                  max={100}
                  step={5}
                  disabled={isProcessing}
                />
              </div>

              {/* Quality */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-white/60">Quality</label>
                  <span className="text-xs text-white/50 font-mono">{quality}</span>
                </div>
                <Slider
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                  min={10}
                  max={50}
                  step={2}
                  disabled={isProcessing}
                />
              </div>

              {/* Seed */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Seed</label>
                <div className="flex gap-1.5">
                  <Input
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
                    placeholder="Random"
                    disabled={isProcessing}
                    className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 text-xs h-7"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSeed(String(Math.floor(Math.random() * 2147483647)))}
                    disabled={isProcessing}
                    className="text-white/70 hover:text-white hover:bg-white/10 h-7 px-2"
                  >
                    <Shuffle className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced toggle button (when not showing) */}
        {needsMask && !showAdvanced && (
          <button
            onClick={() => setShowAdvanced(true)}
            className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20 text-xs text-white/60 hover:text-white/80 transition-colors"
          >
            Advanced ▸
          </button>
        )}
      </div>

      {/* Footer - Chat-style input */}
      <div className="border-t border-white/10 p-4">
        {/* Error */}
        {error && (
          <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded text-sm">
            {error}
          </div>
        )}

        {/* Chat-style input row */}
        <div className="flex items-end gap-3">
          {needsPrompt ? (
            <>
              <Textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'guided_edit'
                    ? "Describe what you want in the masked area..."
                    : "Describe the changes you want..."
                }
                rows={1}
                disabled={isProcessing}
                className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 resize-none min-h-[44px] max-h-32"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isProcessing}
                className="bg-white text-black hover:bg-white/90 h-11 px-6"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Apply'
                )}
              </Button>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-between">
              <div className="text-sm text-white/50">
                {maskBase64
                  ? 'Mask ready. Click Apply to remove the painted areas.'
                  : 'Paint over the areas you want to remove.'}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isProcessing}
                className="bg-white text-black hover:bg-white/90 h-11 px-6"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Apply'
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Model description for refine mode */}
        {mode === 'refine' && (
          <div className="mt-2 text-xs text-white/40">
            {refinementModelDescriptions[refinementModel]}
          </div>
        )}
      </div>
    </div>
  );
}
