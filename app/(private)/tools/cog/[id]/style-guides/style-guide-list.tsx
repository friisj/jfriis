'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteStyleGuide } from '@/lib/cog';
import { StyleGuideFormDialog } from './style-guide-form-dialog';
import { DeleteStyleGuideDialog } from './delete-style-guide-dialog';
import type { CogStyleGuide } from '@/lib/types/cog';

interface StyleGuideListProps {
  styleGuides: CogStyleGuide[];
  seriesId: string;
  userId: string;
}

export function StyleGuideList({ styleGuides: initialStyleGuides, seriesId, userId }: StyleGuideListProps) {
  const router = useRouter();
  const [styleGuides, setStyleGuides] = useState(initialStyleGuides);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<CogStyleGuide | null>(null);
  const [deletingGuide, setDeletingGuide] = useState<CogStyleGuide | null>(null);

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    router.refresh();
  };

  const handleEditSuccess = () => {
    setEditingGuide(null);
    router.refresh();
  };

  const handleDeleteSuccess = (id: string) => {
    setStyleGuides(styleGuides.filter((g) => g.id !== id));
    setDeletingGuide(null);
    router.refresh();
  };

  if (styleGuides.length === 0 && !isCreateOpen) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/50">
        <p className="text-muted-foreground mb-4">No style guides yet</p>
        <Button onClick={() => setIsCreateOpen(true)}>Create Style Guide</Button>
        <StyleGuideFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={handleCreateSuccess}
          seriesId={seriesId}
          userId={userId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>New Style Guide</Button>
      </div>

      <div className="space-y-3">
        {styleGuides.map((guide) => (
          <div
            key={guide.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium mb-1">{guide.name}</h3>
                {guide.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {guide.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground font-mono line-clamp-2">
                  {guide.system_prompt}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingGuide(guide)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingGuide(guide)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <StyleGuideFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
        seriesId={seriesId}
        userId={userId}
      />

      {editingGuide && (
        <StyleGuideFormDialog
          isOpen={true}
          onClose={() => setEditingGuide(null)}
          onSuccess={handleEditSuccess}
          seriesId={seriesId}
          userId={userId}
          initialData={editingGuide}
        />
      )}

      {deletingGuide && (
        <DeleteStyleGuideDialog
          styleGuide={deletingGuide}
          isOpen={true}
          onClose={() => setDeletingGuide(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
