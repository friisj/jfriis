'use client';

import { useState } from 'react';
import { ArrowLeft, Edit, Trash2, Calendar, Package, Weight, DollarSign, Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collection, Item } from '@/lib/studio/loadout/types';
import { EditCollectionForm } from './edit-collection-form';
import { CollectionItemManager } from './collection-item-manager';

interface CollectionDetailProps {
  collection: Collection;
  items: Item[];
  onUpdateCollection: (updatedCollection: Collection) => void;
  onDeleteCollection: (collectionId: string) => void;
  onBack: () => void;
}

export function CollectionDetail({ 
  collection, 
  items, 
  onUpdateCollection, 
  onDeleteCollection, 
  onBack 
}: CollectionDetailProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleEditCollection = (updatedCollection: Collection) => {
    onUpdateCollection(updatedCollection);
    setIsEditOpen(false);
  };

  const handleDeleteCollection = () => {
    if (confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      onDeleteCollection(collection.id);
      onBack();
    }
  };

  const collectionItems = items.filter(item => 
    collection.itemIds.includes(item.id)
  );

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

  const getConditionColor = (condition: Item['condition']) => {
    switch (condition) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'good': return 'bg-green-100 text-green-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getTotalWeight = () => {
    return collectionItems.reduce((total, item) => total + (item.weight || 0), 0);
  };

  const getTotalValue = () => {
    return collectionItems.reduce((total, item) => total + (item.price || 0), 0);
  };

  const getStatusCounts = () => {
    const counts = {
      available: 0,
      'checked-out': 0,
      maintenance: 0,
      lost: 0,
      'pending-purchase': 0,
      discontinued: 0
    };
    
    collectionItems.forEach(item => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div 
                className="w-6 h-6 rounded-full" 
                style={{ backgroundColor: collection.color || '#6b7280' }}
              />
              <h1 className="text-2xl font-bold">{collection.name}</h1>
            </div>
            {collection.description && (
              <p className="text-muted-foreground mt-1">{collection.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDeleteCollection}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Statistics Cards */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-2xl font-bold mt-1">{collectionItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Total Weight</div>
            </div>
            <div className="text-2xl font-bold mt-1">{getTotalWeight()}g</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Total Value</div>
            </div>
            <div className="text-2xl font-bold mt-1">${getTotalValue().toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Created</div>
            </div>
            <div className="text-sm font-medium mt-1">
              {formatDate(collection.createdAt)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="text-center">
                <Badge className={getStatusColor(status as Item['status'])} variant="outline">
                  {count}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1 capitalize">
                  {status.replace('-', ' ')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Items in Collection</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CollectionItemManager
            collection={collection}
            allItems={items}
            onUpdateCollection={onUpdateCollection}
          />
          
          {collectionItems.length > 0 && (
            <div className="mt-6">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collectionItems.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{item.name}</CardTitle>
                          <div className="flex gap-1">
                            <Badge className={getStatusColor(item.status)} variant="outline">
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Category:</span>
                          <span>{item.category}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Condition:</span>
                          <Badge className={getConditionColor(item.condition)} variant="outline">
                            {item.condition}
                          </Badge>
                        </div>
                        {item.weight && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Weight:</span>
                            <span>{item.weight}g</span>
                          </div>
                        )}
                        {item.price && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Price:</span>
                            <span>${item.price}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {collectionItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{item.name}</span>
                          <Badge className={getStatusColor(item.status)} variant="outline">
                            {item.status}
                          </Badge>
                          <Badge className={getConditionColor(item.condition)} variant="outline">
                            {item.condition}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.category}
                          {item.weight && ` • ${item.weight}g`}
                          {item.price && ` • $${item.price}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {isEditOpen && (
        <Dialog open={true} onOpenChange={() => setIsEditOpen(false)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Collection</DialogTitle>
            </DialogHeader>
            <EditCollectionForm
              collection={collection}
              items={items}
              onSubmit={handleEditCollection}
              onCancel={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}