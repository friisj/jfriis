'use client';

import { useState } from 'react';
import { ArrowLeft, Edit, Trash2, Calendar, Tag, DollarSign, Weight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Item, Collection, PurchaseRequest } from '@/lib/studio/loadout/types';
import { EditItemForm } from './edit-item-form';
import { CollectionPicker } from './collection-picker';

interface ItemDetailProps {
  item: Item;
  collections: Collection[];
  purchaseRequests?: PurchaseRequest[];
  onUpdateItem: (updatedItem: Item) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateCollections: (updatedCollections: Collection[]) => void;
  onBack: () => void;
}

export function ItemDetail({ 
  item, 
  collections, 
  purchaseRequests = [],
  onUpdateItem, 
  onDeleteItem, 
  onUpdateCollections,
  onBack 
}: ItemDetailProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleEditItem = (updatedItem: Item) => {
    onUpdateItem(updatedItem);
    setIsEditOpen(false);
  };

  const handleDeleteItem = () => {
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      onDeleteItem(item.id);
      onBack();
    }
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

  const itemCollections = collections.filter(collection => 
    collection.itemIds.includes(item.id)
  );

  const linkedPurchaseRequest = item.purchaseRequestId 
    ? purchaseRequests.find(pr => pr.id === item.purchaseRequestId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{item.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(item.status)}>
                {item.status}
              </Badge>
              <Badge className={getConditionColor(item.condition)}>
                {item.condition}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDeleteItem}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1">{item.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="mt-1">{item.category}</p>
                </div>
                {item.brand && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Brand</label>
                    <p className="mt-1">{item.brand}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {item.weight && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Weight className="h-4 w-4" />
                      Weight
                    </label>
                    <p className="mt-1">{item.weight}g</p>
                  </div>
                )}
                {item.price && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Price
                    </label>
                    <p className="mt-1">${item.price}</p>
                  </div>
                )}
              </div>

              {item.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {item.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="mt-1 text-sm">{item.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{formatDate(item.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Collections Sidebar */}
        <div className="space-y-6">
          {/* Purchase Request Info */}
          {linkedPurchaseRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Purchase Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline">
                    {linkedPurchaseRequest.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge variant="outline">
                    {linkedPurchaseRequest.priority}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reason:</span>
                  <span className="capitalize">{linkedPurchaseRequest.reason}</span>
                </div>
                {linkedPurchaseRequest.estimatedCost && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Cost:</span>
                    <span>${linkedPurchaseRequest.estimatedCost}</span>
                  </div>
                )}
                {linkedPurchaseRequest.vendor && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vendor:</span>
                    <span>{linkedPurchaseRequest.vendor}</span>
                  </div>
                )}
                {linkedPurchaseRequest.expectedDelivery && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expected:</span>
                    <span>{formatDate(linkedPurchaseRequest.expectedDelivery)}</span>
                  </div>
                )}
                {linkedPurchaseRequest.notes && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    {linkedPurchaseRequest.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <CollectionPicker
                item={item}
                collections={collections}
                onUpdateCollections={onUpdateCollections}
              />
              
              {itemCollections.length > 0 && (
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Member of {itemCollections.length} collection{itemCollections.length > 1 ? 's' : ''}:
                  </label>
                  <div className="space-y-2">
                    {itemCollections.map((collection) => (
                      <div key={collection.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: collection.color || '#6b7280' }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{collection.name}</div>
                          {collection.description && (
                            <div className="text-xs text-muted-foreground">
                              {collection.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      {isEditOpen && (
        <Dialog open={true} onOpenChange={() => setIsEditOpen(false)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <EditItemForm
              item={item}
              onSubmit={handleEditItem}
              onCancel={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}