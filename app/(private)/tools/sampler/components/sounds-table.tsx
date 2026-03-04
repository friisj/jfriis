'use client';

import { useState } from 'react';
import type { SamplerSound } from '@/lib/types/sampler';
import { SoundRow } from './sound-row';

interface SoundsTableProps {
  initialSounds: SamplerSound[];
}

export function SoundsTable({ initialSounds }: SoundsTableProps) {
  const [sounds, setSounds] = useState(initialSounds);

  function handleDeleted(id: string) {
    setSounds((prev) => prev.filter((s) => s.id !== id));
  }

  function handleRenamed(id: string, name: string) {
    setSounds((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
  }

  if (sounds.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/50">
        <p className="text-muted-foreground">No sounds remaining.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="p-3 font-medium w-10"></th>
            <th className="p-3 font-medium">Name</th>
            <th className="p-3 font-medium">Type</th>
            <th className="p-3 font-medium">Duration</th>
            <th className="p-3 font-medium">Tags</th>
            <th className="p-3 font-medium w-20"></th>
          </tr>
        </thead>
        <tbody>
          {sounds.map((sound) => (
            <SoundRow
              key={sound.id}
              sound={sound}
              onDeleted={handleDeleted}
              onRenamed={handleRenamed}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
