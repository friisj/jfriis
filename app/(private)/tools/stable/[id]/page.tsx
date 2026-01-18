import { getCharacterWithRelationsServer } from '@/lib/stable';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';

export default async function CharacterDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let characterData;
  try {
    characterData = await getCharacterWithRelationsServer(params.id);
  } catch (error) {
    notFound();
  }

  const { character, relationships, assets } = characterData;

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Link
              href="/tools/stable"
              className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
            >
              ← Back to Characters
            </Link>
            <h1 className="text-3xl font-bold mb-2">{character.name}</h1>
            {character.description && (
              <p className="text-muted-foreground text-lg">
                {character.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/tools/stable/${character.id}/edit`}>Edit</Link>
            </Button>
          </div>
        </div>

        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Created {new Date(character.created_at).toLocaleDateString()}</span>
          {character.updated_at !== character.created_at && (
            <span>
              Updated {new Date(character.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-8">
        {/* Parametric Data Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Parametric Data</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/tools/stable/${character.id}/edit#parametric`}>
                Edit Parameters
              </Link>
            </Button>
          </div>
          {Object.keys(character.parametric_data).length === 0 ? (
            <div className="border rounded-lg p-8 text-center bg-muted/50">
              <p className="text-muted-foreground mb-4">
                No parametric data defined yet.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/tools/stable/${character.id}/edit#parametric`}>
                  Add Parameters
                </Link>
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg p-6 bg-muted/50">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(character.parametric_data, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* Relationships Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Relationships</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/tools/stable/${character.id}/relationships/new`}>
                Add Relationship
              </Link>
            </Button>
          </div>
          {relationships.length === 0 ? (
            <div className="border rounded-lg p-8 text-center bg-muted/50">
              <p className="text-muted-foreground mb-4">
                No relationships defined yet.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/tools/stable/${character.id}/relationships/new`}>
                  Add Relationship
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {relationships.map((rel) => (
                <div
                  key={rel.id}
                  className="border rounded-lg p-4 bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium mb-1">
                        {rel.relationship_type}
                      </div>
                      {rel.notes && (
                        <p className="text-sm text-muted-foreground">
                          {rel.notes}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Assets Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Assets</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/tools/stable/${character.id}/assets/new`}>
                Add Asset
              </Link>
            </Button>
          </div>
          {assets.length === 0 ? (
            <div className="border rounded-lg p-8 text-center bg-muted/50">
              <p className="text-muted-foreground mb-4">
                No assets uploaded yet.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/tools/stable/${character.id}/assets/new`}>
                  Add Asset
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {/* Group assets by type */}
              {Array.from(new Set(assets.map((a) => a.asset_type))).map(
                (assetType) => {
                  const typeAssets = assets.filter(
                    (a) => a.asset_type === assetType
                  );
                  return (
                    <div key={assetType} className="border rounded-lg p-6">
                      <h3 className="font-semibold mb-4 capitalize">
                        {assetType.replace(/_/g, ' ')} ({typeAssets.length})
                      </h3>
                      <div className="space-y-3">
                        {typeAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="border rounded p-4 bg-muted/50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium mb-1">
                                  {asset.name || 'Untitled Asset'}
                                </div>
                                {asset.file_url && (
                                  <a
                                    href={asset.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    View File
                                  </a>
                                )}
                                {asset.tags.length > 0 && (
                                  <div className="flex gap-2 mt-2">
                                    {asset.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="text-xs px-2 py-1 bg-muted rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
