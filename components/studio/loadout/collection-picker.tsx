'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collection, Item } from '@/lib/studio/loadout/types';

interface CollectionPickerProps {
  item: Item;
  collections: Collection[];
  onUpdateCollections: (updatedCollections: Collection[]) => void;
  trigger?: React.ReactNode;
}

export function CollectionPicker({ item, collections, onUpdateCollections, trigger }: CollectionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Find collections that contain this item
  const itemCollections = collections.filter(collection => 
    collection.itemIds.includes(item.id)
  );

  const handleCollectionToggle = (collection: Collection, isChecked: boolean) => {
    let updatedCollection: Collection;
    
    if (isChecked) {
      // Add item to collection
      updatedCollection = {
        ...collection,
        itemIds: [...collection.itemIds, item.id],
        updatedAt: new Date(),
      };
    } else {
      // Remove item from collection
      updatedCollection = {
        ...collection,
        itemIds: collection.itemIds.filter(id => id !== item.id),
        updatedAt: new Date(),
      };
    }

    const updatedCollections = collections.map(c => 
      c.id === collection.id ? updatedCollection : c
    );
    
    onUpdateCollections(updatedCollections);
  };

  const removeFromCollection = (collection: Collection) => {
    handleCollectionToggle(collection, false);
  };

  return (
    <div className="space-y-2">
      {/* Show current collections as badges */}
      {itemCollections.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {itemCollections.map((collection) => (
            <Badge 
              key={collection.id} 
              variant="secondary" 
              className="text-xs flex items-center gap-1 pr-1"
              style={{ 
                backgroundColor: collection.color ? `${collection.color}20` : undefined,
                color: collection.color || undefined,
                borderColor: collection.color || undefined
              }}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: collection.color || '#6b7280' }}
              />
              {collection.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto w-auto p-0 ml-1 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromCollection(collection);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Collection picker dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="text-xs h-6">
              <Plus className="h-3 w-3 mr-1" />
              Collections
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Collections for {item.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {collections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No collections available. Create a collection first.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {collections.map((collection) => {
                  const isChecked = collection.itemIds.includes(item.id);
                  return (
                    <div key={collection.id} className="flex items-center space-x-2 p-2 rounded border">
                      <Checkbox
                        id={`collection-${collection.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => 
                          handleCollectionToggle(collection, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={`collection-${collection.id}`} 
                        className="flex-1 cursor-pointer flex items-center gap-2"
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: collection.color || '#6b7280' }}
                        />
                        <div>
                          <div className="font-medium">{collection.name}</div>
                          {collection.description && (
                            <div className="text-xs text-muted-foreground">
                              {collection.description}
                            </div>
                          )}
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                {itemCollections.length} collection{itemCollections.length !== 1 ? 's' : ''} selected
              </span>
              <Button onClick={() => setIsOpen(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}