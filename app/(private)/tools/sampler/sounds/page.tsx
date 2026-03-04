import { getSoundsServer } from '@/lib/sampler-server';
import { SoundForm } from '../components/sound-form';
import { SoundsTable } from '../components/sounds-table';

export default async function SoundsPage() {
  const sounds = await getSoundsServer();

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Sound Library</h1>
          <p className="text-muted-foreground mt-2">
            Global sound library — reusable across collections
          </p>
        </div>
        <SoundForm />
      </div>

      {sounds.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">
            No sounds yet. Upload or generate your first sound.
          </p>
          <SoundForm />
        </div>
      ) : (
        <SoundsTable initialSounds={sounds} />
      )}
    </div>
  );
}
