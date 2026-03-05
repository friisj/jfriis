'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface BorderBeamProps {
  getProgress: () => number | null;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  getProgress,
  borderWidth = 2,
  colorFrom = '#3b82f6',
  colorTo = '#8b5cf6',
}: BorderBeamProps) {
  const progress = useMotionValue(0);

  useEffect(() => {
    let rafId: number;
    function tick() {
      const p = getProgress();
      if (p != null) progress.set(p);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [getProgress, progress]);

  const background = useTransform(progress, (v) => {
    const endAngle = v * 360;
    return `conic-gradient(from -90deg, ${colorFrom} 0deg, ${colorTo} ${endAngle}deg, transparent ${endAngle}deg)`;
  });

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{
        background,
        WebkitMaskImage: 'linear-gradient(#fff 0 0), linear-gradient(#fff 0 0)',
        WebkitMaskClip: 'content-box, border-box',
        WebkitMaskComposite: 'xor',
        maskImage: 'linear-gradient(#fff 0 0), linear-gradient(#fff 0 0)',
        maskClip: 'content-box, border-box',
        maskComposite: 'exclude',
        padding: `${borderWidth}px`,
      }}
    />
  );
}
