'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { ImageLightbox } from './image-lightbox';

interface LightboxImage {
  url: string;
  alt?: string;
}

interface LightboxContextValue {
  /** Open the lightbox at a specific image URL */
  open: (url: string) => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox(): LightboxContextValue {
  const ctx = useContext(LightboxContext);
  if (!ctx) {
    return { open: () => {} };
  }
  return ctx;
}

export function LightboxProvider({ images, children }: { images: LightboxImage[]; children: ReactNode }) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const open = useCallback((url: string) => {
    const idx = imagesRef.current.findIndex((img) => img.url === url);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, []);

  const close = useCallback(() => setCurrentIndex(-1), []);

  return (
    <LightboxContext.Provider value={{ open }}>
      {children}
      {currentIndex >= 0 && images.length > 0 && (
        <ImageLightbox
          images={images}
          currentIndex={currentIndex}
          onClose={close}
          onNavigate={setCurrentIndex}
        />
      )}
    </LightboxContext.Provider>
  );
}
