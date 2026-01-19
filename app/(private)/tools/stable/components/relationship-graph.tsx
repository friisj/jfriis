/**
 * Relationship Graph Component
 * Placeholder for visualizing character relationships
 */

import type { CharacterRelationship } from '@/lib/types/stable';

interface RelationshipGraphProps {
  relationships: CharacterRelationship[];
  characterId: string;
}

export function RelationshipGraph({
  relationships,
  characterId,
}: RelationshipGraphProps) {
  if (relationships.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/50">
        <p className="text-muted-foreground">
          No relationships to visualize
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-8 bg-muted/50">
      <div className="text-center">
        <p className="text-lg font-medium mb-2">Relationship Graph</p>
        <p className="text-sm text-muted-foreground mb-6">
          Visual relationship network (placeholder for graph visualization)
        </p>
        <div className="space-y-2">
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="inline-block px-4 py-2 border rounded bg-background mx-2"
            >
              <span className="font-medium">{rel.relationship_type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
