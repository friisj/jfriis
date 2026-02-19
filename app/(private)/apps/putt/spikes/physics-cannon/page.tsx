"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const PhysicsEnginePrototype = dynamic(
  () => import("@/components/studio/prototypes/putt/physics-engine"),
  { ssr: false }
);

export default function PhysicsCannonPage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="border-b p-4 flex items-center justify-between bg-card">
        <div>
          <Link href="/apps/putt/spikes" className="text-sm text-muted-foreground hover:text-foreground mr-4">
            ← Back to Spikes
          </Link>
          <h1 className="inline text-xl font-bold">Spike 1b.3: Cannon.js Physics Integration</h1>
        </div>
        <Badge variant="outline">Cannon.js</Badge>
      </header>
      <div className="flex-1">
        <PhysicsEnginePrototype />
      </div>
    </div>
  );
}
