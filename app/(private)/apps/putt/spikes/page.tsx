import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SpikeStatus = "complete" | "in-progress" | "planned";

interface Spike {
  id: string;
  title: string;
  description: string;
  route: string | null;
  status: SpikeStatus;
}

const spikes: Spike[] = [
  {
    id: "1a",
    title: "Core Physics (Green + Ball)",
    description: "Heightmap-based green generation with ball physics, gravity, drag, and rotation",
    route: "/spikes/physics",
    status: "complete",
  },
  {
    id: "1b",
    title: "Ball Roll Optimization",
    description: "Ball physics integrated with Spike 1c green complexes - rotation testing on realistic terrain with debug visualizations",
    route: "/spikes/features",
    status: "complete",
  },
  {
    id: "1b.2",
    title: "Basic Physics Validation",
    description: "Simple plane with adjustable slope for validating core ball physics and terrain response before complex terrain",
    route: "/spikes/physics-basic",
    status: "complete",
  },
  {
    id: "1b.3",
    title: "Cannon.js Physics Integration",
    description: "Ball physics using Cannon.js physics engine with heightfield terrain collision",
    route: "/spikes/physics-cannon",
    status: "complete",
  },
  {
    id: "1b.4",
    title: "Custom 3D Gravity (Experimental)",
    description: "Manual 3D gravity implementation attempt - preserved for reference",
    route: "/spikes/physics-3d-manual",
    status: "in-progress",
  },
  {
    id: "1b.5",
    title: "Green Speed & Friction (Stimpmeter)",
    description: "Calibration tool for green speed using stimpmeter rating system with roll-out distance measurement",
    route: "/spikes/green-speed-calibration",
    status: "complete",
  },
  {
    id: "1c.1",
    title: "Green Outline & Shape System",
    description: "5 shape families (oval, pear, kidney, peanut, boomerang) with Catmull-Rom splines and SDF",
    route: "/spikes/outline",
    status: "complete",
  },
  {
    id: "1c.2",
    title: "Surface Feature Primitives",
    description: "Tiers, ridges, swales, crowns, false fronts with composable height functions",
    route: "/spikes/features",
    status: "complete",
  },
  {
    id: "1c.3",
    title: "Constraints & Smoothing",
    description: "Gradient clamping, pinable flats detection, Laplacian smoothing",
    route: "/spikes/features",
    status: "complete",
  },
  {
    id: "1c.4",
    title: "Strategic Placement & Playability",
    description: "Start/cup placement, difficulty classification, path feasibility",
    route: "/spikes/features",
    status: "complete",
  },
  {
    id: "1c.5",
    title: "Validation & Dev Tools",
    description: "Contours, heatmaps, pin flats overlays, determinism verification",
    route: "/spikes/features",
    status: "complete",
  },
  {
    id: "1c.6",
    title: "Base Undulation (Research)",
    description: "Rolling terrain foundation layer using multi-octave simplex noise - parameter exploration for golf-realistic undulation (5-30cm amplitude, 3-10m wavelength)",
    route: "/spikes/undulation",
    status: "complete",
  },
  {
    id: "2",
    title: "Cup Mechanics",
    description: "Ball capture detection and rim physics (lip-out) - standard 108mm cup with velocity-based capture threshold",
    route: "/spikes/cup-mechanics",
    status: "complete",
  },
  {
    id: "2.5",
    title: "Cup-Green Complex Integration",
    description: "Cup integration with generated green complexes, terrain alignment, and collision handoff",
    route: "/spikes/features",
    status: "complete",
  },
  {
    id: "2.6",
    title: "Flag State Management",
    description: "Flagstick in/out/auto modes with distance-based removal and user preferences",
    route: null,
    status: "planned",
  },
  {
    id: "2.7",
    title: "Turf Layer with Cup Hole",
    description: "Visual grass surface layer with hole cutout at cup position, separate from terrain mesh",
    route: null,
    status: "planned",
  },
  {
    id: "3.1",
    title: "Aiming Interface",
    description: "Line/arc preview, power indicator, touch/mouse controls with visual feedback",
    route: null,
    status: "planned",
  },
  {
    id: "3.2",
    title: "Power Control",
    description: "Gesture-based power input, velocity mapping, visual/haptic feedback",
    route: null,
    status: "planned",
  },
  {
    id: "3.3",
    title: "Read Visualization",
    description: "Break preview lines, slope indicators, optional grid overlay for green reading",
    route: null,
    status: "planned",
  },
  {
    id: "3.4",
    title: "Control Schemes",
    description: "Multiple input methods - drag, tap-tap, press-hold with configuration options",
    route: null,
    status: "planned",
  },
  {
    id: "3.5",
    title: "Execution Variance & Practice",
    description: "Realistic input variance simulation with progression system that rewards daily practice",
    route: null,
    status: "planned",
  },
  {
    id: "4.1",
    title: "Stroke Counting",
    description: "Accurate stroke tracking, par system, scoring relative to par",
    route: null,
    status: "planned",
  },
  {
    id: "4.2",
    title: "Success/Failure States",
    description: "Made putt celebration, missed putt feedback, completion conditions",
    route: null,
    status: "planned",
  },
  {
    id: "4.3",
    title: "Session Management",
    description: "Daily challenge system, practice modes, statistics tracking",
    route: null,
    status: "planned",
  },
  {
    id: "4.4",
    title: "Progression System",
    description: "Skill rating, achievement system, unlockables, leaderboards",
    route: null,
    status: "planned",
  },
  {
    id: "5.1",
    title: "Camera System",
    description: "Dynamic camera angles, smooth transitions, player-controlled views",
    route: null,
    status: "planned",
  },
  {
    id: "5.2",
    title: "Visual Effects",
    description: "Ball trails, particle effects, environmental atmosphere",
    route: null,
    status: "planned",
  },
  {
    id: "5.3",
    title: "Audio Design",
    description: "Sound effects for ball roll, cup drop, ambient sounds, feedback audio",
    route: null,
    status: "planned",
  },
  {
    id: "6.1",
    title: "Mobile Optimization",
    description: "Touch controls, responsive design, performance optimization for mobile devices",
    route: null,
    status: "planned",
  },
  {
    id: "6.2",
    title: "Settings & Configuration",
    description: "User preferences, quality settings, control customization",
    route: null,
    status: "planned",
  },
  {
    id: "6.3",
    title: "Tutorial & Onboarding",
    description: "Interactive tutorial, control hints, green-reading assistance for new players",
    route: null,
    status: "planned",
  },
];

