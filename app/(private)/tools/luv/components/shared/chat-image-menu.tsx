'use client';

import { useCallback } from 'react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';
import { IconCopy, IconDownload, IconId } from '@tabler/icons-react';

interface ChatImageMenuProps {
  src: string;
  /** Cog image ID if known */
  cogImageId?: string;
  children: React.ReactNode;
}

/**
 * Context menu wrapper for images in chat messages.
 * Provides copy, download, and ID copy. Nests inside the parent
 * message ContextMenu — Radix handles this correctly, preventing
 * the parent menu from opening.
 */
export function ChatImageMenu({ src, cogImageId, children }: ChatImageMenuProps) {
  const handleCopyToClipboard = useCallback(async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      // Convert to PNG for universal paste compatibility
      let pngBlob = blob;
      if (blob.type !== 'image/png') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        URL.revokeObjectURL(img.src);
        pngBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), 'image/png')
        );
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
    }
  }, [src]);

  const handleDownload = useCallback(async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
      const filename = cogImageId ? `image-${cogImageId}.${ext}` : `image.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [src, cogImageId]);

  const handleCopyId = useCallback(() => {
    if (cogImageId) navigator.clipboard.writeText(cogImageId);
  }, [cogImageId]);

  return (
    <ContextMenu>
      <ContextMenuTrigger className="relative inline-block">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem className="text-xs" onClick={handleCopyToClipboard}>
          <IconCopy size={14} stroke={1.5} />
          Copy to clipboard
        </ContextMenuItem>
        <ContextMenuItem className="text-xs" onClick={handleDownload}>
          <IconDownload size={14} stroke={1.5} />
          Download
        </ContextMenuItem>
        {cogImageId && (
          <ContextMenuItem className="text-xs" onClick={handleCopyId}>
            <IconId size={14} stroke={1.5} />
            Copy image ID
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
