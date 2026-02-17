import { Item, Collection, Trip, PurchaseRequest } from './types';

const STORAGE_KEYS = {
  ITEMS: 'loadout_items',
  COLLECTIONS: 'loadout_collections',
  TRIPS: 'loadout_trips',
  PURCHASE_REQUESTS: 'loadout_purchase_requests',
} as const;

// Helper to check if we're in the browser
const isBrowser = typeof window !== 'undefined';

// Generic storage functions
function saveToStorage<T>(key: string, data: T): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (!isBrowser) return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return reviveDates(parsed) as T;
    }
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
  }
  return defaultValue;
}

// Helper to revive Date objects from JSON
function reviveDates(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(reviveDates);
  }
  
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      result[key] = new Date(value);
    } else if (typeof value === 'object') {
      result[key] = reviveDates(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Items storage
export function saveItems(items: Item[]): void {
  saveToStorage(STORAGE_KEYS.ITEMS, items);
}

export function loadItems(defaultItems: Item[] = []): Item[] {
  return loadFromStorage(STORAGE_KEYS.ITEMS, defaultItems);
}

// Collections storage
export function saveCollections(collections: Collection[]): void {
  saveToStorage(STORAGE_KEYS.COLLECTIONS, collections);
}

export function loadCollections(defaultCollections: Collection[] = []): Collection[] {
  return loadFromStorage(STORAGE_KEYS.COLLECTIONS, defaultCollections);
}

// Trips storage
export function saveTrips(trips: Trip[]): void {
  saveToStorage(STORAGE_KEYS.TRIPS, trips);
}

export function loadTrips(defaultTrips: Trip[] = []): Trip[] {
  return loadFromStorage(STORAGE_KEYS.TRIPS, defaultTrips);
}

// Purchase requests storage
export function savePurchaseRequests(purchaseRequests: PurchaseRequest[]): void {
  saveToStorage(STORAGE_KEYS.PURCHASE_REQUESTS, purchaseRequests);
}

export function loadPurchaseRequests(defaultPurchaseRequests: PurchaseRequest[] = []): PurchaseRequest[] {
  return loadFromStorage(STORAGE_KEYS.PURCHASE_REQUESTS, defaultPurchaseRequests);
}

// Clear all data
export function clearAllData(): void {
  if (!isBrowser) return;
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}