function getStatusBadge(status: SpikeStatus) {
  switch (status) {
    case "complete":
      return <Badge variant="default" className="bg-green-600">Complete</Badge>;
    case "in-progress":
      return <Badge variant="secondary" className="bg-yellow-600">In Progress</Badge>;
    case "planned":
      return <Badge variant="outline">Planned</Badge>;
  }
}

export default function SpikesPage() {
  // Calculate stats
  const completedCount = spikes.filter(s => s.status === "complete").length;
  const inProgressCount = spikes.filter(s => s.status === "in-progress").length;
  const plannedCount = spikes.filter(s => s.status === "planned").length;
  const totalCount = spikes.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/apps/putt" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-2">Development Spikes</h1>
        <p className="text-muted-foreground">
          Discrete test pages for each implementation spike. Use these for independent review, debugging, and validation.
        </p>
      </div>

      {/* Progress Summary */}
      <div className="mb-8 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Overall Progress</h2>
          <span className="text-2xl font-bold">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-600">Complete</Badge>
            <span className="font-medium">{completedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-yellow-600">In Progress</Badge>
            <span className="font-medium">{inProgressCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Planned</Badge>
            <span className="font-medium">{plannedCount}</span>
          </div>
        </div>
      </div>

      {/* Spike Categories */}
      <div className="space-y-8">
        {/* Physics & Green Generation (Spike 1.x) */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Physics & Green Generation</h2>
          <div className="grid gap-4">
            {spikes.filter(s => s.id.startsWith("1")).map((spike) => (
              <Card key={spike.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          Spike {spike.id}
                        </span>
                        {getStatusBadge(spike.status)}
                      </div>
                      <CardTitle className="text-xl mb-1">{spike.title}</CardTitle>
                      <CardDescription>{spike.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {spike.route ? (
                    <Link
                      href={spike.route}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                      View Spike →
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                    >
                      Not yet implemented
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cup Mechanics (Spike 2.x) */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Cup Mechanics</h2>
          <div className="grid gap-4">
            {spikes.filter(s => s.id.startsWith("2")).map((spike) => (
              <Card key={spike.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          Spike {spike.id}
                        </span>
                        {getStatusBadge(spike.status)}
                      </div>
                      <CardTitle className="text-xl mb-1">{spike.title}</CardTitle>
                      <CardDescription>{spike.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {spike.route ? (
                    <Link
                      href={spike.route}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                      View Spike →
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                    >
                      Not yet implemented
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Input Controls (Spike 3.x) */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Input Controls</h2>
          <div className="grid gap-4">
            {spikes.filter(s => s.id.startsWith("3")).map((spike) => (
              <Card key={spike.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          Spike {spike.id}
                        </span>
                        {getStatusBadge(spike.status)}
                      </div>
                      <CardTitle className="text-xl mb-1">{spike.title}</CardTitle>
                      <CardDescription>{spike.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {spike.route ? (
                    <Link
                      href={spike.route}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                      View Spike →
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                    >
                      Not yet implemented
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Game States & Scoring (Spike 4.x) */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Game States & Scoring</h2>
          <div className="grid gap-4">
            {spikes.filter(s => s.id.startsWith("4")).map((spike) => (
              <Card key={spike.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          Spike {spike.id}
                        </span>
                        {getStatusBadge(spike.status)}
                      </div>
                      <CardTitle className="text-xl mb-1">{spike.title}</CardTitle>
                      <CardDescription>{spike.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {spike.route ? (
                    <Link
                      href={spike.route}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                      View Spike →
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                    >
                      Not yet implemented
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Polish & Production (Spike 5.x & 6.x) */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Polish & Production</h2>
          <div className="grid gap-4">
            {spikes.filter(s => s.id.startsWith("5") || s.id.startsWith("6")).map((spike) => (
              <Card key={spike.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          Spike {spike.id}
                        </span>
                        {getStatusBadge(spike.status)}
                      </div>
                      <CardTitle className="text-xl mb-1">{spike.title}</CardTitle>
                      <CardDescription>{spike.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {spike.route ? (
                    <Link
                      href={spike.route}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                      View Spike →
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                    >
                      Not yet implemented
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="mt-12 pt-8 border-t">
        <h3 className="text-lg font-semibold mb-4">Documentation</h3>
        <div className="space-y-2 text-sm">
          <div>
            <a href="/docs/start-prd.mdx" className="text-primary hover:underline">
              Product Requirements Document (PRD)
            </a>
          </div>
          <div>
            <a href="/docs/roadmap.md" className="text-primary hover:underline">
              Implementation Roadmap
            </a>
          </div>
          <div>
            <a href="/docs/green-complex.mdx" className="text-primary hover:underline">
              Green Complex Specification
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
