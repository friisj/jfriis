'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, CheckCircle2, RotateCcw, MapPin, Calendar, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { loadItems, loadTrips, saveItems, saveTrips, loadPurchaseRequests, savePurchaseRequests } from '@/lib/studio/loadout/storage';
import { Trip, Item, TripItem, PurchaseRequest } from '@/lib/studio/loadout/types';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadedItems = loadItems();
    const loadedTrips = loadTrips();
    const loadedPurchaseRequests = loadPurchaseRequests();
    const foundTrip = loadedTrips.find(t => t.id === tripId);
    
    setItems(loadedItems);
    setTrips(loadedTrips);
    setPurchaseRequests(loadedPurchaseRequests);
    setTrip(foundTrip || null);
    setIsLoaded(true);
  }, [tripId]);

  const availableItems = items.filter(item => item.status === 'available');
  const checkedOutItems = trip ? trip.checkedOutItems.map(tripItem => ({
    ...tripItem,
    item: items.find(item => item.id === tripItem.itemId)!
  })).filter(tripItem => tripItem.item) : [];

  const handleCheckOut = () => {
    if (!trip) return;
    
    const now = new Date();
    const newTripItems: TripItem[] = selectedItemIds.map(itemId => ({
      itemId,
      checkedOutAt: now,
    }));

    // Update trip
    const updatedTrip = {
      ...trip,
      checkedOutItems: [...trip.checkedOutItems, ...newTripItems],
      updatedAt: now,
    };

    // Update items status
    const updatedItems = items.map(item => 
      selectedItemIds.includes(item.id) 
        ? { ...item, status: 'checked-out' as const, currentTripId: trip.id, updatedAt: now }
        : item
    );

    // Update trips list
    const updatedTrips = trips.map(t => t.id === trip.id ? updatedTrip : t);

    // Save and update state
    setTrip(updatedTrip);
    setTrips(updatedTrips);
    setItems(updatedItems);
    saveTrips(updatedTrips);
    saveItems(updatedItems);
    
    setSelectedItemIds([]);
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

    // Update trips list
    const updatedTrips = trips.map(t => t.id === trip.id ? updatedTrip : t);

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
        
        // Show notification (simple alert for now - could be enhanced with toast library)
        setTimeout(() => {
          alert(`✅ Purchase request created for replacement ${lostItem.name}`);
        }, 100);
      }
    }

    // Save and update state
    setTrip(updatedTrip);
    setTrips(updatedTrips);
    setItems(finalUpdatedItems);
    setPurchaseRequests(finalUpdatedPurchaseRequests);
    saveTrips(updatedTrips);
    saveItems(finalUpdatedItems);
    savePurchaseRequests(finalUpdatedPurchaseRequests);
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Trip not found</p>
          </div>
        </div>
      </div>
    );
  }

  const totalWeight = checkedOutItems.reduce((total, tripItem) => 
    total + (tripItem.item.weight || 0), 0
  );

  const totalValue = checkedOutItems.reduce((total, tripItem) => 
    total + (tripItem.item.price || 0), 0
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Trip Info */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{trip.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(trip.startDate)}
                  {trip.endDate && ` → ${formatDate(trip.endDate)}`}
                </div>
                {trip.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {trip.location}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(trip.status)}>
                {trip.status}
              </Badge>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Trip
              </Button>
            </div>
          </div>
          
          {trip.description && (
            <p className="text-muted-foreground mb-4">{trip.description}</p>
          )}

          {/* Trip Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{checkedOutItems.length}</div>
                <p className="text-xs text-muted-foreground">Items Checked Out</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{totalWeight}g</div>
                <p className="text-xs text-muted-foreground">Total Weight</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold capitalize">{trip.type}</div>
                <p className="text-xs text-muted-foreground">Trip Type</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Checked Out Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Gear List</CardTitle>
            <Button onClick={() => setIsCheckOutOpen(true)} disabled={availableItems.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Check Out Items
            </Button>
          </CardHeader>
          <CardContent>
            {checkedOutItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No items checked out for this trip.</p>
                <Button onClick={() => setIsCheckOutOpen(true)} variant="outline">
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
                          <h4 className="font-medium">{tripItem.item.name}</h4>
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
                        <div className="text-right">
                          <div className="flex gap-2 mb-2">
                            <Badge variant="outline">{tripItem.item.category}</Badge>
                            <Badge className={
                              tripItem.item.condition === 'new' ? 'bg-blue-100 text-blue-800' :
                              tripItem.item.condition === 'good' ? 'bg-green-100 text-green-800' :
                              tripItem.item.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {tripItem.item.condition}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tripItem.item.weight && <div>{tripItem.item.weight}g</div>}
                            {tripItem.item.price && <div>${tripItem.item.price}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {!tripItem.checkedInAt && (
                      <div className="flex gap-2 ml-4">
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
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Check Out Items</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {availableItems.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    No available items to check out.
                  </div>
                ) : (
                  availableItems.map((item) => (
                    <div key={item.id} className="flex items-start space-x-3 p-3 border rounded">
                      <Checkbox
                        id={item.id}
                        checked={selectedItemIds.includes(item.id)}
                        onCheckedChange={() => handleItemToggle(item.id)}
                        className="mt-1"
                      />
                      <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                        <div className="space-y-1">
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            {item.weight && <span className="text-xs text-muted-foreground">{item.weight}g</span>}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {selectedItemIds.length} item{selectedItemIds.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsCheckOutOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCheckOut}
                    disabled={selectedItemIds.length === 0}
                  >
                    Check Out Items
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}