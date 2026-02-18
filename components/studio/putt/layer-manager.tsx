"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

/**
 * Layer visibility configuration for 3D scene management
 */
export interface LayerConfig {
  // Core layers
  terrain: {
    visible: boolean;
    showSlopeColors: boolean;
    opacity: number;
  };
  physicsHeightfield: {
    visible: boolean;
    showDebug: boolean; // Shows wireframe, bounds, and origin markers
  };
  turfMaterial: {
    visible: boolean;
    // Stubbed for future implementation
    grassColor: string;
    bladeDensity: number;
    windAnimation: boolean;
    roughness: number;
    enablePBR: boolean;
    normalMapping: boolean;
  };
  contourLines: {
    visible: boolean;
  };
  boundaryOutline: {
    visible: boolean;
  };
  sdfGrid: {
    visible: boolean;
  };
  pinFlats: {
    visible: boolean;
  };
  startCupMarkers: {
    visible: boolean;
  };
  cup: {
    visible: boolean;
    showFlag: boolean;
    showDebugCollision: boolean;
  };
  ball: {
    visible: boolean;
    showRotationAxis: boolean;
    showVelocityVector: boolean;
    showSurfaceNormal: boolean;
  };
  gridHelper: {
    visible: boolean;
  };
}

/**
 * Default layer configuration
 */
export const defaultLayerConfig: LayerConfig = {
  terrain: {
    visible: true,
    showSlopeColors: true,
    opacity: 100,
  },
  physicsHeightfield: {
    visible: false, // Hidden by default (debug only)
    showDebug: false,
  },
  turfMaterial: {
    visible: false, // Disabled by default (not implemented yet)
    grassColor: "#2d5016",
    bladeDensity: 50,
    windAnimation: false,
    roughness: 0.8,
    enablePBR: true,
    normalMapping: false,
  },
  contourLines: {
    visible: false,
  },
  boundaryOutline: {
    visible: true,
  },
  sdfGrid: {
    visible: false,
  },
  pinFlats: {
    visible: false,
  },
  startCupMarkers: {
    visible: true,
  },
  cup: {
    visible: true,
    showFlag: true,
    showDebugCollision: false,
  },
  ball: {
    visible: true,
    showRotationAxis: false,
    showVelocityVector: false,
    showSurfaceNormal: false,
  },
  gridHelper: {
    visible: true,
  },
};

interface LayerManagerProps {
  config: LayerConfig;
  onChange: (config: LayerConfig) => void;
  surfaceSpec?: {
    tiers?: any[];
    ridges?: any[];
    swales?: any[];
    crowns?: any[];
  };
  enabledFeatures?: {
    tiers: boolean;
    ridges: boolean;
    swales: boolean;
    crowns: boolean;
  };
  metrics?: {
    avgSlope: number;
    maxSlope: number;
    pinCandidateCount: number;
    startCupDistance?: number;
    difficulty?: string;
    pathFeasible?: boolean;
    maxSlopeAlongPath?: number;
    validation?: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
  };
}

/**
 * Layer Manager Component
 *
 * Provides hierarchical visibility controls for all 3D scene elements.
 * Supports disclosure triangles for layers with subordinate options.
 */
