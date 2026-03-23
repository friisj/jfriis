'use client';

import { IconX } from '@tabler/icons-react';

interface ChatOverlayProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function ChatOverlay({ title, onClose, children, actions }: ChatOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h3 className="text-xs font-medium">{title}</h3>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <IconX size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
      {actions && (
        <div className="border-t shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
