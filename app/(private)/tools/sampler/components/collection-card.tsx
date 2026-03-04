'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Layers, Trash2 } from 'lucide-react';
import { deleteCollection } from '@/lib/sampler';
import type { SamplerCollection } from '@/lib/types/sampler';

interface CollectionCardProps {
  collection: SamplerCollection;
  onBatchGenerate: (collection: SamplerCollection) => void;
}

export function CollectionCard({ collection, onBatchGenerate }: CollectionCardProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    try {
      await deleteCollection(collection.id);
      router.refresh();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link
            href={`/tools/sampler/${collection.slug}`}
            className="block border rounded-lg p-6 hover:bg-muted/50 transition-colors group relative"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              title="Delete collection"
            >
              <Trash2 className="size-3.5" />
            </Button>
            <div
              className="w-8 h-8 rounded mb-3"
              style={{ backgroundColor: collection.color || '#6366f1' }}
            />
            <h2 className="text-lg font-semibold group-hover:underline">
              {collection.name}
            </h2>
            {collection.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {collection.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              {collection.grid_rows}&times;{collection.grid_cols} grid
            </p>
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onBatchGenerate(collection)}>
            <Layers className="size-4 mr-2" />
            Batch Generate
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{collection.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the collection and all its pads. Sounds in the library will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
