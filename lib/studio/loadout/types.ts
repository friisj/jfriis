export interface Item {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  weight?: number;
  price?: number;
  purchaseDate?: Date;
  condition: 'new' | 'good' | 'fair' | 'poor';
  category: string;
  tags: string[];
  imageUrl?: string;
  notes?: string;
  status: 'available' | 'checked-out' | 'maintenance' | 'lost' | 'pending-purchase' | 'discontinued';
  currentTripId?: string;
  purchaseRequestId?: string; // Link to purchase request for pending-purchase items
  createdAt: Date;
  updatedAt: Date;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  itemIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  type: 'camping' | 'hiking' | 'backpacking' | 'climbing' | 'other';
  status: 'planning' | 'packing' | 'active' | 'unpacking' | 'completed' | 'cancelled';
  checkedOutItems: TripItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TripItem {
  itemId: string;
  checkedOutAt: Date;
  checkedInAt?: Date;
  condition?: 'good' | 'damaged' | 'lost';
  notes?: string;
}

export interface PurchaseRequest {
  id: string;
  itemId?: string; // Reference to existing item (for replacements)
  name: string;
  description?: string;
  category: string;
  reason: 'replacement' | 'lost' | 'broken' | 'planning-gap' | 'upgrade' | 'new';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  
  // Purchase details
  estimatedCost?: number;
  actualCost?: number;
  vendor?: string;
  orderNumber?: string;
  orderDate?: Date;
  expectedDelivery?: Date;
  
  // Context
  triggerTripId?: string; // Trip that identified the need
  replacementFor?: string; // Item being replaced
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface TripPlanningItem {
  name: string;
  category: string;
  required: boolean;
  ownedItemId?: string; // Reference to owned gear
  purchaseRequestId?: string; // Reference to purchase request
  status: 'owned' | 'need-to-buy' | 'pending-purchase' | 'borrowed';
}

export type ItemStatus = Item['status'];
export type ItemCondition = Item['condition'];
export type TripStatus = Trip['status'];
export type TripType = Trip['type'];
export type PurchaseRequestReason = PurchaseRequest['reason'];
export type PurchaseRequestPriority = PurchaseRequest['priority'];
export type PurchaseRequestStatus = PurchaseRequest['status'];