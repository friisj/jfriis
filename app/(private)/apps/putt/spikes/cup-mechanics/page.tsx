"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const CupMechanicsPrototype = dynamic(
  () => import("@/components/studio/prototypes/putt/cup-mechanics"),
  { ssr: false }
);

export default function CupMechanicsPage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="border-b p-4 flex items-center justify-between bg-card">
        <div>
          <Link href="/apps/putt/spikes" className="text-sm text-muted-foreground hover:text-foreground mr-4">
            ← Back to Spikes
          </Link>
          <h1 className="inline text-xl font-bold">Spike 2: Cup Mechanics</h1>
        </div>
        <Badge variant="outline">Capture & Rim Physics</Badge>
      </header>
      <div className="flex-1">
        <CupMechanicsPrototype />
      </div>
    </div>
  );
}
