'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collection, Item } from '@/lib/studio/loadout/types';

interface EditCollectionFormProps {
  collection: Collection;
  items: Item[];
  onSubmit: (updatedCollection: Collection) => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280'
];

export function EditCollectionForm({ collection, items, onSubmit, onCancel }: EditCollectionFormProps) {
  const [formData, setFormData] = useState({
    name: collection.name,
    description: collection.description || '',
    color: collection.color || PRESET_COLORS[0],
  });
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(collection.itemIds);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedCollection: Collection = {
      ...collection,
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color,
      itemIds: selectedItemIds,
      updatedAt: new Date(),
    };
    
    onSubmit(updatedCollection);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-collection-name">Collection Name *</Label>
            <Input
              id="edit-collection-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Ultralight Backpacking, Car Camping"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-collection-description">Description</Label>
            <Input
              id="edit-collection-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of this collection"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-9 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-900' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('color', color)}
                />
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Select Items ({selectedItemIds.length} selected)</Label>
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items available. Add some items first.
                </p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${item.id}`}
                      checked={selectedItemIds.includes(item.id)}
                      onCheckedChange={() => handleItemToggle(item.id)}
                    />
                    <Label htmlFor={`edit-${item.id}`} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span>{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {item.category}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.status === 'available' ? 'bg-green-100 text-green-800' :
                            item.status === 'checked-out' ? 'bg-yellow-100 text-yellow-800' :
                            item.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                            item.status === 'lost' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Update Collection</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}