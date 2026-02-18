// @ts-nocheck
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const GreenGenerationPrototype = dynamic(
  () => import("@/components/studio/prototypes/putt/green-generation"),
  { ssr: false }
);

export default function FeaturesTestPage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="border-b p-4 flex items-center justify-between bg-card">
        <div>
          <Link href="/apps/putt/spikes" className="text-sm text-muted-foreground hover:text-foreground mr-4">
            ← Back to Spikes
          </Link>
          <h1 className="inline text-xl font-bold">
            Spike 1c.2: Surface Feature Primitives
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Composable heightfield features
        </div>
      </header>
      <div className="flex-1">
        <GreenGenerationPrototype />
      </div>
    </div>
  );
}
