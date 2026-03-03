'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SoundGenerator } from './sound-generator';
import { SoundSynthesizer } from './sound-synthesizer';
import type { SamplerSound } from '@/lib/types/sampler';

interface SoundGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (sound: SamplerSound) => void;
}

export function SoundGenerateModal({ open, onOpenChange, onGenerated }: SoundGenerateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Sound</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="elevenlabs">
          <TabsList className="w-full">
            <TabsTrigger value="elevenlabs" className="flex-1">ElevenLabs</TabsTrigger>
            <TabsTrigger value="synth" className="flex-1">Synth</TabsTrigger>
          </TabsList>
          <TabsContent value="elevenlabs" className="pt-4">
            <SoundGenerator onGenerated={onGenerated} />
          </TabsContent>
          <TabsContent value="synth" className="pt-4">
            <SoundSynthesizer onGenerated={onGenerated} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
