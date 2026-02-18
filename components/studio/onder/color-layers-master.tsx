/* eslint-disable */
// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { ColorLayer, LayerMetrics } from '@/lib/studio/onder/color-layers';
import { ColorLayerManager } from '@/lib/studio/onder/color-layer-manager';
import { ColorLayerBus } from '@/lib/studio/onder/color-layer-bus';
import { ColorLayerControl } from './color-layer-control';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ColorLayersMasterProps {
  manager: ColorLayerManager | null;
  bus: ColorLayerBus | null;
  isPlaying?: boolean;
  flowEngineState?: {
    upcomingLayers: string[];
    decayingLayers: string[];
  };
}

export function ColorLayersMaster({ manager, bus, isPlaying = false, flowEngineState }: ColorLayersMasterProps) {
  const [layers, setLayers] = useState<ColorLayer[]>(manager?.getAllLayers() || []);
  const [layerMetrics, setLayerMetrics] = useState<Map<string, LayerMetrics>>(new Map());
  const [busMetrics, setBusMetrics] = useState({ level: -60, waveform: new Float32Array(0) });

  // Update layers state when manager becomes available or changes
  useEffect(() => {
    if (!manager) return;

    // Update layers immediately when manager is available
    setLayers(manager.getAllLayers());

    const updateLayers = () => {
      setLayers(manager.getAllLayers());
    };

    // Add listeners for all layers
    const currentLayers = manager.getAllLayers();
    currentLayers.forEach(layer => {
      manager.addListener(layer.id, updateLayers);
    });

    return () => {
      // Clean up listeners
      currentLayers.forEach(layer => {
        manager.removeListener(layer.id, updateLayers);
      });
    };
  }, [manager]);

  // Update metrics periodically when playing
  useEffect(() => {
    if (!isPlaying || !manager || !bus) return;

    const metricsInterval = setInterval(() => {
      // Update individual layer metrics
      const newLayerMetrics = new Map<string, LayerMetrics>();
      layers.forEach(layer => {
        if (layer.enabled) {
          const metrics = manager.getLayerMetrics(layer.id);
          if (metrics) {
            newLayerMetrics.set(layer.id, metrics);
          }
        }
      });
      setLayerMetrics(newLayerMetrics);

      // Update bus metrics
      const newBusMetrics = bus.getBusMetrics();
      setBusMetrics(newBusMetrics);
    }, 100); // Update at 10fps

    return () => clearInterval(metricsInterval);
  }, [isPlaying, layers, manager, bus]);


  const handleLayerUpdate = (layerId: string, params: Partial<ColorLayer>) => {
    manager?.updateLayer(layerId, params);
  };

  const handleLayerTrigger = (layerId: string) => {
    manager?.triggerLayer(layerId);
  };

  return (
    <Card className="bg-black/40 backdrop-blur-lg border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white">
            Color Layers
          </CardTitle>

        </div>

        <p className="text-cyan-200 text-sm">
          Textural layers with unified bus processing
        </p>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Master Controls */}
        <div className="space-y-4">


        </div>

        {/* Individual Layer Controls */}
        <div>
          <h3 className="text-lg font-semibold text-cyan-200 mb-4">Individual Layers</h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {layers.map(layer => (
              <ColorLayerControl
                key={layer.id}
                layer={layer}
                metrics={layerMetrics.get(layer.id)}
                onUpdate={handleLayerUpdate}
                onTrigger={handleLayerTrigger}
                flowEngineState={flowEngineState}
              />
            ))}
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <h3 className="text-lg font-semibold text-cyan-200 mb-4">Quick Presets</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={() => {
                manager?.updateLayer('arpeggiator', { enabled: true, volume: 60, density: 70 });
                manager?.updateLayer('strings', { enabled: true, volume: 50, density: 60 });
              }}
              variant="outline"
              size="sm"
              className="bg-white/5 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20"
            >
              Gentle
            </Button>

            <Button
              onClick={() => {
                layers.forEach(layer => {
                  manager?.updateLayer(layer.id, {
                    enabled: true,
                    volume: 70,
                    density: 60,
                    character: 50
                  });
                });
              }}
              variant="outline"
              size="sm"
              className="bg-white/5 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20"
            >
              Full Mix
            </Button>

            <Button
              onClick={() => {
                manager?.updateLayer('sparkle', { enabled: true, volume: 40, density: 30 });
                manager?.updateLayer('whistle', { enabled: true, volume: 35, density: 25 });
                manager?.updateLayer('wash', { enabled: true, volume: 30, density: 40 });
              }}
              variant="outline"
              size="sm"
              className="bg-white/5 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20"
            >
              Ambient
            </Button>

            <Button
              onClick={() => {
                layers.forEach(layer => {
                  manager?.updateLayer(layer.id, { enabled: false });
                });
              }}
              variant="outline"
              size="sm"
              className="bg-white/5 border-red-500/30 text-red-200 hover:bg-red-500/20"
            >
              Clear All
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
