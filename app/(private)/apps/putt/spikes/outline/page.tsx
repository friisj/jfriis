"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GreenOutlineTest, type ValidationData } from "@/components/studio/putt/green-outline-test";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Spike 1c.1: Green Outline & Shape System Test Page
 *
 * Visualizes all 5 green shape families (oval, pear, kidney, peanut, boomerang)
 * with closed spline generation and SDF visualization.
 */
interface ShapeFeedback {
  shape: string;
  visible: boolean;
  approved: boolean | null;
  notes: string;
}

export default function OutlineTestPage() {
  const [validationData, setValidationData] = useState<ValidationData[]>([]);
  const [shapeFeedback, setShapeFeedback] = useState<Record<string, ShapeFeedback>>({
    oval: { shape: "oval", visible: true, approved: null, notes: "" },
    pear: { shape: "pear", visible: true, approved: null, notes: "" },
    kidney: { shape: "kidney", visible: true, approved: null, notes: "" },
    peanut: { shape: "peanut", visible: true, approved: null, notes: "" },
    boomerang: { shape: "boomerang", visible: true, approved: null, notes: "" },
  });
  const [showSDF, setShowSDF] = useState(false);

  const allPassed = validationData.length > 0 && validationData.every(d => d.areaPass && d.neckPass);

  const toggleShape = (shape: string) => {
    setShapeFeedback(prev => ({
      ...prev,
      [shape]: { ...prev[shape], visible: !prev[shape].visible }
    }));
  };

  const setApproval = (shape: string, approved: boolean) => {
    setShapeFeedback(prev => ({
      ...prev,
      [shape]: { ...prev[shape], approved }
    }));
  };

  const setNotes = (shape: string, notes: string) => {
    setShapeFeedback(prev => ({
      ...prev,
      [shape]: { ...prev[shape], notes }
    }));
  };

  const exportFeedback = () => {
    const feedbackData = validationData.map(data => ({
      ...data,
      feedback: shapeFeedback[data.shape]
    }));

    const exportData = {
      timestamp: new Date().toISOString(),
      seed: 1111,
      results: feedbackData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `green-outline-feedback-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-screen flex bg-background">
      {/* Main 3D View */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
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

        {/* Legend & Controls */}
        <div className="border-b p-3 text-sm bg-muted/50 flex items-center justify-between">
          <div className="flex gap-6 flex-wrap">
            <div>
              <span className="font-semibold">Shapes:</span> Toggle visibility in sidebar →
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSDF}
                  onChange={(e) => setShowSDF(e.target.checked)}
                  className="rounded"
                />
                <span className="font-semibold">Show SDF</span>
                <span className="text-muted-foreground text-xs">(Green=inside, Yellow=boundary, Red=outside)</span>
              </label>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {Object.values(shapeFeedback).filter(s => s.visible).length} / 5 visible
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1">
          <Canvas
            camera={{ position: [0, 25, 35], fov: 50 }}
            gl={{ antialias: true }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 5]} intensity={0.8} />

            <GreenOutlineTest
              seed={1111}
              onValidationData={setValidationData}
              visibleShapes={shapeFeedback}
              showSDF={showSDF}
            />

            <gridHelper args={[60, 60, "#444444", "#222222"]} position={[0, -0.01, 0]} />

            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              target={[0, 0, 0]}
            />
          </Canvas>
        </div>

        {/* Footer */}
        <footer className="border-t p-3 text-sm bg-card flex gap-8 flex-wrap">
          <div><span className="font-semibold">Controls:</span> Drag to rotate • Scroll to zoom • Right-click to pan</div>
          <div><span className="font-semibold">Seed:</span> 1111 (deterministic generation)</div>
          <div><span className="font-semibold">Target Area:</span> 500 m² per shape</div>
        </footer>
      </div>

      {/* Validation Panel */}
      <div className="w-96 border-l bg-card overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-2">Acceptance Criteria</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Overall Status:</span>
            {validationData.length === 0 ? (
              <Badge variant="outline">Loading...</Badge>
            ) : allPassed ? (
              <Badge className="bg-green-600">✓ All Passed</Badge>
            ) : (
              <Badge variant="destructive">✗ Some Failed</Badge>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {validationData.map((data, idx) => {
            const feedback = shapeFeedback[data.shape];
            return (
              <Card key={data.shape} className={!feedback.visible ? "opacity-50" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => toggleShape(data.shape)}
                      className="flex items-center gap-2 hover:opacity-70"
                    >
                      <div className="w-4 h-4 border-2 rounded flex items-center justify-center">
                        {feedback.visible && <span className="text-xs">✓</span>}
                      </div>
                      <CardTitle className="text-base capitalize">{data.shape}</CardTitle>
                    </button>
                    {data.areaPass && data.neckPass ? (
                      <Badge className="bg-green-600">✓ Pass</Badge>
                    ) : (
                      <Badge variant="destructive">✗ Fail</Badge>
                    )}
                  </div>

                  {/* Approve/Reject Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setApproval(data.shape, true)}
                      className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        feedback.approved === true
                          ? "bg-green-600 text-white"
                          : "bg-muted hover:bg-green-100 text-foreground"
                      }`}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => setApproval(data.shape, false)}
                      className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        feedback.approved === false
                          ? "bg-red-600 text-white"
                          : "bg-muted hover:bg-red-100 text-foreground"
                      }`}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {/* Metrics */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Area:</span>
                    <span className="font-mono">{data.targetAreaSqM.toFixed(1)} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual Area:</span>
                    <span className="font-mono">{data.actualAreaSqM.toFixed(1)} m²</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tolerance:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{(data.areaTolerance * 100).toFixed(1)}%</span>
                      {data.areaPass ? (
                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs">✓ ≤10%</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600 text-xs">✗ &gt;10%</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Min Neck Width:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{data.minNeckWidth.toFixed(2)} m</span>
                      {data.neckPass ? (
                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs">✓ ≥2m</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600 text-xs">✗ &lt;2m</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Spline Points:</span>
                    <span className="font-mono">{data.pointCount}</span>
                  </div>

                  {/* Notes field */}
                  <div className="pt-2">
                    <label className="text-xs text-muted-foreground block mb-1">Notes:</label>
                    <textarea
                      value={feedback.notes}
                      onChange={(e) => setNotes(data.shape, e.target.value)}
                      placeholder="Add comments or reasons..."
                      className="w-full px-2 py-1.5 text-xs border rounded bg-background resize-none"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Criteria Reference */}
        <div className="p-4 border-t bg-muted/50">
          <h3 className="font-semibold text-sm mb-2">Pass Criteria (per docs/green-complex.mdx)</h3>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>✓ 5 distinct shape families generated</li>
            <li>✓ Area within ±10% of target (500 m²)</li>
            <li>✓ Minimum neck width ≥ 2m (no pinch points)</li>
            <li>✓ Smooth Catmull-Rom splines (200-400 points)</li>
            <li>✓ SDF properly computed (inside/outside detection)</li>
            <li>✓ Deterministic generation (seed-based)</li>
          </ul>
        </div>

        {/* Export Feedback */}
        <div className="p-4 border-t">
          <button
            onClick={exportFeedback}
            className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 transition-colors"
          >
            📥 Export Feedback JSON
          </button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Download metrics + your feedback for iteration
          </p>
        </div>
      </div>
    </div>
  );
}
