'use client';

import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Square, CheckSquare, Layers, Eye, Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Item, Collection } from '@/lib/studio/loadout/types';
import { AddItemForm } from './add-item-form';
import { EditItemForm } from './edit-item-form';
import { CollectionPicker } from './collection-picker';

interface ItemListProps {
  items: Item[];
  setItems: (items: Item[]) => void;
  collections: Collection[];
  setCollections: (collections: Collection[]) => void;
  onViewItem?: (item: Item) => void;
}

export function ItemList({ items, setItems, collections, setCollections, onViewItem }: ItemListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isBulkManageOpen, setIsBulkManageOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const handleAddItem = (newItem: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
    const item: Item = {
      ...newItem,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setItems([...items, item]);
    setIsAddItemOpen(false);
  };

  const handleEditItem = (updatedItem: Item) => {
    setItems(items.map(item => item.id === updatedItem.id ? updatedItem : item));
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      setItems(items.filter(item => item.id !== itemId));
    }
  };

  const handleSelectItem = (itemId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleBulkAddToCollection = (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    const updatedCollection = {
      ...collection,
      itemIds: [...new Set([...collection.itemIds, ...selectedItems])],
      updatedAt: new Date(),
    };

    setCollections(collections.map(c => c.id === collectionId ? updatedCollection : c));
    setSelectedItems([]);
    setIsBulkManageOpen(false);
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

  return (
    <div className="space-y-4">
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="checked-out">Checked Out</option>
            <option value="maintenance">Maintenance</option>
            <option value="lost">Lost</option>
            <option value="pending-purchase">Pending Purchase</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
        
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
          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
              </DialogHeader>
              <AddItemForm onSubmit={handleAddItem} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk selection toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-8"
          >
            {selectedItems.length === filteredItems.length && filteredItems.length > 0 ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span className="ml-2">
              {selectedItems.length === filteredItems.length && filteredItems.length > 0 
                ? 'Deselect All' 
                : 'Select All'}
            </span>
          </Button>
          {selectedItems.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        
        {selectedItems.length > 0 && (
          <Dialog open={isBulkManageOpen} onOpenChange={setIsBulkManageOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Layers className="h-4 w-4 mr-2" />
                Add to Collection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add {selectedItems.length} Items to Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {collections.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    No collections available. Create a collection first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {collections.map((collection) => (
                      <div
                        key={collection.id}
                        className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50"
                        onClick={() => handleBulkAddToCollection(collection.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: collection.color || '#6b7280' }}
                          />
                          <div>
                            <div className="font-medium">{collection.name}</div>
                            {collection.description && (
                              <div className="text-sm text-muted-foreground">
                                {collection.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {collection.itemIds.length} items
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Items display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => 
                        handleSelectItem(item.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                    <div className="flex gap-1">
                      {onViewItem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewItem(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingItem(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
                
                <div className="space-y-2">
                  {item.brand && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Brand:</span>
                      <span>{item.brand}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Category:</span>
                    <span>{item.category}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Condition:</span>
                    <Badge className={getConditionColor(item.condition)}>
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
                </div>
                
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Collection management */}
                <div className="pt-2 border-t">
                  <CollectionPicker
                    item={item}
                    collections={collections}
                    onUpdateCollections={setCollections}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
              <div className="flex items-center gap-4 flex-1">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={(checked) => 
                    handleSelectItem(item.id, checked as boolean)
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-lg">{item.name}</span>
                    <Badge className={getStatusColor(item.status)} variant="outline">
                      {item.status}
                    </Badge>
                    <Badge className={getConditionColor(item.condition)} variant="outline">
                      {item.condition}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span>{item.category}</span>
                    {item.brand && <span> • {item.brand}</span>}
                    {item.weight && <span> • {item.weight}g</span>}
                    {item.price && <span> • ${item.price}</span>}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onViewItem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewItem(item)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingItem(item)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteItem(item.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {filteredItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No items found matching your criteria.
        </div>
      )}

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={true} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <EditItemForm
              item={editingItem}
              onSubmit={handleEditItem}
              onCancel={() => setEditingItem(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}