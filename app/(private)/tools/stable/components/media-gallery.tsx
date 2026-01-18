/**
 * Media Gallery Component
 * Placeholder for displaying character asset images and media
 */

import type { Asset } from '@/lib/types/stable';

interface MediaGalleryProps {
  assets: Asset[];
}

export function MediaGallery({ assets }: MediaGalleryProps) {
  const mediaAssets = assets.filter(
    (asset) =>
      asset.file_url &&
      (asset.asset_type === 'reference_media' ||
        asset.asset_type === 'generative_output' ||
        asset.asset_type === 'concept_art' ||
        asset.asset_type === 'turnaround' ||
        asset.asset_type === 'expression_sheet')
  );

  if (mediaAssets.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/50">
        <p className="text-muted-foreground">No media assets to display</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {mediaAssets.map((asset) => (
        <div key={asset.id} className="border rounded-lg overflow-hidden">
          {/* Placeholder for image/media display */}
          <div className="aspect-square bg-muted flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-sm font-medium mb-1">
                {asset.name || 'Untitled'}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {asset.asset_type.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          {asset.file_url && (
            <div className="p-2">
              <a
                href={asset.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View Full Size
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
