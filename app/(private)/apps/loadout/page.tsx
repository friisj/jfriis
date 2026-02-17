import { InventoryDashboard } from '@/components/studio/loadout/inventory-dashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Loadout</h1>
          <p className="text-muted-foreground">Camping Gear Inventory Management</p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <InventoryDashboard />
      </main>
    </div>
  );
}
