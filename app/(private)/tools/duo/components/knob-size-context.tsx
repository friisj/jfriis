'use client';

import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

const SYNTH_SECTION_COUNT = 6;
// Per-section overhead: knob label (~18px) + value text (~18px) + section padding (16px) + gaps (8px)
const SECTION_OVERHEAD = 60;
const MIN_KNOB_SIZE = 36;
const MAX_KNOB_SIZE = 120;

const KnobSizeContext = createContext<number>(88);

export function useKnobSize() {
  return useContext(KnobSizeContext);
}

/**
 * Measures a ref element's height, derives knob size from it
 * (assuming SYNTH_SECTION_COUNT sections), and provides that size
 * to all children via context.
 */
export function KnobSizeProvider({
  children,
  measureRef,
}: {
  children: React.ReactNode;
  measureRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [knobSize, setKnobSize] = useState(88);

  const measure = useCallback(() => {
    if (!measureRef.current) return;
    const height = measureRef.current.clientHeight;
    const sectionHeight = height / SYNTH_SECTION_COUNT;
    const size = Math.round(
      Math.min(MAX_KNOB_SIZE, Math.max(MIN_KNOB_SIZE, sectionHeight - SECTION_OVERHEAD))
    );
    setKnobSize(size);
  }, [measureRef]);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [measureRef, measure]);

  return (
    <KnobSizeContext.Provider value={knobSize}>
      {children}
    </KnobSizeContext.Provider>
  );
}
