import { getCharactersServer } from '@/lib/stable';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function StablePage() {
  const characters = await getCharactersServer();

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Characters</h1>
          <p className="text-muted-foreground mt-2">
            Character design repository and asset management
          </p>
        </div>
        <Button asChild>
          <Link href="/tools/stable/new">New Character</Link>
        </Button>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">
            No characters yet. Create your first character to get started.
          </p>
          <Button asChild variant="outline">
            <Link href="/tools/stable/new">Create Character</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {characters.map((character) => (
            <Link
              key={character.id}
              href={`/tools/stable/${character.id}`}
              className="block border rounded-lg p-6 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">
                    {character.name}
                  </h2>
                  {character.description && (
                    <p className="text-muted-foreground mb-4">
                      {character.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>
                      Created{' '}
                      {new Date(character.created_at).toLocaleDateString()}
                    </span>
                    {character.updated_at !== character.created_at && (
                      <span>
                        Updated{' '}
                        {new Date(character.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  View Details →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
