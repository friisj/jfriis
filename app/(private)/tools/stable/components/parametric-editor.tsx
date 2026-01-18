/**
 * Parametric Data Editor Component
 * Placeholder for editing character parametric data
 */

'use client';

import { useState } from 'react';
import type { CharacterParametricData } from '@/lib/types/stable';
import { Button } from '@/components/ui/button';

interface ParametricEditorProps {
  data: CharacterParametricData;
  onSave?: (data: CharacterParametricData) => void;
}

export function ParametricEditor({ data, onSave }: ParametricEditorProps) {
  const [editedData, setEditedData] = useState(JSON.stringify(data, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editedData);
      setError(null);
      onSave?.(parsed);
    } catch (e) {
      setError('Invalid JSON format');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground mb-4">
          Edit the parametric data as JSON. This is a temporary editor - a
          structured form interface will be built later.
        </p>
        <textarea
          value={editedData}
          onChange={(e) => setEditedData(e.target.value)}
          className="w-full h-64 p-3 font-mono text-sm border rounded bg-background"
          placeholder="Enter JSON data..."
        />
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>
      {onSave && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditedData(JSON.stringify(data, null, 2))}>
            Reset
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      )}
    </div>
  );
}
