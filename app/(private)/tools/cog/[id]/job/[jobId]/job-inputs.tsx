'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCogImageUrl, createJobInput, deleteJobInput } from '@/lib/cog';
import type { CogImage, CogJobInputWithImage } from '@/lib/types/cog';

interface JobInputsProps {
  jobId: string;
  inputs: CogJobInputWithImage[];
  seriesImages: CogImage[];
  canEdit: boolean;
}

export function JobInputs({ jobId, inputs, seriesImages, canEdit }: JobInputsProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Images available to add (not already inputs)
  const inputImageIds = new Set(inputs.map((i) => i.image_id));
  const availableImages = seriesImages.filter((img) => !inputImageIds.has(img.id));

  // New input state
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [context, setContext] = useState('');

  // Get next available reference ID (1-4)
  const usedReferenceIds = new Set(inputs.map((i) => i.reference_id));
  const nextReferenceId = [1, 2, 3, 4].find((id) => !usedReferenceIds.has(id));

  async function handleAddInput() {
    if (!selectedImageId || !nextReferenceId) return;

    setSaving(true);
    setError(null);

    try {
      await createJobInput({
        job_id: jobId,
        image_id: selectedImageId,
        reference_id: nextReferenceId,
        context: context || null,
      });

      setSelectedImageId(null);
      setContext('');
      setIsAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add input');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveInput(inputId: string) {
    setSaving(true);
    setError(null);

    try {
      await deleteJobInput(inputId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove input');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8">
      <div className="border rounded-lg bg-muted/30">
        {/* Disclosure Header */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center justify-between w-full p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span className="text-lg font-semibold">Reference Images ({inputs.length}/4)</span>
          </div>
          {/* Preview thumbnails when collapsed */}
          {!isExpanded && inputs.length > 0 && (
            <div className="flex gap-1">
              {inputs.slice(0, 4).map((input) => (
                <div key={input.id} className="w-8 h-8 rounded overflow-hidden border">
                  <img
                    src={getCogImageUrl(input.image.storage_path)}
                    alt={input.image.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4">
            {canEdit && inputs.length < 4 && availableImages.length > 0 && !isAdding && (
              <div className="mb-4">
                <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
                  Add Reference
                </Button>
              </div>
            )}

            {error && (
              <div className="p-3 mb-4 bg-destructive/10 text-destructive text-sm rounded-lg">
                {error}
              </div>
            )}

            {/* Current Inputs */}
            {inputs.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {inputs.map((input) => (
                  <div key={input.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-primary">
                      <img
                        src={getCogImageUrl(input.image.storage_path)}
                        alt={input.image.filename}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 w-7 h-7 bg-primary text-primary-foreground text-sm font-bold rounded-full flex items-center justify-center">
                        [{input.reference_id}]
                      </span>
                    </div>
                    {input.context && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {input.context}
                      </p>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInput(input.id)}
                        disabled={saving}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg bg-muted/50 mb-4">
                <p className="text-muted-foreground">No reference images selected</p>
                {canEdit && availableImages.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Add images to use as style or subject references
                  </p>
                )}
              </div>
            )}

            {/* Add Input Form */}
            {isAdding && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm font-medium mb-3">
                  Select an image to add as reference [{nextReferenceId}]
                </p>

                {availableImages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No more images available. Upload more images to the series first.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-6 gap-2 mb-4">
                      {availableImages.map((image) => (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => setSelectedImageId(image.id)}
                          className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                            selectedImageId === image.id
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-transparent hover:border-muted-foreground/50'
                          }`}
                        >
                          <img
                            src={getCogImageUrl(image.storage_path)}
                            alt={image.filename}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>

                    {selectedImageId && (
                      <div className="space-y-3">
                        <Input
                          placeholder={`Context for [${nextReferenceId}] (e.g., "use as style reference")`}
                          value={context}
                          onChange={(e) => setContext(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleAddInput} disabled={saving}>
                            {saving ? 'Adding...' : 'Add Reference'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsAdding(false);
                              setSelectedImageId(null);
                              setContext('');
                            }}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!selectedImageId && availableImages.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAdding(false)}
                    className="mt-2"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}

            {/* Hint about usage */}
            {inputs.length > 0 && canEdit && (
              <p className="text-xs text-muted-foreground mt-2">
                Use [1], [2], etc. in step prompts to reference these images
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
