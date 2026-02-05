'use client';

import { useState, useEffect } from 'react';
import { getCogImageUrl, getImageVersionChain } from '@/lib/cog';
import type { CogImage } from '@/lib/types/cog';

interface VersionHistoryPanelProps {
  imageId: string;
  isExpanded: boolean;
  onClose: () => void;
  onSelectVersion: (image: CogImage) => void;
}

export function VersionHistoryPanel({
  imageId,
  isExpanded,
  onClose,
  onSelectVersion,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<CogImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load version chain when panel expands
  useEffect(() => {
    if (!isExpanded || !imageId) return;

    async function loadVersions() {
      setLoading(true);
      setError(null);
      try {
        const chain = await getImageVersionChain(imageId);
        setVersions(chain);
      } catch (err) {
        console.error('Failed to load version chain:', err);
        setError('Failed to load versions');
      } finally {
        setLoading(false);
      }
    }

    loadVersions();
  }, [imageId, isExpanded]);

  if (!isExpanded) return null;

  // Find current image index in chain
  const currentIndex = versions.findIndex((v) => v.id === imageId);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-black/90 border-t border-white/20 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-medium">
          Version History
          {versions.length > 0 && (
            <span className="ml-2 text-white/50">
              ({currentIndex + 1} of {versions.length})
            </span>
          )}
        </h3>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-sm"
          aria-label="Close version panel"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="text-white/50 text-sm py-4 text-center">Loading versions...</div>
      )}

      {error && (
        <div className="text-red-400 text-sm py-2">{error}</div>
      )}

      {!loading && !error && versions.length === 0 && (
        <div className="text-white/50 text-sm py-4 text-center">No version history</div>
      )}

      {!loading && !error && versions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {versions.map((version, index) => {
            const isCurrent = version.id === imageId;
            const isRoot = index === 0;

            return (
              <button
                key={version.id}
                onClick={() => onSelectVersion(version)}
                className={`relative flex-shrink-0 group ${
                  isCurrent
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-black'
                    : 'hover:ring-2 hover:ring-white/40 hover:ring-offset-2 hover:ring-offset-black'
                }`}
              >
                <img
                  src={getCogImageUrl(version.storage_path)}
                  alt={`Version ${index + 1}`}
                  className="w-16 h-16 object-cover rounded"
                />

                {/* Version number badge */}
                <div
                  className={`absolute bottom-1 left-1 px-1 py-0.5 rounded text-[10px] ${
                    isCurrent ? 'bg-primary text-primary-foreground' : 'bg-black/70 text-white'
                  }`}
                >
                  v{index + 1}
                </div>

                {/* Root indicator */}
                {isRoot && (
                  <div className="absolute top-1 right-1 px-1 py-0.5 bg-blue-600/80 rounded text-[10px] text-white">
                    Root
                  </div>
                )}

                {/* Hover tooltip with prompt */}
                {version.prompt && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-black border border-white/20 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <p className="line-clamp-3">{version.prompt}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Keyboard hint */}
      <div className="mt-2 text-xs text-white/40">
        <kbd className="px-1 py-0.5 bg-white/10 rounded">v</kbd> toggle panel
      </div>
    </div>
  );
}
