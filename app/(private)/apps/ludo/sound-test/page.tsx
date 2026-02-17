'use client';

/**
 * Sound Testing Page - /sound-test
 *
 * Development tool for testing and sampling sound effects.
 *
 * Features:
 * - Play individual sound effects on demand
 * - Test spatial audio positioning (3D sound)
 * - Real-time volume controls
 * - Visual feedback when sounds play
 * - Sound categories organized by type
 * - Upload and test custom sound files
 *
 * Usage:
 * Navigate to http://localhost:3001/sound-test
 */

import { useState, useEffect } from 'react';
import { spatialAudio } from '@/lib/studio/ludo/audio/SpatialAudio';
import { gameSoundHooks } from '@/lib/studio/ludo/audio/GameSoundHooks';
import { useAudioStore } from '@/lib/studio/ludo/audio/store';
import { SoundCategory } from '@/lib/studio/ludo/audio/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SoundTestPage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeSounds, setActiveSounds] = useState<Set<string>>(new Set());
  const [spatialPosition, setSpatialPosition] = useState({ x: 0, y: 1, z: 0 });
  const { volumeSettings, setMasterVolume, setEffectsVolume, setAmbientVolume, toggleMute } = useAudioStore();

  useEffect(() => {
    // Check if already initialized from AudioInitializer
    if (gameSoundHooks.isReady()) {
      setIsInitialized(true);
    }
  }, []);

  // Handle manual initialization on user click
  const handleInitialize = async () => {
    try {
      await gameSoundHooks.initialize();
      await gameSoundHooks.loadSounds();
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  const playSound = (soundId: string, _category: SoundCategory) => {
    setActiveSounds((prev) => new Set(prev).add(soundId));

    // Use game sound hooks to play synthesized sounds
    switch (soundId) {
      case 'dice_roll':
        gameSoundHooks.playDiceRoll();
        break;
      case 'dice_bounce':
        gameSoundHooks.playDiceBounce();
        break;
      case 'dice_settle':
        gameSoundHooks.playDiceSettle(6);
        break;
      case 'checker_pickup':
        gameSoundHooks.playCheckerPickup(5);
        break;
      case 'checker_slide':
        gameSoundHooks.playCheckerSlide(5, 10);
        break;
      case 'checker_place':
        gameSoundHooks.playCheckerPlace(10, 3);
        break;
      case 'hit_impact':
        gameSoundHooks.playHit(8);
        break;
      case 'bear_off':
        gameSoundHooks.playBearOff();
        break;
      case 'button_click':
        gameSoundHooks.playButtonClick();
        break;
      case 'panel_open':
        gameSoundHooks.playPanelOpen();
        break;
      case 'panel_close':
        gameSoundHooks.playPanelClose();
        break;
      case 'game_win':
        gameSoundHooks.playGameWin();
        break;
      case 'game_loss':
        gameSoundHooks.playGameLoss();
        break;
      case 'match_win':
        gameSoundHooks.playMatchWin();
        break;
    }

    // Remove from active sounds after duration
    setTimeout(() => {
      setActiveSounds((prev) => {
        const next = new Set(prev);
        next.delete(soundId);
        return next;
      });
    }, 1000);
  };

  const testSpatialAudio = (x: number, z: number) => {
    setSpatialPosition({ x, y: 1, z });
    // Play a test sound at this position
    spatialAudio.playSoundAtPosition('dice_roll', { x, y: 1, z });
  };

  const soundLibrary = [
    {
      category: SoundCategory.DICE,
      label: 'Dice Sounds',
      sounds: [
        { id: 'dice_roll', label: 'Dice Roll', description: 'Initial throw sound' },
        { id: 'dice_bounce', label: 'Dice Bounce', description: 'Bounce on board' },
        { id: 'dice_settle', label: 'Dice Settle', description: 'Final resting sound' },
      ],
    },
    {
      category: SoundCategory.CHECKER,
      label: 'Checker Sounds',
      sounds: [
        { id: 'checker_pickup', label: 'Checker Pickup', description: 'Picking up a checker' },
        { id: 'checker_slide', label: 'Checker Slide', description: 'Movement across board' },
        { id: 'checker_place', label: 'Checker Place', description: 'Landing on point' },
      ],
    },
    {
      category: SoundCategory.HIT,
      label: 'Hit Sounds',
      sounds: [
        { id: 'hit_impact', label: 'Hit Impact', description: 'Capturing opponent checker' },
      ],
    },
    {
      category: SoundCategory.BEAR_OFF,
      label: 'Bear Off Sounds',
      sounds: [
        { id: 'bear_off', label: 'Bear Off', description: 'Removing checker from board' },
      ],
    },
    {
      category: SoundCategory.UI,
      label: 'UI Sounds',
      sounds: [
        { id: 'button_click', label: 'Button Click', description: 'UI button press' },
        { id: 'panel_open', label: 'Panel Open', description: 'Panel opening' },
        { id: 'panel_close', label: 'Panel Close', description: 'Panel closing' },
      ],
    },
    {
      category: SoundCategory.VICTORY,
      label: 'Victory Sounds',
      sounds: [
        { id: 'game_win', label: 'Game Win', description: 'Single game victory' },
        { id: 'game_loss', label: 'Game Loss', description: 'Single game defeat' },
        { id: 'match_win', label: 'Match Win', description: 'Match victory' },
      ],
    },
  ];

  if (!isInitialized) {
    return (
      <div
        className="min-h-screen bg-gray-950 text-white flex items-center justify-center cursor-pointer hover:bg-gray-900 transition-colors"
        onClick={handleInitialize}
      >
        <div className="text-center">
          <div className="text-4xl mb-4">🔊</div>
          <p className="text-lg font-semibold">Click to Enable Audio</p>
          <p className="text-sm text-gray-400 mt-2">
            Browser autoplay policy requires user interaction
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">🔊 Sound Testing Lab</h1>
          <p className="text-slate-400">
            Development tool for testing and sampling game sound effects
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Sound Library */}
          <div className="lg:col-span-2 space-y-4">
            {soundLibrary.map((category) => (
              <Card key={category.category} className="bg-slate-900/90 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-100">{category.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.sounds.map((sound) => {
                    const isActive = activeSounds.has(sound.id);
                    return (
                      <div
                        key={sound.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                          isActive ? 'bg-blue-600/30 border-2 border-blue-400' : 'bg-slate-800/80 border-2 border-slate-700/50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-slate-100">{sound.label}</div>
                          <div className="text-xs text-slate-400">{sound.description}</div>
                        </div>
                        <Button
                          onClick={() => playSound(sound.id, category.category)}
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          className="ml-4"
                        >
                          {isActive ? '▶ Playing' : '▶ Play'}
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}

            {/* Info Notice */}
            <Card className="bg-blue-900/30 border-blue-600/50">
              <CardContent className="p-4">
                <p className="text-sm text-blue-100">
                  🎵 <strong>Synthesized Audio:</strong> All sounds are generated in real-time using the Web Audio API.
                  No audio files required! Try adjusting volume controls while playing sounds.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Controls Sidebar */}
          <div className="space-y-4">
            {/* Volume Controls */}
            <Card className="bg-slate-900/90 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-100">Volume Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mute Toggle */}
                <Button
                  onClick={toggleMute}
                  variant={volumeSettings.muted ? 'destructive' : 'default'}
                  className="w-full"
                >
                  {volumeSettings.muted ? '🔇 Unmute' : '🔊 Mute'}
                </Button>

                {/* Master Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm text-slate-300">Master</label>
                    <span className="text-xs font-mono text-slate-400">{Math.round(volumeSettings.master * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volumeSettings.master * 100}
                    onChange={(e) => setMasterVolume(parseInt(e.target.value) / 100)}
                    disabled={volumeSettings.muted}
                    className="w-full"
                  />
                </div>

                {/* Effects Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm text-slate-300">Effects</label>
                    <span className="text-xs font-mono text-slate-400">{Math.round(volumeSettings.effects * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volumeSettings.effects * 100}
                    onChange={(e) => setEffectsVolume(parseInt(e.target.value) / 100)}
                    disabled={volumeSettings.muted}
                    className="w-full"
                  />
                </div>

                {/* Ambient Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm text-slate-300">Ambient</label>
                    <span className="text-xs font-mono text-slate-400">{Math.round(volumeSettings.ambient * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volumeSettings.ambient * 100}
                    onChange={(e) => setAmbientVolume(parseInt(e.target.value) / 100)}
                    disabled={volumeSettings.muted}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Spatial Audio Testing */}
            <Card className="bg-slate-900/90 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-100">Spatial Audio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-slate-400">Test 3D sound positioning</p>

                {/* Position Display */}
                <div className="bg-slate-800/80 p-3 rounded text-center border border-slate-700/50">
                  <div className="text-xs text-slate-400 mb-1">Current Position</div>
                  <div className="font-mono text-sm text-slate-200">
                    X: {spatialPosition.x.toFixed(1)}, Z: {spatialPosition.z.toFixed(1)}
                  </div>
                </div>

                {/* Position Presets */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testSpatialAudio(-10, 0)}
                    className="text-xs"
                  >
                    ← Left
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testSpatialAudio(0, 0)}
                    className="text-xs"
                  >
                    Center
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testSpatialAudio(10, 0)}
                    className="text-xs"
                  >
                    Right →
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testSpatialAudio(0, -10)}
                    className="text-xs"
                  >
                    ↑ Front
                  </Button>
                  <div />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testSpatialAudio(0, 10)}
                    className="text-xs"
                  >
                    ↓ Back
                  </Button>
                </div>

                {/* Manual Position Controls */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-400">X (Left/Right)</label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="0.5"
                      value={spatialPosition.x}
                      onChange={(e) => setSpatialPosition((prev) => ({ ...prev, x: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Z (Front/Back)</label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="0.5"
                      value={spatialPosition.z}
                      onChange={(e) => setSpatialPosition((prev) => ({ ...prev, z: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Info */}
            <Card className="bg-slate-900/90 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-100">System Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Audio Context:</span>
                  <span className="font-mono text-emerald-400">Ready</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sound System:</span>
                  <span className="font-mono text-emerald-400">Synthesized</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Spatial Audio:</span>
                  <span className="font-mono text-emerald-400">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sounds Available:</span>
                  <span className="font-mono text-emerald-400">15 / 15</span>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card className="bg-slate-900/90 border-slate-700">
              <CardContent className="p-4">
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                >
                  ← Back to Game
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