export function LayerManager({ config, onChange, surfaceSpec, enabledFeatures, metrics }: LayerManagerProps) {
  // Track which layers are disclosed (expanded to show subordinate options)
  const [disclosed, setDisclosed] = useState<Record<string, boolean>>({
    terrain: false,
    physicsHeightfield: false,
    turfMaterial: false,
    sdfGrid: false,
    pinFlats: false,
    startCupMarkers: false,
    contourLines: false,
    cup: false,
    ball: false,
    tierDetails: false,
    ridgeDetails: false,
    swaleDetails: false,
    crownDetails: false,
  });

  const toggleDisclosure = (layer: string) => {
    setDisclosed(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const updateConfig = (path: string[], value: any) => {
    const newConfig = { ...config };
    let current: any = newConfig;

    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;
    onChange(newConfig);
  };

  return (
    <div className="space-y-1">
      {/* Terrain Layer */}
      <div>
        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
          <button
            onClick={() => toggleDisclosure('terrain')}
            className="p-0 h-4 w-4 flex items-center justify-center"
          >
            {disclosed.terrain ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <input
            type="checkbox"
            checked={config.terrain.visible}
            onChange={(e) => updateConfig(['terrain', 'visible'], e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium">Terrain (Heightfield)</span>
        </div>

        {disclosed.terrain && (
          <div className="ml-6 space-y-2 mt-2">
            <label className="flex items-center gap-2 pl-4">
              <input
                type="checkbox"
                checked={config.terrain.showSlopeColors}
                onChange={(e) => updateConfig(['terrain', 'showSlopeColors'], e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">Show slope colors</span>
            </label>
            <div className="pl-4">
              <label className="text-xs text-muted-foreground block mb-1">
                Opacity: {config.terrain.opacity}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.terrain.opacity}
                onChange={(e) => updateConfig(['terrain', 'opacity'], parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Surface Metrics */}
            {metrics && (
              <div className="pl-4 mt-3 pt-2 border-t border-border/50">
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg Slope:</span>
                    <span className="font-mono">{metrics.avgSlope.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Max Slope:</span>
                    <span className={`font-mono ${metrics.maxSlope > 8.0 ? 'text-red-500' : ''}`}>
                      {metrics.maxSlope.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pin Candidates:</span>
                    <span className="font-mono">{metrics.pinCandidateCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Terrain Features Summary */}
            {surfaceSpec && (
              <div className="pl-4 mt-2 pt-2 border-t border-border/50">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1">Active Features</div>
                <div className="space-y-1 text-[10px]">
                  {/* Tiers */}
                  {enabledFeatures?.tiers && surfaceSpec.tiers && surfaceSpec.tiers.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleDisclosure('tierDetails')}
                          className="p-0 h-3 w-3 flex items-center justify-center"
                        >
                          {disclosed.tierDetails ? (
                            <ChevronDown className="h-2 w-2" />
                          ) : (
                            <ChevronRight className="h-2 w-2" />
                          )}
                        </button>
                        <span className="text-muted-foreground">Tiers: {surfaceSpec.tiers.length}</span>
                      </div>
                      {disclosed.tierDetails && (
                        <div className="ml-4 mt-1 space-y-0.5 text-[9px] text-muted-foreground/80">
                          {surfaceSpec.tiers.map((tier: any, idx: number) => (
                            <div key={idx}>
                              • Level {tier.level.toFixed(2)}m @ ({tier.pos.x.toFixed(1)}, {tier.pos.y.toFixed(1)}), r={tier.radius.toFixed(1)}m
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ridges */}
                  {enabledFeatures?.ridges && surfaceSpec.ridges && surfaceSpec.ridges.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleDisclosure('ridgeDetails')}
                          className="p-0 h-3 w-3 flex items-center justify-center"
                        >
                          {disclosed.ridgeDetails ? (
                            <ChevronDown className="h-2 w-2" />
                          ) : (
                            <ChevronRight className="h-2 w-2" />
                          )}
                        </button>
                        <span className="text-muted-foreground">Ridges: {surfaceSpec.ridges.length}</span>
                      </div>
                      {disclosed.ridgeDetails && (
                        <div className="ml-4 mt-1 space-y-0.5 text-[9px] text-muted-foreground/80">
                          {surfaceSpec.ridges.map((ridge: any, idx: number) => (
                            <div key={idx}>
                              • Amp {ridge.amp.toFixed(2)}m, angle {ridge.angleDeg}°, σ={ridge.sigma.toFixed(1)}m
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Swales */}
                  {enabledFeatures?.swales && surfaceSpec.swales && surfaceSpec.swales.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleDisclosure('swaleDetails')}
                          className="p-0 h-3 w-3 flex items-center justify-center"
                        >
                          {disclosed.swaleDetails ? (
                            <ChevronDown className="h-2 w-2" />
                          ) : (
                            <ChevronRight className="h-2 w-2" />
                          )}
                        </button>
                        <span className="text-muted-foreground">Swales: {surfaceSpec.swales.length}</span>
                      </div>
                      {disclosed.swaleDetails && (
                        <div className="ml-4 mt-1 space-y-0.5 text-[9px] text-muted-foreground/80">
                          {surfaceSpec.swales.map((swale: any, idx: number) => (
                            <div key={idx}>
                              • Depth {Math.abs(swale.amp).toFixed(2)}m @ ({swale.pos.x.toFixed(1)}, {swale.pos.y.toFixed(1)}), σ={swale.sigma.toFixed(1)}m
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Crowns */}
                  {enabledFeatures?.crowns && surfaceSpec.crowns && surfaceSpec.crowns.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleDisclosure('crownDetails')}
                          className="p-0 h-3 w-3 flex items-center justify-center"
                        >
                          {disclosed.crownDetails ? (
                            <ChevronDown className="h-2 w-2" />
                          ) : (
                            <ChevronRight className="h-2 w-2" />
                          )}
                        </button>
                        <span className="text-muted-foreground">Crowns: {surfaceSpec.crowns.length}</span>
                      </div>
                      {disclosed.crownDetails && (
                        <div className="ml-4 mt-1 space-y-0.5 text-[9px] text-muted-foreground/80">
                          {surfaceSpec.crowns.map((crown: any, idx: number) => (
                            <div key={idx}>
                              • Amp {crown.amp.toFixed(2)}m @ ({crown.pos.x.toFixed(1)}, {crown.pos.y.toFixed(1)}), r={crown.radius.toFixed(1)}m
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Physics Heightfield Layer (Collision Mesh) */}
      <div>
        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
          <button
            onClick={() => toggleDisclosure('physicsHeightfield')}
            className="p-0 h-4 w-4 flex items-center justify-center"
          >
            {disclosed.physicsHeightfield ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <input
            type="checkbox"
            checked={config.physicsHeightfield.visible}
            onChange={(e) => updateConfig(['physicsHeightfield', 'visible'], e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium">Physics Heightfield (Collision)</span>
        </div>

        {disclosed.physicsHeightfield && (
          <div className="ml-6 space-y-2 mt-2">
            <label className="flex items-center gap-2 pl-4">
              <input
                type="checkbox"
                checked={config.physicsHeightfield.showDebug}
                onChange={(e) => updateConfig(['physicsHeightfield', 'showDebug'], e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">Show debug visualization</span>
            </label>
          </div>
        )}
      </div>

      {/* Turf Material Layer (Stubbed) */}
      <div>
        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded opacity-50">
          <button
            onClick={() => toggleDisclosure('turfMaterial')}
            className="p-0 h-4 w-4 flex items-center justify-center"
            disabled
          >
            {disclosed.turfMaterial ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <input
            type="checkbox"
            checked={config.turfMaterial.visible}
            onChange={(e) => updateConfig(['turfMaterial', 'visible'], e.target.checked)}
            className="rounded"
            disabled
          />
          <span className="text-sm font-medium">Turf Material (Grass Surface)</span>
          <span className="text-xs text-muted-foreground ml-auto">Coming soon</span>
        </div>
      </div>

      {/* Contour Lines */}
      <div>
        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
          <button
            onClick={() => toggleDisclosure('contourLines')}
            className="p-0 h-4 w-4 flex items-center justify-center"
          >
            {disclosed.contourLines ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <input
            type="checkbox"
            checked={config.contourLines.visible}
            onChange={(e) => updateConfig(['contourLines', 'visible'], e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Contour Lines</span>
        </div>

        {disclosed.contourLines && (
          <div className="ml-6 mt-2 pl-4 text-xs text-muted-foreground space-y-1">
            <div>Elevation contour lines (0.10m intervals)</div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-8 h-0.5 bg-black/70"></span>
              <span>Contour line</span>
            </div>
            <p className="pt-1 text-muted-foreground/80">
              Lines connect points of equal elevation for easy terrain reading
            </p>
          </div>
        )}
      </div>

      {/* Boundary Outline */}
      <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
        <div className="w-4" />
        <input
          type="checkbox"
          checked={config.boundaryOutline.visible}
          onChange={(e) => updateConfig(['boundaryOutline', 'visible'], e.target.checked)}
          className="rounded"
        />
        <span className="text-sm">Boundary Outline</span>
      </div>

      {/* SDF Grid */}
      <div>
        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
          <button
            onClick={() => toggleDisclosure('sdfGrid')}
            className="p-0 h-4 w-4 flex items-center justify-center"
          >
            {disclosed.sdfGrid ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <input
            type="checkbox"
            checked={config.sdfGrid.visible}
            onChange={(e) => updateConfig(['sdfGrid', 'visible'], e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">SDF Grid (debug)</span>
        </div>

        {disclosed.sdfGrid && (
          <div className="ml-6 mt-2 pl-4 text-xs text-muted-foreground space-y-1">
            <div>Signed Distance Field visualization:</div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-blue-600 rounded-full"></span>
              <span>Deep inside boundary</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-cyan-400 rounded-full"></span>
              <span>Inside</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-white border border-gray-300 rounded-full"></span>
              <span>Boundary zone</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-pink-500 rounded-full"></span>
              <span>Outside</span>
            </div>
          </div>
        )}
      </div>

      {/* Pin Flats */}
      <div>
        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
          <button
            onClick={() => toggleDisclosure('pinFlats')}
            className="p-0 h-4 w-4 flex items-center justify-center"
          >
            {disclosed.pinFlats ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <input
            type="checkbox"
            checked={config.pinFlats.visible}
            onChange={(e) => updateConfig(['pinFlats', 'visible'], e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Pin Flats</span>
        </div>

        {disclosed.pinFlats && (
          <div className="ml-6 mt-2 pl-4 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-green-500">●</span>
              <span>Excellent (&lt;1.5% slope)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-500">●</span>
              <span>Good (1.5-2.5%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">●</span>
              <span>Acceptable (2.5-3.5%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Start & Cup Markers */}
      <div>
        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
          <button
            onClick={() => toggleDisclosure('startCupMarkers')}
            className="p-0 h-4 w-4 flex items-center justify-center"
          >
            {disclosed.startCupMarkers ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <input
            type="checkbox"
            checked={config.startCupMarkers.visible}
            onChange={(e) => updateConfig(['startCupMarkers', 'visible'], e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Start &amp; Cup Markers</span>
        </div>

        {disclosed.startCupMarkers && (
          <div className="ml-6 mt-2 pl-4 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-green-500">●</span>
              <span>Start position (white ball)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">●</span>
              <span>Cup position (flag)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-500">─</span>
              <span>Path line</span>
            </div>
          </div>
        )}
      </div>

      {/* Cup Layer */}
      <div>
        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
          <button
            onClick={() => toggleDisclosure('cup')}
            className="p-0 h-4 w-4 flex items-center justify-center"
          >
            {disclosed.cup ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <input
            type="checkbox"
            checked={config.cup.visible}
            onChange={(e) => updateConfig(['cup', 'visible'], e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium">Cup (Physics)</span>
        </div>

        {disclosed.cup && (
          <div className="ml-6 space-y-2 mt-2">
            <div className="pl-4 text-xs text-muted-foreground mb-2">
              Full cup with torus rim physics and capture detection
            </div>
            <label className="flex items-center gap-2 pl-4">
              <input
                type="checkbox"
                checked={config.cup.showFlag}
                onChange={(e) => updateConfig(['cup', 'showFlag'], e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">Show flag</span>
            </label>
            <label className="flex items-center gap-2 pl-4">
              <input
                type="checkbox"
                checked={config.cup.showDebugCollision}
                onChange={(e) => updateConfig(['cup', 'showDebugCollision'], e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">Show debug collision bodies</span>
            </label>

            {/* Cup Metrics */}
            {metrics?.startCupDistance && (
              <div className="pl-4 mt-3 pt-2 border-t border-border/50">
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Distance:</span>
                    <span className="font-mono">{metrics.startCupDistance.toFixed(1)}m</span>
                  </div>
                  {metrics.difficulty && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Difficulty:</span>
                      <span className="font-mono">{metrics.difficulty}</span>
                    </div>
                  )}
                  {metrics.pathFeasible !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Path:</span>
                      <span className={metrics.pathFeasible ? '' : 'text-red-500'}>
                        {metrics.pathFeasible ? '✓ Feasible' : '✗ Blocked'}
                      </span>
                    </div>
                  )}
                  {metrics.maxSlopeAlongPath !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Max Path Slope:</span>
                      <span className="font-mono">{metrics.maxSlopeAlongPath.toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {/* Validation */}
                {metrics.validation && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Validation:</span>
                      <span className={metrics.validation.isValid ? 'text-green-500' : 'text-red-500'}>
                        {metrics.validation.isValid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </div>
                    {(metrics.validation.errors.length > 0 || metrics.validation.warnings.length > 0) && (
                      <div className="mt-1 text-[9px] space-y-0.5">
                        {metrics.validation.errors.slice(0, 2).map((err, idx) => (
                          <div key={idx} className="text-red-500">• {err}</div>
                        ))}
                        {metrics.validation.warnings.slice(0, 2).map((warn, idx) => (
                          <div key={idx} className="text-yellow-500">• {warn}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ball Layer */}
      <div>
        <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
          <button
            onClick={() => toggleDisclosure('ball')}
            className="p-0 h-4 w-4 flex items-center justify-center"
          >
            {disclosed.ball ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <input
            type="checkbox"
            checked={config.ball.visible}
            onChange={(e) => updateConfig(['ball', 'visible'], e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium">Ball (Physics)</span>
        </div>

        {disclosed.ball && (
          <div className="ml-6 space-y-2 mt-2">
            <label className="flex items-center gap-2 pl-4">
              <input
                type="checkbox"
                checked={config.ball.showRotationAxis}
                onChange={(e) => updateConfig(['ball', 'showRotationAxis'], e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">Show rotation axis</span>
            </label>
            <label className="flex items-center gap-2 pl-4">
              <input
                type="checkbox"
                checked={config.ball.showVelocityVector}
                onChange={(e) => updateConfig(['ball', 'showVelocityVector'], e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">Show velocity vector</span>
            </label>
            <label className="flex items-center gap-2 pl-4">
              <input
                type="checkbox"
                checked={config.ball.showSurfaceNormal}
                onChange={(e) => updateConfig(['ball', 'showSurfaceNormal'], e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">Show surface normal</span>
            </label>
          </div>
        )}
      </div>

      {/* Grid Helper */}
      <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
        <div className="w-4" />
        <input
          type="checkbox"
          checked={config.gridHelper.visible}
          onChange={(e) => updateConfig(['gridHelper', 'visible'], e.target.checked)}
          className="rounded"
        />
        <span className="text-sm">Grid Helper</span>
      </div>
    </div>
  );
}
