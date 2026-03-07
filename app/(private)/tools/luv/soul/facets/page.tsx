import { getLuvCharacterServer } from '@/lib/luv-server';
import { LAYER_REGISTRY } from '@/lib/luv/soul-layers';
import { Badge } from '@/components/ui/badge';
import type { SoulFacet } from '@/lib/types/luv';

export default async function LuvFacetsPage() {
  const character = await getLuvCharacterServer();
  const facets: SoulFacet[] = character?.soul_data?.facets ?? [];

  if (facets.length === 0) {
    return (
      <div className="px-6 py-6 overflow-y-auto h-full">
        <h1 className="text-5xl font-bold mb-6">Facets</h1>
        <p className="text-sm text-muted-foreground">
          No facets yet. Ask Luv in chat to propose psychological dimensions like values, emotional patterns, or relational dynamics.
        </p>
      </div>
    );
  }

  // Group by layer
  const byLayer = new Map<string, SoulFacet[]>();
  for (const facet of facets) {
    if (!byLayer.has(facet.layer)) byLayer.set(facet.layer, []);
    byLayer.get(facet.layer)!.push(facet);
  }

  // Sort layers by registry priority
  const sortedLayers = [...byLayer.entries()].sort((a, b) => {
    const pa = (LAYER_REGISTRY as Record<string, { priority: number }>)[a[0]]?.priority ?? 99;
    const pb = (LAYER_REGISTRY as Record<string, { priority: number }>)[b[0]]?.priority ?? 99;
    return pa - pb;
  });

  return (
    <div className="px-6 py-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-5xl font-bold">Facets</h1>
        <Badge variant="outline">{facets.length}</Badge>
      </div>

      <div className="space-y-6">
        {sortedLayers.map(([layer, layerFacets]) => {
          const registryEntry = (LAYER_REGISTRY as Record<string, { label: string }>)[layer];
          const layerLabel = registryEntry?.label ?? layer;

          return (
            <div key={layer}>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {layerLabel} Layer
              </h2>
              <div className="space-y-3">
                {layerFacets.map((facet) => (
                  <FacetCard key={facet.key} facet={facet} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FacetCard({ facet }: { facet: SoulFacet }) {
  return (
    <div className="rounded border p-3 text-sm space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="font-medium">{facet.label}</span>
        <Badge variant="secondary" className="text-[10px]">{facet.type}</Badge>
      </div>
      {facet.description && (
        <p className="text-xs text-muted-foreground">{facet.description}</p>
      )}
      <div className="mt-1">
        <FacetContent facet={facet} />
      </div>
    </div>
  );
}

function FacetContent({ facet }: { facet: SoulFacet }) {
  if (facet.type === 'text' && typeof facet.content === 'string') {
    return <p className="text-xs whitespace-pre-wrap">{facet.content}</p>;
  }

  if (facet.type === 'tags' && Array.isArray(facet.content)) {
    return (
      <div className="flex flex-wrap gap-1">
        {facet.content.map((tag: string) => (
          <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
        ))}
      </div>
    );
  }

  if (facet.type === 'key_value' && facet.content && typeof facet.content === 'object' && !Array.isArray(facet.content)) {
    return (
      <div className="space-y-1">
        {Object.entries(facet.content as Record<string, string>).map(([k, v]) => (
          <div key={k} className="text-xs">
            <span className="text-muted-foreground">{k}:</span> {v}
          </div>
        ))}
      </div>
    );
  }

  return <pre className="text-[10px] bg-muted rounded px-1.5 py-1">{JSON.stringify(facet.content, null, 2)}</pre>;
}
