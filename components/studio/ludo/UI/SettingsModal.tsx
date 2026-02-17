'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/studio/ludo/settings/store';
import { useAudioStore } from '@/lib/studio/ludo/audio/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/studio/ludo/ThemeSwitcher/ThemeSwitcher';

export function SettingsModal() {
  const { isSettingsOpen, closeSettings } = useSettingsStore();
  const {
    volumeSettings,
    setMasterVolume,
    setEffectsVolume,
    setAmbientVolume,
    toggleMute,
  } = useAudioStore();

  if (!isSettingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={closeSettings}
    >
      <Card
        className="w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>⚙️ Settings</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeSettings}
              className="h-8 w-8 p-0"
            >
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Visual Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">🎨 Visuals</h3>

            {/* Theme Selector */}
            <ThemeSwitcher />
            <p className="text-xs text-muted-foreground">
              Choose your preferred board and checker style. Use Shift+T to open the Theme Builder.
            </p>
          </div>

          {/* Audio Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">🔊 Audio</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="h-8 px-3"
              >
                {volumeSettings.muted ? '🔇 Muted' : '🔊 Unmuted'}
              </Button>
            </div>

            {/* Master Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Master Volume</label>
                <span className="text-xs text-muted-foreground font-mono">
                  {Math.round(volumeSettings.master * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volumeSettings.master * 100}
                onChange={(e) => setMasterVolume(parseInt(e.target.value) / 100)}
                disabled={volumeSettings.muted}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Effects Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Effects Volume</label>
                <span className="text-xs text-muted-foreground font-mono">
                  {Math.round(volumeSettings.effects * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volumeSettings.effects * 100}
                onChange={(e) => setEffectsVolume(parseInt(e.target.value) / 100)}
                disabled={volumeSettings.muted}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Dice, checker moves, hits, bear off
              </p>
            </div>

            {/* Ambient Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Ambient Soundscape</label>
                <span className="text-xs text-muted-foreground font-mono">
                  {Math.round(volumeSettings.ambient * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volumeSettings.ambient * 100}
                onChange={(e) => setAmbientVolume(parseInt(e.target.value) / 100)}
                disabled={volumeSettings.muted}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Procedural harmonic soundscape that responds to gameplay
              </p>
              {volumeSettings.ambient === 0 && !volumeSettings.muted && (
                <p className="text-xs text-amber-500 italic">
                  Set volume above 0 to enable ambient soundscape
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 opacity-50">
            <h3 className="text-sm font-semibold text-foreground">⚡ Performance</h3>
            <p className="text-xs text-muted-foreground italic">
              Performance presets coming in Phase 5
            </p>
          </div>

          {/* Close Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={closeSettings}
              variant="default"
              className="w-full"
            >
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
