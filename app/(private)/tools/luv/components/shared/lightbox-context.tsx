'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { ImageLightbox } from './image-lightbox';

export interface LightboxImage {
  url: string;
  alt?: string;
  /** Cog image ID (enables star, tag, move, copy actions) */
  cogImageId?: string;
  /** Conversation image index (1-based, for [N] references) */
  index?: number;
}

interface LightboxContextValue {
  /** Open the lightbox at a specific image URL */
  open: (url: string) => void;
  /** Insert an image reference [N] into chat input */
  onAttach?: (index: number) => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox(): LightboxContextValue {
  const ctx = useContext(LightboxContext);
  if (!ctx) {
    return { open: () => {} };
  }
  return ctx;
}

export function LightboxProvider({ images, onAttach, children }: { images: LightboxImage[]; onAttach?: (index: number) => void; children: ReactNode }) {
  const [currentIndex, setCurrentIndex] = useState(-1);

  const open = useCallback((url: string) => {
    const idx = images.findIndex((img) => img.url === url);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, [images]);

  const close = useCallback(() => setCurrentIndex(-1), []);

  return (
    <LightboxContext.Provider value={{ open, onAttach }}>
      {children}
      {currentIndex >= 0 && images.length > 0 && (
        <ImageLightbox
          images={images}
          currentIndex={currentIndex}
          onClose={close}
          onNavigate={setCurrentIndex}
          onAttach={onAttach}
        />
      )}
    </LightboxContext.Provider>
  );
}
