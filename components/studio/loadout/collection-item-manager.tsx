'use client';

import { useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collection, Item } from '@/lib/studio/loadout/types';

interface CollectionItemManagerProps {
  collection: Collection;
  allItems: Item[];
  onUpdateCollection: (updatedCollection: Collection) => void;
}

export function CollectionItemManager({ 
  collection, 
  allItems, 
  onUpdateCollection 
}: CollectionItemManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const collectionItems = allItems.filter(item => 
    collection.itemIds.includes(item.id)
  );

  const availableItems = allItems.filter(item => 
    !collection.itemIds.includes(item.id) &&
    (searchTerm === '' || 
     item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const removeItem = (itemId: string) => {
    const updatedCollection = {
      ...collection,
      itemIds: collection.itemIds.filter(id => id !== itemId),
      updatedAt: new Date(),
    };
    onUpdateCollection(updatedCollection);
  };

  const addItem = (itemId: string) => {
    const updatedCollection = {
      ...collection,
      itemIds: [...collection.itemIds, itemId],
      updatedAt: new Date(),
    };
    onUpdateCollection(updatedCollection);
  };

  const getStatusColor = (status: Item['status']) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'checked-out': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'pending-purchase': return 'bg-blue-100 text-blue-800';
      case 'discontinued': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      {/* Current items in collection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Items in Collection ({collectionItems.length})</h4>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Items
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Items to {collection.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search available items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {availableItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchTerm ? 'No items match your search.' : 'All items are already in this collection.'}
                    </p>
                  ) : (
                    availableItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.category}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(item.status)} variant="outline">
                            {item.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(item.id)}
                            className="h-7 text-xs"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex justify-end pt-2 border-t">
                  <Button onClick={() => setIsOpen(false)}>Done</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {collectionItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
            No items in this collection yet.
          </p>
        ) : (
          <div className="space-y-1">
            {collectionItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <Badge className={getStatusColor(item.status)} variant="outline">
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.category}
                    {item.weight && ` • ${item.weight}g`}
                    {item.price && ` • $${item.price}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}