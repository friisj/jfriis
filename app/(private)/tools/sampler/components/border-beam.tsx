'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface BorderBeamProps {
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  loop?: boolean;
}

export function BorderBeam({
  duration = 2,
  borderWidth = 2,
  colorFrom = '#3b82f6',
  colorTo = '#8b5cf6',
  loop = true,
}: BorderBeamProps) {
  const progress = useMotionValue(0);

  useEffect(() => {
    const controls = animate(progress, 1, {
      duration,
      ease: 'linear',
      repeat: loop ? Infinity : 0,
      repeatType: 'loop',
    });
    return () => controls.stop();
  }, [duration, loop, progress]);

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
