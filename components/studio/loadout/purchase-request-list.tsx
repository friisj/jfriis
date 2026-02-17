'use client';

import { useState } from 'react';
import { Plus, Search, ShoppingCart, AlertTriangle, Clock, CheckCircle, Package, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PurchaseRequest, Item } from '@/lib/studio/loadout/types';
import { AddPurchaseRequestForm } from './add-purchase-request-form';

interface PurchaseRequestListProps {
  purchaseRequests: PurchaseRequest[];
  setPurchaseRequests: (requests: PurchaseRequest[]) => void;
  items: Item[];
  setItems: (items: Item[]) => void;
}

export function PurchaseRequestList({ 
  purchaseRequests, 
  setPurchaseRequests, 
  items, 
  setItems 
}: PurchaseRequestListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [isAddRequestOpen, setIsAddRequestOpen] = useState(false);

  const filteredRequests = purchaseRequests.filter(request => {
    const matchesSearch = request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && !['cancelled', 'received'].includes(request.status)) ||
      request.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const handleAddRequest = (newRequest: Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
    const request: PurchaseRequest = {
      ...newRequest,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Create placeholder item for pending purchase
    const placeholderItem: Item = {
      id: Math.random().toString(36).substr(2, 9),
      name: request.name,
      description: request.description,
      category: request.category,
      condition: 'new', // Assuming new items being purchased
      status: 'pending-purchase',
      tags: [],
      purchaseRequestId: request.id,
      price: request.estimatedCost,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setPurchaseRequests([...purchaseRequests, request]);
    setItems([...items, placeholderItem]);
    setIsAddRequestOpen(false);
  };

  const handleStatusChange = (requestId: string, newStatus: PurchaseRequest['status']) => {
    const request = purchaseRequests.find(r => r.id === requestId);
    if (!request) return;

    const updatedRequests = purchaseRequests.map(r => 
      r.id === requestId 
        ? { ...r, status: newStatus, updatedAt: new Date() }
        : r
    );
    setPurchaseRequests(updatedRequests);

    // Update the linked placeholder item
    const linkedItem = items.find(item => item.purchaseRequestId === requestId);
    if (linkedItem) {
      let newItemStatus: Item['status'] = 'pending-purchase';
      let updatedItem = { ...linkedItem };

      if (newStatus === 'received') {
        // Convert placeholder to real item
        newItemStatus = 'available';
        updatedItem = {
          ...linkedItem,
          status: newItemStatus,
          purchaseDate: new Date(),
          price: request.actualCost || request.estimatedCost,
          updatedAt: new Date(),
        };
      } else if (newStatus === 'cancelled') {
        // Remove the placeholder item entirely
        setItems(items.filter(item => item.id !== linkedItem.id));
        return;
      } else {
        // Just update the item's timestamp for other status changes
        updatedItem = {
          ...linkedItem,
          status: newItemStatus,
          updatedAt: new Date(),
        };
      }

      setItems(items.map(item => 
        item.id === linkedItem.id ? updatedItem : item
      ));
    }
  };


  const handleDeleteRequest = (requestId: string) => {
    if (confirm('Are you sure you want to delete this purchase request? This action cannot be undone.')) {
      // Remove the purchase request
      setPurchaseRequests(purchaseRequests.filter(request => request.id !== requestId));
      
      // Remove the linked placeholder item
      setItems(items.filter(item => item.purchaseRequestId !== requestId));
    }
  };

  const getPriorityColor = (priority: PurchaseRequest['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: PurchaseRequest['status']) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'ordered': return 'bg-purple-100 text-purple-800';
      case 'received': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: PurchaseRequest['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'ordered': return <ShoppingCart className="h-4 w-4" />;
      case 'received': return <Package className="h-4 w-4" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getReasonColor = (reason: PurchaseRequest['reason']) => {
    switch (reason) {
      case 'lost': return 'bg-red-100 text-red-800';
      case 'broken': return 'bg-orange-100 text-orange-800';
      case 'replacement': return 'bg-yellow-100 text-yellow-800';
      case 'planning-gap': return 'bg-blue-100 text-blue-800';
      case 'upgrade': return 'bg-purple-100 text-purple-800';
      case 'new': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const totalPendingValue = filteredRequests
    .filter(r => !['cancelled', 'received'].includes(r.status))
    .reduce((sum, r) => sum + (r.estimatedCost || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search purchase requests..."
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
            <option value="active">Active</option>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Total Pending: <span className="font-semibold">${totalPendingValue.toFixed(2)}</span>
          </div>
          <Dialog open={isAddRequestOpen} onOpenChange={setIsAddRequestOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Purchase Request</DialogTitle>
              </DialogHeader>
              <AddPurchaseRequestForm 
                onSubmit={handleAddRequest}
                items={items}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Purchase requests grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{request.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(request.priority)}>
                    {request.priority}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRequest(request.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.description && (
                <p className="text-sm text-muted-foreground">{request.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Category:</span>
                  <span>{request.category}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reason:</span>
                  <Badge className={getReasonColor(request.reason)} variant="outline">
                    {request.reason}
                  </Badge>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(request.status)}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(request.status)}
                      {request.status}
                    </div>
                  </Badge>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost:</span>
                  <span>
                    {request.actualCost ? `$${request.actualCost}` : 
                     request.estimatedCost ? `~$${request.estimatedCost}` : 'TBD'}
                  </span>
                </div>
                
                {request.vendor && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vendor:</span>
                    <span>{request.vendor}</span>
                  </div>
                )}
                
                {request.expectedDelivery && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expected:</span>
                    <span>{formatDate(request.expectedDelivery)}</span>
                  </div>
                )}
              </div>
              
              {request.notes && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {request.notes}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                {request.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(request.id, 'approved')}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    Approve
                  </Button>
                )}
                {request.status === 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(request.id, 'ordered')}
                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                  >
                    Mark Ordered
                  </Button>
                )}
                {request.status === 'ordered' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(request.id, 'received')}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    Mark Received
                  </Button>
                )}
                {!['cancelled', 'received'].includes(request.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(request.id, 'cancelled')}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredRequests.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No purchase requests found matching your criteria.</p>
          <p className="text-sm">Create a new request to start tracking purchases.</p>
        </div>
      )}
    </div>
  );
}