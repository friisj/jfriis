"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useState, useMemo } from "react";
import * as THREE from "three";
import { generateUndulatedHeightfield, type UndulationConfig } from "@/lib/studio/putt/undulation";
import type { Heightfield } from "@/lib/studio/putt/green-complex-generator";

function getSlopeColor(slopePct: number): THREE.Color {
  if (slopePct < 2) {
    return new THREE.Color(0.2, 0.8, 0.2);
  } else if (slopePct < 5) {
    const t = (slopePct - 2) / 3;
    return new THREE.Color(0.2 + t * 0.8, 0.8, 0.2 - t * 0.2);
  } else if (slopePct < 8) {
    const t = (slopePct - 5) / 3;
    return new THREE.Color(1, 0.8 - t * 0.4, 0);
  } else {
    return new THREE.Color(1, 0.3, 0);
  }
}

function UndulatedTerrain({ heightfield }: { heightfield: Heightfield }) {
  const geometry = useMemo(() => {
    const { resolution, size, data } = heightfield;
    const halfSize = size / 2;

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const worldX = (x / resolution) * size - halfSize;
        const worldZ = (y / resolution) * size - halfSize;
        const height = data[y * resolution + x];

        vertices.push(worldX, height, worldZ);

        const nx =
          x > 0 && x < resolution - 1
            ? (data[y * resolution + (x - 1)] - data[y * resolution + (x + 1)]) /
              (2 * (size / resolution))
            : 0;
        const nz =
          y > 0 && y < resolution - 1
            ? (data[(y - 1) * resolution + x] - data[(y + 1) * resolution + x]) /
              (2 * (size / resolution))
            : 0;

        const normal = new THREE.Vector3(nx, 1, nz).normalize();
        normals.push(normal.x, normal.y, normal.z);

        const slope = Math.sqrt(nx * nx + nz * nz) * 100;
        const slopeColor = getSlopeColor(slope);
        colors.push(slopeColor.r, slopeColor.g, slopeColor.b);
      }
    }

    for (let y = 0; y < resolution - 1; y++) {
      for (let x = 0; x < resolution - 1; x++) {
        const i00 = y * resolution + x;
        const i10 = y * resolution + (x + 1);
        const i01 = (y + 1) * resolution + x;
        const i11 = (y + 1) * resolution + (x + 1);

        indices.push(i00, i10, i01);
        indices.push(i10, i11, i01);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);

    return geom;
  }, [heightfield]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function UndulationSystemPrototype() {
  const [seed, setSeed] = useState(42);

  const [noiseAmplitude, setNoiseAmplitude] = useState(0.08);
  const [noiseWavelength, setNoiseWavelength] = useState(6);
  const [domainWarpStrength, setDomainWarpStrength] = useState(0.4);
  const [fbmOctaves, setFbmOctaves] = useState(3);
  const [ridgeStrength, setRidgeStrength] = useState(0.3);
  const [worldScale, setWorldScale] = useState(2.0);

  const [gaussianCount, setGaussianCount] = useState(3);
  const [gaussianAmplitude, setGaussianAmplitude] = useState(0.5);
  const [gaussianSigma, setGaussianSigma] = useState(6);

  const [sineWaveCount, setSineWaveCount] = useState(2);
  const [sineAmplitude, setSineAmplitude] = useState(0.3);
  const [sineWavelength, setSineWavelength] = useState(8);

  const heightfield = useMemo(() => {
    const config: UndulationConfig = {
      noiseAmplitude,
      noiseWavelength,
      domainWarpStrength,
      fbmOctaves,
      ridgeStrength,
      worldScale,
      gaussianCount,
      gaussianAmplitude,
      gaussianSigma,
      sineWaveCount,
      sineAmplitude,
      sineWavelength,
      seed,
    };

    return generateUndulatedHeightfield(128, 40, config);
  }, [
    noiseAmplitude, noiseWavelength, domainWarpStrength, fbmOctaves,
    ridgeStrength, worldScale, gaussianCount, gaussianAmplitude,
    gaussianSigma, sineWaveCount, sineAmplitude, sineWavelength, seed,
  ]);

  const stats = useMemo(() => {
    const slopes: number[] = [];
    const { resolution, size, data } = heightfield;

    for (let y = 1; y < resolution - 1; y++) {
      for (let x = 1; x < resolution - 1; x++) {
        const idx = y * resolution + x;
        const h_xm = data[idx - 1];
        const h_xp = data[idx + 1];
        const h_ym = data[idx - resolution];
        const h_yp = data[idx + resolution];

        const cellSize = size / resolution;
        const dx = (h_xp - h_xm) / (2 * cellSize);
        const dy = (h_yp - h_ym) / (2 * cellSize);
        const slope = Math.sqrt(dx * dx + dy * dy) * 100;

        slopes.push(slope);
      }
    }

    slopes.sort((a, b) => a - b);
    const avg = slopes.reduce((sum, s) => sum + s, 0) / slopes.length;
    const max = slopes[slopes.length - 1];
    const p90 = slopes[Math.floor(slopes.length * 0.90)];

    return { avg, max, p90 };
  }, [heightfield]);

  const applyPreset = (preset: string) => {
    switch (preset) {
      case "flat":
        setNoiseAmplitude(0); setDomainWarpStrength(0); setRidgeStrength(0);
        setGaussianCount(0); setSineWaveCount(0);
        break;
      case "subtle":
        setNoiseAmplitude(0.05); setNoiseWavelength(7); setDomainWarpStrength(0.2);
        setFbmOctaves(2); setRidgeStrength(0.1); setWorldScale(1.5);
        setGaussianCount(1); setGaussianAmplitude(0.15); setGaussianSigma(8);
        setSineWaveCount(1); setSineAmplitude(0.10); setSineWavelength(10);
        break;
      case "moderate":
        setNoiseAmplitude(0.08); setNoiseWavelength(6); setDomainWarpStrength(0.4);
        setFbmOctaves(3); setRidgeStrength(0.3); setWorldScale(2.0);
        setGaussianCount(3); setGaussianAmplitude(0.40); setGaussianSigma(6);
        setSineWaveCount(2); setSineAmplitude(0.25); setSineWavelength(8);
        break;
      case "pronounced":
        setNoiseAmplitude(0.10); setNoiseWavelength(5); setDomainWarpStrength(0.5);
        setFbmOctaves(3); setRidgeStrength(0.4); setWorldScale(2.5);
        setGaussianCount(4); setGaussianAmplitude(0.70); setGaussianSigma(5);
        setSineWaveCount(2); setSineAmplitude(0.40); setSineWavelength(7);
        break;
      case "dramatic":
        setNoiseAmplitude(0.12); setNoiseWavelength(5); setDomainWarpStrength(0.6);
        setFbmOctaves(4); setRidgeStrength(0.5); setWorldScale(3.0);
        setGaussianCount(5); setGaussianAmplitude(1.0); setGaussianSigma(5);
        setSineWaveCount(3); setSineAmplitude(0.60); setSineWavelength(6);
        break;
      case "extreme":
        setNoiseAmplitude(0.15); setNoiseWavelength(4); setDomainWarpStrength(0.7);
        setFbmOctaves(4); setRidgeStrength(0.6); setWorldScale(3.0);
        setGaussianCount(6); setGaussianAmplitude(1.50); setGaussianSigma(4);
        setSineWaveCount(3); setSineAmplitude(0.80); setSineWavelength(5);
        break;
    }
  };

  return (
    <div className="h-full w-full flex bg-background">
      {/* Main 3D View */}
      <div className="flex-1 flex flex-col">
        {/* Legend */}
        <div className="border-b p-3 text-sm bg-muted/50 flex items-center justify-between">
          <div className="flex gap-6 flex-wrap">
            <div>
              <span className="font-semibold">Slope Colors:</span>
              <span className="ml-2 text-green-600">■</span> Flat (0-2%)
              <span className="ml-2 text-yellow-600">■</span> Medium (2-5%)
              <span className="ml-2 text-orange-600">■</span> Steep (5-8%)
              <span className="ml-2 text-red-600">■</span> Very Steep (&gt;8%)
            </div>
            <div>
              <span className="font-semibold">Stats:</span>
              <span className="ml-2">Avg: {stats.avg.toFixed(1)}%</span>
              <span className="ml-2">Max: {stats.max.toFixed(1)}%</span>
              <span className="ml-2">P90: {stats.p90.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1">
          <Canvas camera={{ position: [0, 25, 35], fov: 50 }} gl={{ antialias: true }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 5]} intensity={0.8} />

            <UndulatedTerrain heightfield={heightfield} />

            <OrbitControls enablePan enableZoom enableRotate target={[0, 0, 0]} />

            <gridHelper args={[60, 60, "#444444", "#222222"]} position={[0, -0.01, 0]} />
          </Canvas>
        </div>

        {/* Footer */}
        <footer className="border-t p-3 text-sm bg-card">
          <div className="flex gap-6">
            <div>
              <span className="font-semibold">Controls:</span> Drag to rotate • Scroll to zoom • Right-click to pan
            </div>
            <div>
              <span className="font-semibold">Seed:</span> {seed}
            </div>
            <div>
              <span className="font-semibold">Resolution:</span> 128x128
            </div>
          </div>
        </footer>
      </div>

      {/* Controls Panel */}
      <div className="w-96 border-l bg-card overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Seed Control */}
          <div>
            <h2 className="text-lg font-bold mb-3">Seed</h2>
            <button
              onClick={() => setSeed(Math.floor(Math.random() * 10000))}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 transition-colors"
            >
              Shuffle Seed
            </button>
            <div className="mt-2 text-sm text-muted-foreground text-center">
              Current: {seed}
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <h2 className="text-lg font-bold mb-3">Presets</h2>
            <div className="space-y-2">
              <button onClick={() => applyPreset("flat")} className="w-full px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm">
                Flat (0cm)
              </button>
              <button onClick={() => applyPreset("subtle")} className="w-full px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm">
                Subtle (gentle rolling)
              </button>
              <button onClick={() => applyPreset("moderate")} className="w-full px-3 py-2 bg-primary/20 hover:bg-primary/30 rounded text-sm font-medium">
                Moderate (natural golf)
              </button>
              <button onClick={() => applyPreset("pronounced")} className="w-full px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm">
                Pronounced (Donald Ross)
              </button>
              <button onClick={() => applyPreset("dramatic")} className="w-full px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm">
                Dramatic (links-style)
              </button>
              <button onClick={() => applyPreset("extreme")} className="w-full px-3 py-2 bg-destructive/20 hover:bg-destructive/30 rounded text-sm">
                Extreme (maximum drama)
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Moderate = Recommended default for golf-realistic rolling
            </p>
          </div>

          {/* Advanced Terrain Controls */}
          <div>
            <h2 className="text-lg font-bold mb-3">Advanced Terrain</h2>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">
                Domain Warp: {domainWarpStrength.toFixed(2)}
              </label>
              <input type="range" min="0" max="1.0" step="0.05" value={domainWarpStrength}
                onChange={(e) => setDomainWarpStrength(parseFloat(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Organic distortion (0 = none, 1 = maximum swirl)</p>
            </div>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">
                fBm Octaves: {fbmOctaves}
              </label>
              <input type="range" min="1" max="4" step="1" value={fbmOctaves}
                onChange={(e) => setFbmOctaves(parseInt(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Noise detail layers (1-4)</p>
            </div>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">
                Ridge Strength: {ridgeStrength.toFixed(2)}
              </label>
              <input type="range" min="0" max="1.0" step="0.05" value={ridgeStrength}
                onChange={(e) => setRidgeStrength(parseFloat(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Natural ridge formations (0 = none, 1 = strong)</p>
            </div>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">
                World Scale (Zoom): {worldScale.toFixed(1)}x
              </label>
              <input type="range" min="1.0" max="10.0" step="0.5" value={worldScale}
                onChange={(e) => setWorldScale(parseFloat(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Zoom level: 1x = full features, 10x = simplified relief</p>
            </div>
          </div>

          {/* Gaussian Hills/Valleys */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-bold mb-3">Gaussian Hills/Valleys</h2>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">Count: {gaussianCount}</label>
              <input type="range" min="0" max="8" step="1" value={gaussianCount}
                onChange={(e) => setGaussianCount(parseInt(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Number of peaks and valleys (0-8)</p>
            </div>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">Amplitude: {(gaussianAmplitude * 100).toFixed(0)}cm</label>
              <input type="range" min="0" max="1.5" step="0.05" value={gaussianAmplitude}
                onChange={(e) => setGaussianAmplitude(parseFloat(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Peak/valley height: 0-150cm</p>
            </div>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">Width: {gaussianSigma.toFixed(1)}m</label>
              <input type="range" min="2" max="10" step="0.5" value={gaussianSigma}
                onChange={(e) => setGaussianSigma(parseFloat(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Feature spread/width (2-10m)</p>
            </div>
          </div>

          {/* Sine Wave Parameters */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-bold mb-3">Sinusoidal Ridges</h2>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">Count: {sineWaveCount}</label>
              <input type="range" min="0" max="4" step="1" value={sineWaveCount}
                onChange={(e) => setSineWaveCount(parseInt(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Number of wave directions (0-4)</p>
            </div>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">Amplitude: {(sineAmplitude * 100).toFixed(0)}cm</label>
              <input type="range" min="0" max="0.8" step="0.05" value={sineAmplitude}
                onChange={(e) => setSineAmplitude(parseFloat(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Wave height: 0-80cm</p>
            </div>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">Wavelength: {sineWavelength.toFixed(1)}m</label>
              <input type="range" min="4" max="12" step="0.5" value={sineWavelength}
                onChange={(e) => setSineWavelength(parseFloat(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Wave spacing: 4-12m</p>
            </div>
          </div>

          {/* Noise Parameters */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-bold mb-3">Base Noise</h2>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">Amplitude: {(noiseAmplitude * 100).toFixed(1)}cm</label>
              <input type="range" min="0" max="0.10" step="0.01" value={noiseAmplitude}
                onChange={(e) => setNoiseAmplitude(parseFloat(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Subtle variation: 0-10cm</p>
            </div>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground block mb-1">Wavelength: {noiseWavelength.toFixed(1)}m</label>
              <input type="range" min="4" max="10" step="0.5" value={noiseWavelength}
                onChange={(e) => setNoiseWavelength(parseFloat(e.target.value))} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Noise scale: 4-10m</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 border border-muted-foreground/20 rounded p-3">
            <h3 className="text-sm font-semibold mb-2">Advanced Terrain Generation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Domain Warping:</strong> Distorts coordinate space before sampling,
              creating organic swirls and breaking up patterns.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              <strong>fBm (Fractional Brownian Motion):</strong> Multi-octave noise with
              lacunarity 2.17 following natural 1/f power law.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              <strong>Ridge Noise:</strong> Creates natural ridge formations using
              1 - |noise|. More organic than pure sine waves.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              <strong>World Scale (Zoom):</strong> Generates terrain up to 10x larger, then
              crops a small region. Each seed produces different crops.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
