'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Item, ItemCondition, ItemStatus } from '@/lib/studio/loadout/types';

interface AddItemFormProps {
  onSubmit: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const COMMON_CATEGORIES = [
  'Packs & Bags',
  'Shelter',
  'Sleep System',
  'Cooking',
  'Water Treatment',
  'Clothing',
  'Footwear',
  'Navigation',
  'Safety',
  'Tools',
  'Electronics',
  'First Aid',
  'Personal Care',
  'Other'
];

const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  'Packs & Bags': ['backpacking', 'daypack', 'ultralight', 'hiking'],
  'Shelter': ['tent', 'tarp', 'bivy', 'ultralight', '1-person', '2-person'],
  'Sleep System': ['sleeping bag', 'sleeping pad', 'pillow', 'down', 'synthetic'],
  'Cooking': ['stove', 'cookware', 'utensils', 'fuel', 'lightweight'],
  'Water Treatment': ['filter', 'purifier', 'bottles', 'hydration'],
  'Clothing': ['base layer', 'insulation', 'rain gear', 'hiking'],
  'Footwear': ['boots', 'shoes', 'gaiters', 'hiking', 'waterproof'],
  'Navigation': ['GPS', 'compass', 'maps', 'emergency'],
  'Safety': ['headlamp', 'flashlight', 'whistle', 'emergency', 'signaling'],
  'Tools': ['knife', 'multi-tool', 'repair', 'maintenance'],
  'Electronics': ['GPS', 'phone', 'charger', 'camera', 'communication'],
  'First Aid': ['bandages', 'medication', 'emergency', 'safety'],
  'Personal Care': ['hygiene', 'toiletries', 'sunscreen', 'personal'],
};

export function AddItemForm({ onSubmit }: AddItemFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    brand: '',
    model: '',
    weight: '',
    price: '',
    condition: 'new' as ItemCondition,
    category: '',
    tags: '',
    notes: '',
    status: 'available' as ItemStatus,
  });

  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name,
      description: formData.description || undefined,
      brand: formData.brand || undefined,
      model: formData.model || undefined,
      weight: formData.weight ? parseInt(formData.weight) : undefined,
      price: formData.price ? parseFloat(formData.price) : undefined,
      condition: formData.condition,
      category: formData.category,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      notes: formData.notes || undefined,
      status: formData.status,
    };
    
    onSubmit(item);
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      brand: '',
      model: '',
      weight: '',
      price: '',
      condition: 'new',
      category: '',
      tags: '',
      notes: '',
      status: 'available',
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-suggest tags based on category
    if (field === 'category' && value && CATEGORY_SUGGESTIONS[value]) {
      const suggestedTags = CATEGORY_SUGGESTIONS[value].join(', ');
      setFormData(prev => ({ ...prev, tags: suggestedTags }));
    }
  };

  const handleCategorySelect = (category: string) => {
    setFormData(prev => ({ ...prev, category }));
    setCategorySearch(category);
    setShowCategoryDropdown(false);
    
    // Auto-suggest tags
    if (CATEGORY_SUGGESTIONS[category]) {
      const suggestedTags = CATEGORY_SUGGESTIONS[category].join(', ');
      setFormData(prev => ({ ...prev, tags: suggestedTags }));
    }
  };

  const filteredCategories = COMMON_CATEGORIES.filter(cat => 
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <div className="relative" ref={dropdownRef}>
                <Input
                  id="category"
                  value={categorySearch || formData.category}
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    setShowCategoryDropdown(true);
                    handleInputChange('category', e.target.value);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder="Select or type a category"
                  required
                />
                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        onClick={() => handleCategorySelect(category)}
                      >
                        {category}
                      </button>
                    ))}
                    {filteredCategories.length === 0 && categorySearch && (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No matching categories. Press Enter to create &quot;{categorySearch}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (grams)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <select
                id="condition"
                value={formData.condition}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="available">Available</option>
                <option value="checked-out">Checked Out</option>
                <option value="maintenance">Maintenance</option>
                <option value="lost">Lost</option>
                <option value="pending-purchase">Pending Purchase</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the item"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="ultralight, hiking, backpacking (comma separated)"
            />
            <p className="text-xs text-muted-foreground">
              Tags are auto-suggested based on category. Edit as needed.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes or comments"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="submit">Add Item</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}