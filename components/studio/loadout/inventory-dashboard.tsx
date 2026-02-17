'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ItemList } from './item-list';
import { CollectionList } from './collection-list';
import { TripList } from './trip-list';
import { PurchaseRequestList } from './purchase-request-list';
import { ItemDetail } from './item-detail';
import { CollectionDetail } from './collection-detail';
import { TripDetail } from './trip-detail';
import { sampleItems, sampleCollections, sampleTrips, samplePurchaseRequests } from '@/lib/studio/loadout/data';
import { saveItems, saveCollections, saveTrips, savePurchaseRequests, loadItems, loadCollections, loadTrips, loadPurchaseRequests } from '@/lib/studio/loadout/storage';
import { Item, Collection, Trip, PurchaseRequest } from '@/lib/studio/loadout/types';

export function InventoryDashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [viewingCollection, setViewingCollection] = useState<Collection | null>(null);
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedItems = loadItems(sampleItems);
    const loadedCollections = loadCollections(sampleCollections);
    const loadedTrips = loadTrips(sampleTrips);
    const loadedPurchaseRequests = loadPurchaseRequests(samplePurchaseRequests);
    
    setItems(loadedItems);
    setCollections(loadedCollections);
    setTrips(loadedTrips);
    setPurchaseRequests(loadedPurchaseRequests);
    setIsLoaded(true);
  }, []);

  // Wrapper functions that save to localStorage
  const updateItems = (newItems: Item[]) => {
    setItems(newItems);
    saveItems(newItems);
  };

  const updateCollections = (newCollections: Collection[]) => {
    setCollections(newCollections);
    saveCollections(newCollections);
  };

  const updateTrips = (newTrips: Trip[]) => {
    setTrips(newTrips);
    saveTrips(newTrips);
  };

  const updatePurchaseRequests = (newPurchaseRequests: PurchaseRequest[]) => {
    setPurchaseRequests(newPurchaseRequests);
    savePurchaseRequests(newPurchaseRequests);
  };

  const handleViewItem = (item: Item) => {
    setViewingItem(item);
  };

  const handleViewCollection = (collection: Collection) => {
    setViewingCollection(collection);
  };

  const handleViewTrip = (trip: Trip) => {
    setViewingTrip(trip);
  };

  const handleUpdateItem = (updatedItem: Item) => {
    const updatedItems = items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    );
    updateItems(updatedItems);
    setViewingItem(updatedItem);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    updateItems(updatedItems);
  };

  const handleUpdateCollection = (updatedCollection: Collection) => {
    const updatedCollections = collections.map(collection => 
      collection.id === updatedCollection.id ? updatedCollection : collection
    );
    updateCollections(updatedCollections);
    setViewingCollection(updatedCollection);
  };

  const handleDeleteCollection = (collectionId: string) => {
    const updatedCollections = collections.filter(collection => collection.id !== collectionId);
    updateCollections(updatedCollections);
  };

  const handleUpdateTrip = (updatedTrip: Trip) => {
    const updatedTrips = trips.map(trip => 
      trip.id === updatedTrip.id ? updatedTrip : trip
    );
    updateTrips(updatedTrips);
    setViewingTrip(updatedTrip);
  };

  const handleDeleteTrip = (tripId: string) => {
    const updatedTrips = trips.filter(trip => trip.id !== tripId);
    updateTrips(updatedTrips);
  };

  // Show loading state until data is loaded
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show item detail view
  if (viewingItem) {
    return (
      <ItemDetail
        item={viewingItem}
        collections={collections}
        purchaseRequests={purchaseRequests}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onUpdateCollections={updateCollections}
        onBack={() => setViewingItem(null)}
      />
    );
  }

  // Show collection detail view
  if (viewingCollection) {
    return (
      <CollectionDetail
        collection={viewingCollection}
        items={items}
        onUpdateCollection={handleUpdateCollection}
        onDeleteCollection={handleDeleteCollection}
        onBack={() => setViewingCollection(null)}
      />
    );
  }

  // Show trip detail view
  if (viewingTrip) {
    return (
      <TripDetail
        trip={viewingTrip}
        items={items}
        collections={collections}
        purchaseRequests={purchaseRequests}
        onUpdateTrip={handleUpdateTrip}
        onUpdateItems={updateItems}
        onUpdatePurchaseRequests={updatePurchaseRequests}
        onDeleteTrip={handleDeleteTrip}
        onBack={() => setViewingTrip(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
          <TabsTrigger value="collections">Collections ({collections.length})</TabsTrigger>
          <TabsTrigger value="trips">Trips ({trips.length})</TabsTrigger>
          <TabsTrigger value="purchases">
            Purchases ({purchaseRequests.filter(pr => pr.status !== 'cancelled' && pr.status !== 'received').length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="items" className="space-y-4">
          <ItemList 
            items={items} 
            setItems={updateItems}
            collections={collections}
            setCollections={updateCollections}
            onViewItem={handleViewItem}
          />
        </TabsContent>
        
        <TabsContent value="collections" className="space-y-4">
          <CollectionList 
            collections={collections} 
            setCollections={updateCollections}
            items={items}
            onViewCollection={handleViewCollection}
          />
        </TabsContent>
        
        <TabsContent value="trips" className="space-y-4">
          <TripList 
            trips={trips} 
            setTrips={updateTrips}
            items={items}
            setItems={updateItems}
            onViewTrip={handleViewTrip}
          />
        </TabsContent>
        
        <TabsContent value="purchases" className="space-y-4">
          <PurchaseRequestList 
            purchaseRequests={purchaseRequests}
            setPurchaseRequests={updatePurchaseRequests}
            items={items}
            setItems={updateItems}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}