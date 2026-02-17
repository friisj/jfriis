'use client';

import { useState } from 'react';
import { Plus, Package, Edit, Trash2, Eye, Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collection, Item } from '@/lib/studio/loadout/types';
import { AddCollectionForm } from './add-collection-form';
import { EditCollectionForm } from './edit-collection-form';
import { CollectionItemManager } from './collection-item-manager';

interface CollectionListProps {
  collections: Collection[];
  setCollections: (collections: Collection[]) => void;
  items: Item[];
  onViewCollection?: (collection: Collection) => void;
}

export function CollectionList({ collections, setCollections, items, onViewCollection }: CollectionListProps) {
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleAddCollection = (newCollection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>) => {
    const collection: Collection = {
      ...newCollection,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCollections([...collections, collection]);
    setIsAddCollectionOpen(false);
  };

  const handleEditCollection = (updatedCollection: Collection) => {
    setCollections(collections.map(collection => 
      collection.id === updatedCollection.id ? updatedCollection : collection
    ));
    setEditingCollection(null);
  };

  const handleUpdateCollection = (updatedCollection: Collection) => {
    setCollections(collections.map(collection => 
      collection.id === updatedCollection.id ? updatedCollection : collection
    ));
  };

  const handleDeleteCollection = (collectionId: string) => {
    if (confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      setCollections(collections.filter(collection => collection.id !== collectionId));
    }
  };

  const getCollectionItems = (collection: Collection) => {
    return items.filter(item => collection.itemIds.includes(item.id));
  };

  const getTotalWeight = (collectionItems: Item[]) => {
    return collectionItems.reduce((total, item) => total + (item.weight || 0), 0);
  };

  const getTotalValue = (collectionItems: Item[]) => {
    return collectionItems.reduce((total, item) => total + (item.price || 0), 0);
  };

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Collections</h2>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={isAddCollectionOpen} onOpenChange={setIsAddCollectionOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Collection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Collection</DialogTitle>
              </DialogHeader>
              <AddCollectionForm onSubmit={handleAddCollection} items={items} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Collections display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => {
            const collectionItems = getCollectionItems(collection);
            const totalWeight = getTotalWeight(collectionItems);
            const totalValue = getTotalValue(collectionItems);
            
            return (
              <Card key={collection.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: collection.color || '#6b7280' }}
                      />
                      {collection.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {collectionItems.length} items
                      </Badge>
                      <div className="flex gap-1">
                        {onViewCollection && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewCollection(collection)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCollection(collection)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCollection(collection.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {collection.description && (
                    <p className="text-sm text-muted-foreground">{collection.description}</p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Weight:</span>
                      <span>{totalWeight}g</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span>${totalValue.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Enhanced item management */}
                  <CollectionItemManager
                    collection={collection}
                    allItems={items}
                    onUpdateCollection={handleUpdateCollection}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {collections.map((collection) => {
            const collectionItems = getCollectionItems(collection);
            const totalWeight = getTotalWeight(collectionItems);
            const totalValue = getTotalValue(collectionItems);
            
            return (
              <div key={collection.id} className="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
                <div className="flex items-center gap-4 flex-1">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: collection.color || '#6b7280' }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-lg">{collection.name}</span>
                      <Badge variant="outline">
                        {collectionItems.length} items
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{totalWeight}g</span>
                      <span> • ${totalValue.toFixed(2)}</span>
                      {collection.description && <span> • {collection.description}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onViewCollection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewCollection(collection)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCollection(collection)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCollection(collection.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {collections.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No collections created yet.</p>
          <p className="text-sm">Create your first collection to organize your gear.</p>
        </div>
      )}

      {/* Edit Collection Dialog */}
      {editingCollection && (
        <Dialog open={true} onOpenChange={() => setEditingCollection(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Collection</DialogTitle>
            </DialogHeader>
            <EditCollectionForm
              collection={editingCollection}
              items={items}
              onSubmit={handleEditCollection}
              onCancel={() => setEditingCollection(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}