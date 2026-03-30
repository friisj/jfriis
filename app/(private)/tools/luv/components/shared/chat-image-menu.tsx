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
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
    }
  }, [src]);

  const handleDownload = useCallback(() => {
    const a = document.createElement('a');
    a.href = src;
    a.download = cogImageId ? `image-${cogImageId}` : 'image';
    a.click();
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
