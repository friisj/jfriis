// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { ColorLayer, LayerMetrics } from '@/lib/studio/onder/color-layers';
import { ColorLayerManager } from '@/lib/studio/onder/color-layer-manager';
import { ColorLayerBus } from '@/lib/studio/onder/color-layer-bus';
import { ColorLayerControl } from './color-layer-control';
import { VinylCrackleControl } from './vinyl-crackle-control';
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
  // Vinyl crackle props
  vinylEnabled?: boolean;
  vinylAmount?: number;
  onVinylToggle?: () => void;
  onVinylAmountChange?: (value: number) => void;
}

export function ColorLayersMaster({
  manager,
  bus,
  isPlaying = false,
  flowEngineState,
  vinylEnabled = false,
  vinylAmount = 50,
  onVinylToggle,
  onVinylAmountChange
}: ColorLayersMasterProps) {
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

  const handleRandomize = () => {
    if (!manager) return;

    console.log('🎲 Randomizing all color layer parameters');

    layers.forEach(layer => {
      const updates: Partial<ColorLayer> = {
        density: Math.floor(Math.random() * 101), // 0-100
      };

      // Add character randomization for layers that have it
      if (layer.id !== 'sparkle' && layer.id !== 'whistle' && layer.id !== 'wash') {
        updates.character = Math.floor(Math.random() * 101);
      }

      // Add panning randomization for wash layer
      if (layer.id === 'wash') {
        updates.panSpeed = Math.floor(Math.random() * 101);
        updates.panDepth = 70 + Math.floor(Math.random() * 31); // 70-100% for more width
      }

      manager.updateLayer(layer.id, updates);
    });

    // Also randomize vinyl frequency if callbacks are provided
    if (onVinylAmountChange) {
      onVinylAmountChange(Math.floor(Math.random() * 101));
    }
  };

  return (
    <Card className="bg-black/40 backdrop-blur-lg border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white">
            Color Layers
          </CardTitle>
          <Button
            onClick={handleRandomize}
            variant="outline"
            size="sm"
            className="bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30 text-purple-200"
          >
            🎲 Randomize
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Layer Controls */}
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

            {/* Vinyl Crackle Control */}
            {onVinylToggle && onVinylAmountChange && (
              <VinylCrackleControl
                enabled={vinylEnabled}
                amount={vinylAmount}
                onToggle={onVinylToggle}
                onAmountChange={onVinylAmountChange}
              />
            )}
        </div>
      </CardContent>
    </Card>
  );
}