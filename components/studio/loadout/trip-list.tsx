'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconPlus, IconMapPin, IconCalendar, IconCircleCheck, IconClock, IconEye, IconPackage } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trip, Item } from '@/lib/studio/loadout/types';
import { AddTripForm } from './add-trip-form';

interface TripListProps {
  trips: Trip[];
  setTrips: (trips: Trip[]) => void;
  items: Item[];
  setItems: (items: Item[]) => void;
  onViewTrip?: (trip: Trip) => void;
}

export function TripList({ trips, setTrips, onViewTrip }: TripListProps) {
  const [isAddTripOpen, setIsAddTripOpen] = useState(false);
  const router = useRouter();

  const handleAddTrip = (newTrip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => {
    const trip: Trip = {
      ...newTrip,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTrips([...trips, trip]);
    setIsAddTripOpen(false);
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

  const getStatusIcon = (status: Trip['status']) => {
    switch (status) {
      case 'planning': return <IconClock size={16}  />;
      case 'packing': return <IconPackage size={16}  />;
      case 'active': return <IconCircleCheck size={16}  />;
      case 'unpacking': return <IconPackage size={16}  />;
      case 'completed': return <IconCircleCheck size={16}  />;
      case 'cancelled': return <IconCircleCheck size={16}  />;
      default: return <IconClock size={16}  />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const getDuration = (start: Date, end?: Date) => {
    if (!end) return 'TBD';
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Trips</h2>
        <Dialog open={isAddTripOpen} onOpenChange={setIsAddTripOpen}>
          <DialogTrigger asChild>
            <Button>
              <IconPlus size={16} className="mr-2" />
              Add Trip
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Trip</DialogTitle>
            </DialogHeader>
            <AddTripForm onSubmit={handleAddTrip} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Trips grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.map((trip) => (
          <Card 
            key={trip.id} 
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{trip.name}</CardTitle>
                <Badge className={getStatusColor(trip.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(trip.status)}
                    {trip.status}
                  </div>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {trip.description && (
                <p className="text-sm text-muted-foreground">{trip.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <IconCalendar size={16} className="text-muted-foreground" />
                  <span>{formatDate(trip.startDate)}</span>
                  {trip.endDate && (
                    <>
                      <span>→</span>
                      <span>{formatDate(trip.endDate)}</span>
                    </>
                  )}
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{getDuration(trip.startDate, trip.endDate)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{trip.type}</span>
                </div>
                
                {trip.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <IconMapPin size={16} className="text-muted-foreground" />
                    <span className="truncate">{trip.location}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items:</span>
                  <span>{trip.checkedOutItems.length} checked out</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-3 border-t">
                {onViewTrip && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewTrip(trip)}
                    className="flex-1"
                  >
                    <IconEye size={16} className="mr-2" />
                    View Details
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/apps/loadout/trips/${trip.id}`)}
                  className="flex-1"
                >
                  <IconCalendar size={16} className="mr-2" />
                  Trip Page
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {trips.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <IconMapPin size={48} className="mx-auto mb-4 opacity-50" />
          <p>No trips planned yet.</p>
          <p className="text-sm">Create your first trip to start tracking gear.</p>
        </div>
      )}

    </div>
  );
}