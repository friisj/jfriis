"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const GreenOutlinePrototype = dynamic(
  () => import("@/components/studio/prototypes/putt/green-outline"),
  { ssr: false }
);

export default function OutlineTestPage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="border-b p-4 flex items-center justify-between bg-card">
        <div>
          <Link href="/apps/putt/spikes" className="text-sm text-muted-foreground hover:text-foreground mr-4">
            ← Back to Spikes
          </Link>
          <h1 className="inline text-xl font-bold">
            Spike 1c.1: Green Outline & Shape System
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">
          5 shape families • Catmull-Rom splines • SDF generation
        </div>
      </header>
      <div className="flex-1">
        <GreenOutlinePrototype />
      </div>
    </div>
  );
}
