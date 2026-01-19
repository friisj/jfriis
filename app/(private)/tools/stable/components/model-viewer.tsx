/**
 * 3D Model Viewer Component
 * Placeholder for viewing 3D character models
 */

import type { Asset } from '@/lib/types/stable';

interface ModelViewerProps {
  asset: Asset;
}

export function ModelViewer({ asset }: ModelViewerProps) {
  if (!asset.file_url) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/50">
        <p className="text-muted-foreground">No 3D model available</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Placeholder for 3D viewer (could integrate Three.js, etc.) */}
      <div className="aspect-video bg-muted flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg font-medium mb-2">3D Model Viewer</p>
          <p className="text-sm text-muted-foreground mb-4">
            {asset.name || 'Untitled Model'}
          </p>
          <a
            href={asset.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Download Model
          </a>
        </div>
      </div>
    </div>
  );
}
