import { getSoundsServer } from '@/lib/sampler-server';
import { Badge } from '@/components/ui/badge';
import { SoundForm } from '../components/sound-form';

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
        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Duration</th>
                <th className="p-3 font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {sounds.map((sound) => (
                <tr key={sound.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-3 font-medium">{sound.name}</td>
                  <td className="p-3">
                    <Badge variant="secondary">{sound.type}</Badge>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {sound.duration_ms
                      ? `${(sound.duration_ms / 1000).toFixed(1)}s`
                      : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {sound.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
