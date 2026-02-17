'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, CheckCircle2, RotateCcw, Search, Package, Calendar, MapPin, Edit, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Trip, Item, Collection, TripItem, PurchaseRequest } from '@/lib/studio/loadout/types';

interface TripDetailProps {
  trip: Trip;
  items: Item[];
  collections: Collection[];
  purchaseRequests: PurchaseRequest[];
  onUpdateTrip: (updatedTrip: Trip) => void;
  onUpdateItems: (updatedItems: Item[]) => void;
  onUpdatePurchaseRequests: (updatedPurchaseRequests: PurchaseRequest[]) => void;
  onDeleteTrip: (tripId: string) => void;
  onBack: () => void;
}

export function TripDetail({
  trip,
  items,
  collections,
  purchaseRequests,
  onUpdateTrip,
  onUpdateItems,
  onUpdatePurchaseRequests,
  onDeleteTrip,
  onBack
}: TripDetailProps) {
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  // Get available items (not checked out, not lost/discontinued)
  const availableItems = items.filter(item => 
    ['available', 'pending-purchase'].includes(item.status) &&
    !item.currentTripId
  );

  // Get checked out items for this trip
  const checkedOutItems = trip.checkedOutItems.map(tripItem => ({
    ...tripItem,
    item: items.find(item => item.id === tripItem.itemId)!
  })).filter(tripItem => tripItem.item);

  // Filter items and collections based on search
  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collection.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemToggle = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleCollectionToggle = (collectionId: string) => {
    setSelectedCollectionIds(prev => 
      prev.includes(collectionId) 
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleCheckOut = () => {
    if (!trip) return;
    
    const now = new Date();
    
    // Get items from selected collections
    const collectionItemIds = selectedCollectionIds.flatMap(collectionId => {
      const collection = collections.find(c => c.id === collectionId);
      return collection ? collection.itemIds.filter(itemId => 
        availableItems.some(item => item.id === itemId)
      ) : [];
    });

    // Combine individual items and collection items
    const allSelectedItemIds = [...new Set([...selectedItemIds, ...collectionItemIds])];
    
    if (allSelectedItemIds.length === 0) return;

    // Create trip items
    const newTripItems: TripItem[] = allSelectedItemIds.map(itemId => ({
      itemId,
      checkedOutAt: now,
    }));

    // Update trip
    const updatedTrip = {
      ...trip,
      checkedOutItems: [...trip.checkedOutItems, ...newTripItems],
      updatedAt: now,
    };

    // Update item statuses
    const updatedItems = items.map(item => 
      allSelectedItemIds.includes(item.id)
        ? { ...item, status: 'checked-out' as const, currentTripId: trip.id, updatedAt: now }
        : item
    );

    onUpdateTrip(updatedTrip);
    onUpdateItems(updatedItems);
    
    setSelectedItemIds([]);
    setSelectedCollectionIds([]);
    setIsCheckOutOpen(false);
  };

  const handleCheckIn = (tripItem: TripItem, condition: 'good' | 'damaged' | 'lost') => {
    if (!trip) return;
    
    const now = new Date();
    
    // Update trip item
    const updatedTripItems = trip.checkedOutItems.map(ti => 
      ti.itemId === tripItem.itemId && ti.checkedOutAt === tripItem.checkedOutAt
        ? { ...ti, checkedInAt: now, condition }
        : ti
    );

    // Update trip
    const updatedTrip = {
      ...trip,
      checkedOutItems: updatedTripItems,
      updatedAt: now,
    };

    // Update item status
    const newItemStatus: Item['status'] = condition === 'lost' ? 'lost' : 
                         condition === 'damaged' ? 'maintenance' : 'available';
    
    const updatedItems = items.map(item => 
      item.id === tripItem.itemId 
        ? { 
            ...item, 
            status: newItemStatus, 
            currentTripId: undefined,
            updatedAt: now 
          }
        : item
    );

    let finalUpdatedItems = updatedItems;
    let finalUpdatedPurchaseRequests = purchaseRequests;

    // Create purchase request if item is lost
    if (condition === 'lost') {
      const lostItem = items.find(item => item.id === tripItem.itemId);
      if (lostItem) {
        const purchaseRequest: PurchaseRequest = {
          // eslint-disable-next-line react-hooks/purity
          id: Math.random().toString(36).substr(2, 9),
          name: `Replacement ${lostItem.name}`,
          description: `Replacement for lost ${lostItem.name}`,
          category: lostItem.category,
          reason: 'lost',
          priority: 'high',
          status: 'pending',
          estimatedCost: lostItem.price,
          replacementFor: lostItem.id,
          triggerTripId: trip.id,
          notes: `Lost during ${trip.name} - auto-generated replacement request`,
          createdAt: now,
          updatedAt: now,
        };
        
        // Create placeholder item for the replacement
        const placeholderItem: Item = {
          // eslint-disable-next-line react-hooks/purity
          id: Math.random().toString(36).substr(2, 9),
          name: `Replacement ${lostItem.name}`,
          description: `Replacement for lost ${lostItem.name}`,
          category: lostItem.category,
          condition: lostItem.condition,
          status: 'pending-purchase',
          tags: [...lostItem.tags],
          purchaseRequestId: purchaseRequest.id,
          price: lostItem.price,
          brand: lostItem.brand,
          model: lostItem.model,
          weight: lostItem.weight,
          createdAt: now,
          updatedAt: now,
        };
        
        finalUpdatedPurchaseRequests = [...purchaseRequests, purchaseRequest];
        finalUpdatedItems = [...updatedItems, placeholderItem];
        
        // Show notification
        setTimeout(() => {
          alert(`✅ Purchase request created for replacement ${lostItem.name}`);
        }, 100);
      }
    }

    onUpdateTrip(updatedTrip);
    onUpdateItems(finalUpdatedItems);
    onUpdatePurchaseRequests(finalUpdatedPurchaseRequests);
  };

  const handleDeleteTrip = () => {
    if (confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      onDeleteTrip(trip.id);
      onBack();
    }
  };

  const handleStatusChange = (newStatus: Trip['status']) => {
    const updatedTrip = {
      ...trip,
      status: newStatus,
      updatedAt: new Date(),
    };
    onUpdateTrip(updatedTrip);
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

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'packing': return 'bg-purple-100 text-purple-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'unpacking': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getItemStatusColor = (status: Item['status']) => {
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

  const getTotalWeight = () => {
    return checkedOutItems.reduce((total, tripItem) => 
      total + (tripItem.item.weight || 0), 0
    );
  };

  const getTotalValue = () => {
    return checkedOutItems.reduce((total, tripItem) => 
      total + (tripItem.item.price || 0), 0
    );
  };

  // Get available actions based on trip status
  const getStatusActions = () => {
    switch (trip.status) {
      case 'planning':
        return [
          {
            label: 'Start Packing',
            action: () => handleStatusChange('packing'),
            icon: <Package className="h-4 w-4" />,
            variant: 'default' as const,
            disabled: false
          }
        ];
      
      case 'packing':
        return [
          {
            label: 'Start Trip',
            action: () => handleStatusChange('active'),
            icon: <Play className="h-4 w-4" />,
            variant: 'default' as const,
            disabled: checkedOutItems.length === 0
          },
          {
            label: 'Back to Planning',
            action: () => handleStatusChange('planning'),
            icon: <Edit className="h-4 w-4" />,
            variant: 'outline' as const,
            disabled: false
          }
        ];
      
      case 'active':
        return [
          {
            label: 'Start Unpacking',
            action: () => handleStatusChange('unpacking'),
            icon: <Pause className="h-4 w-4" />,
            variant: 'default' as const,
            disabled: false
          }
        ];
      
      case 'unpacking':
        return [
          {
            label: 'Complete Trip',
            action: () => handleStatusChange('completed'),
            icon: <CheckCircle2 className="h-4 w-4" />,
            variant: 'default' as const,
            disabled: checkedOutItems.some(item => !item.checkedInAt)
          },
          {
            label: 'Resume Trip',
            action: () => handleStatusChange('active'),
            icon: <Play className="h-4 w-4" />,
            variant: 'outline' as const,
            disabled: false
          }
        ];
      
      case 'completed':
      case 'cancelled':
        return [];
      
      default:
        return [];
    }
  };

  // Get checkout button availability based on status
  const canCheckOut = () => {
    return ['planning', 'packing'].includes(trip.status);
  };

  // Get checkin button availability based on status
  const canCheckIn = () => {
    return ['active', 'unpacking'].includes(trip.status);
  };

  // Get mode-specific messaging
  const getModeMessage = () => {
    switch (trip.status) {
      case 'planning':
        return {
          title: 'Planning Phase',
          message: 'Add items and collections to your trip. Once you\'re ready, start packing!',
          color: 'text-blue-600'
        };
      case 'packing':
        return {
          title: 'Packing Phase',
          message: 'Check out all the gear you need for your trip. Make sure everything is ready!',
          color: 'text-purple-600'
        };
      case 'active':
        return {
          title: 'Trip Active',
          message: 'Your trip is underway! Check in items as good, damaged, or lost when you return.',
          color: 'text-green-600'
        };
      case 'unpacking':
        return {
          title: 'Unpacking Phase',
          message: 'Check in all your gear and assess its condition. Complete the trip when done.',
          color: 'text-orange-600'
        };
      case 'completed':
        return {
          title: 'Trip Completed',
          message: 'This trip has been completed. All gear has been checked in.',
          color: 'text-gray-600'
        };
      case 'cancelled':
        return {
          title: 'Trip Cancelled',
          message: 'This trip was cancelled.',
          color: 'text-red-600'
        };
      default:
        return {
          title: '',
          message: '',
          color: 'text-gray-600'
        };
    }
  };

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
              <h1 className="text-2xl font-bold">{trip.name}</h1>
              <Badge className={getStatusColor(trip.status)}>
                {trip.status}
              </Badge>
            </div>
            {trip.description && (
              <p className="text-muted-foreground mt-1">{trip.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Status-specific actions */}
          {getStatusActions().map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              onClick={action.action}
              disabled={action.disabled}
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </Button>
          ))}
          
          {/* Standard actions */}
          {!['completed', 'cancelled'].includes(trip.status) && (
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleDeleteTrip}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Mode-specific message */}
      {getModeMessage().message && (
        <Card className="border-l-4" style={{ borderLeftColor: getModeMessage().color.replace('text-', '') }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`font-semibold ${getModeMessage().color}`}>
                {getModeMessage().title}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {getModeMessage().message}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Trip Info Cards */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Start Date</div>
            </div>
            <div className="text-lg font-semibold mt-1">
              {formatDate(trip.startDate)}
            </div>
          </CardContent>
        </Card>

        {trip.endDate && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">End Date</div>
              </div>
              <div className="text-lg font-semibold mt-1">
                {formatDate(trip.endDate)}
              </div>
            </CardContent>
          </Card>
        )}

        {trip.location && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Location</div>
              </div>
              <div className="text-lg font-semibold mt-1">{trip.location}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Checked Out</div>
            </div>
            <div className="text-lg font-semibold mt-1">{checkedOutItems.length} items</div>
          </CardContent>
        </Card>
      </div>

      {/* Gear Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Weight</div>
            <div className="text-2xl font-bold">{getTotalWeight()}g</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Value</div>
            <div className="text-2xl font-bold">${getTotalValue().toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Checked Out Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Checked Out Items ({checkedOutItems.length})
            </CardTitle>
            <Button 
              onClick={() => setIsCheckOutOpen(true)}
              disabled={!canCheckOut()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Check Out Items
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {checkedOutItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No items checked out for this trip.</p>
              <Button 
                onClick={() => setIsCheckOutOpen(true)} 
                variant="outline"
                disabled={!canCheckOut()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Check Out Your First Item
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {checkedOutItems.map((tripItem) => (
                <div key={`${tripItem.itemId}-${tripItem.checkedOutAt}`} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{tripItem.item.name}</h4>
                          <Badge className={getItemStatusColor(tripItem.item.status)} variant="outline">
                            {tripItem.item.status}
                          </Badge>
                        </div>
                        {tripItem.item.description && (
                          <p className="text-sm text-muted-foreground">{tripItem.item.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Checked out: {formatDate(tripItem.checkedOutAt)}</span>
                          {tripItem.checkedInAt && (
                            <span className="text-green-600">
                              Checked in: {formatDate(tripItem.checkedInAt)} 
                              {tripItem.condition && ` (${tripItem.condition})`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {!tripItem.checkedInAt && canCheckIn() && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckIn(tripItem, 'good')}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Good
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckIn(tripItem, 'damaged')}
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Damaged
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckIn(tripItem, 'lost')}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        Lost
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check Out Items Dialog */}
      <Dialog open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Check Out Items & Collections</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items and collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabs for Items and Collections */}
            <Tabs defaultValue="items" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="items">Items ({filteredItems.length})</TabsTrigger>
                <TabsTrigger value="collections">Collections ({filteredCollections.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="items" className="flex-1 overflow-hidden">
                <div className="h-96 overflow-y-auto space-y-2">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No available items found.
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <div key={item.id} className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50">
                        <Checkbox
                          id={item.id}
                          checked={selectedItemIds.includes(item.id)}
                          onCheckedChange={() => handleItemToggle(item.id)}
                          className="mt-1"
                        />
                        <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              <Badge className={getItemStatusColor(item.status)} variant="outline">
                                {item.status}
                              </Badge>
                            </div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground">{item.description}</div>
                            )}
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              {item.weight && <span className="text-xs text-muted-foreground">{item.weight}g</span>}
                              {item.price && <span className="text-xs text-muted-foreground">${item.price}</span>}
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="collections" className="flex-1 overflow-hidden">
                <div className="h-96 overflow-y-auto space-y-2">
                  {filteredCollections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No collections found.
                    </div>
                  ) : (
                    filteredCollections.map((collection) => {
                      const collectionItems = items.filter(item => 
                        collection.itemIds.includes(item.id) && 
                        availableItems.some(avail => avail.id === item.id)
                      );
                      
                      return (
                        <div key={collection.id} className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50">
                          <Checkbox
                            id={collection.id}
                            checked={selectedCollectionIds.includes(collection.id)}
                            onCheckedChange={() => handleCollectionToggle(collection.id)}
                            className="mt-1"
                          />
                          <Label htmlFor={collection.id} className="flex-1 cursor-pointer">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: collection.color || '#6b7280' }}
                                />
                                <span className="font-medium">{collection.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {collectionItems.length} available items
                                </Badge>
                              </div>
                              {collection.description && (
                                <div className="text-sm text-muted-foreground">{collection.description}</div>
                              )}
                              {collectionItems.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  Items: {collectionItems.map(item => item.name).join(', ')}
                                </div>
                              )}
                            </div>
                          </Label>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Selected Summary */}
            {(selectedItemIds.length > 0 || selectedCollectionIds.length > 0) && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedItemIds.length} items, {selectedCollectionIds.length} collections
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedItemIds([]);
                        setSelectedCollectionIds([]);
                      }}
                    >
                      Clear Selection
                    </Button>
                    <Button onClick={handleCheckOut}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Check Out Items
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}