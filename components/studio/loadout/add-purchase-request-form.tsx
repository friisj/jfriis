'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PurchaseRequest, PurchaseRequestReason, PurchaseRequestPriority, Item } from '@/lib/studio/loadout/types';

interface AddPurchaseRequestFormProps {
  onSubmit: (request: Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt'>) => void;
  items: Item[];
  preFilledData?: Partial<PurchaseRequest>;
}

export function AddPurchaseRequestForm({ onSubmit, items, preFilledData }: AddPurchaseRequestFormProps) {
  const [formData, setFormData] = useState({
    name: preFilledData?.name || '',
    description: preFilledData?.description || '',
    category: preFilledData?.category || '',
    reason: (preFilledData?.reason || 'new') as PurchaseRequestReason,
    priority: (preFilledData?.priority || 'medium') as PurchaseRequestPriority,
    estimatedCost: preFilledData?.estimatedCost?.toString() || '',
    vendor: preFilledData?.vendor || '',
    replacementFor: preFilledData?.replacementFor || '',
    triggerTripId: preFilledData?.triggerTripId || '',
    notes: preFilledData?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const request: Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      reason: formData.reason,
      priority: formData.priority,
      status: 'pending',
      estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : undefined,
      vendor: formData.vendor || undefined,
      replacementFor: formData.replacementFor || undefined,
      triggerTripId: formData.triggerTripId || undefined,
      notes: formData.notes || undefined,
    };
    
    onSubmit(request);
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      category: '',
      reason: 'new',
      priority: 'medium',
      estimatedCost: '',
      vendor: '',
      replacementFor: '',
      triggerTripId: '',
      notes: '',
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReplacementSelect = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setFormData(prev => ({
        ...prev,
        replacementFor: itemId,
        name: `Replacement ${item.name}`,
        description: item.description || `Replacement for ${item.name}`,
        category: item.category,
        estimatedCost: item.price?.toString() || '',
        reason: 'replacement' as PurchaseRequestReason,
      }));
    }
  };

  const lostOrBrokenItems = items.filter(item => 
    ['lost', 'maintenance'].includes(item.status)
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick replacement selector for lost/broken items */}
          {lostOrBrokenItems.length > 0 && !formData.replacementFor && (
            <div className="space-y-2 p-3 bg-yellow-50 rounded-md">
              <Label className="text-sm font-medium">Quick Replace Lost/Broken Item:</Label>
              <div className="flex flex-wrap gap-2">
                {lostOrBrokenItems.map(item => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleReplacementSelect(item.id)}
                    className="text-xs"
                  >
                    {item.name} ({item.status})
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Water Filter, Sleeping Bag"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="e.g., Water Treatment, Sleep System"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <select
                id="reason"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="new">New Item</option>
                <option value="replacement">Replacement</option>
                <option value="lost">Lost Item</option>
                <option value="broken">Broken Item</option>
                <option value="planning-gap">Planning Gap</option>
                <option value="upgrade">Upgrade</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost ($)</Label>
              <Input
                id="estimatedCost"
                type="number"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) => handleInputChange('estimatedCost', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vendor">Preferred Vendor</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => handleInputChange('vendor', e.target.value)}
                placeholder="e.g., REI, Patagonia, Amazon"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the item needed"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional context, requirements, or specifications"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="submit">Create Purchase Request</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}