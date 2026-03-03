'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createSound, uploadAudio } from '@/lib/sampler';
import { SoundGenerator } from './sound-generator';
import { SoundSynthesizer } from './sound-synthesizer';
import type { SamplerSound } from '@/lib/types/sampler';

export function SoundForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !name.trim()) return;

    setUploading(true);
    try {
      const path = `uploads/${Date.now()}-${file.name}`;
      const audioUrl = await uploadAudio(file, path);

      await createSound({
        name: name.trim(),
        type: 'file',
        audio_url: audioUrl,
        source_config: { originalName: file.name, size: file.size },
        tags: ['uploaded'],
      });

      setOpen(false);
      setName('');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  function handleGenerated(_sound: SamplerSound) {
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Sound</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Sound</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="upload">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
            <TabsTrigger value="generate" className="flex-1">Generate</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <form onSubmit={handleUpload} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="sound-name">Name</Label>
                <Input
                  id="sound-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kick Drum"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sound-file">Audio File</Label>
                <Input
                  id="sound-file"
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={uploading || !name.trim()}>
                {uploading ? 'Uploading...' : 'Upload Sound'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="generate" className="pt-4">
            <Tabs defaultValue="elevenlabs">
              <TabsList className="w-full">
                <TabsTrigger value="elevenlabs" className="flex-1">ElevenLabs</TabsTrigger>
                <TabsTrigger value="synth" className="flex-1">Synth</TabsTrigger>
              </TabsList>
              <TabsContent value="elevenlabs" className="pt-4">
                <SoundGenerator onGenerated={handleGenerated} />
              </TabsContent>
              <TabsContent value="synth" className="pt-4">
                <SoundSynthesizer onGenerated={handleGenerated} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
