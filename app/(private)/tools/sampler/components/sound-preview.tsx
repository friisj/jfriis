'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconPlayerPlay, IconSquare } from '@tabler/icons-react';

interface SoundPreviewProps {
  audioUrl: string | null;
}

export function SoundPreview({ audioUrl }: SoundPreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  if (!audioUrl) {
    return <span className="text-xs text-muted-foreground">No audio</span>;
  }

  function toggle() {
    if (!audioRef.current) {
      const audio = new Audio(audioUrl!);
      audio.addEventListener('ended', () => setPlaying(false));
      audioRef.current = audio;
    }

    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={toggle}
      aria-label={playing ? 'Stop' : 'IconPlayerPlay'}
    >
      {playing ? <IconSquare size={16}  /> : <IconPlayerPlay size={16}  />}
    </Button>
  );
}
