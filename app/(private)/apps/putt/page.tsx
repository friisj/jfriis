import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">Putt</h1>
        <p className="text-xl text-muted-foreground">
          A 3D golf putting game built with Next.js and Three.js
        </p>
        <div className="pt-4">
          <Link
            href="/apps/putt/spikes"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            View Development Spikes →
          </Link>
        </div>
      </div>
    </main>
  );
}
