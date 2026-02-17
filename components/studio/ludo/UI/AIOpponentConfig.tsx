'use client';

import { useState, useCallback, memo } from 'react';
import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';
import { Player, PlayerType } from '@/lib/studio/ludo/game/types';
import { AIDifficulty, AIPersonality, AISettings } from '@/lib/studio/ludo/ai/types';
import { AI_PRESETS } from '@/lib/studio/ludo/ai/players';
import { Button } from '@/components/ui/button';

const DIFFICULTY_INFO: Record<AIDifficulty, { name: string; description: string; icon: string }> = {
  [AIDifficulty.BEGINNER]: {
    name: 'Beginner',
    description: 'Forward movement focus, recognizes bear-off',
    icon: '🌱'
  },
  [AIDifficulty.EASY]: {
    name: 'Easy',
    description: 'Uses opening book, 75% good moves',
    icon: '📗'
  },
  [AIDifficulty.MEDIUM]: {
    name: 'Medium',
    description: 'Strategic play with personality',
    icon: '📘'
  },
  [AIDifficulty.HARD]: {
    name: 'Hard',
    description: '1-ply lookahead, 97% optimal',
    icon: '📕'
  },
  [AIDifficulty.EXPERT]: {
    name: 'Expert',
    description: 'Near-perfect play, advanced evaluation',
    icon: '👑'
  }
};

const PERSONALITY_INFO: Record<AIPersonality, { name: string; description: string; style: string }> = {
  [AIPersonality.BALANCED]: {
    name: 'Balanced',
    description: 'Even approach to all strategic factors',
    style: '⚖️ Well-rounded'
  },
  [AIPersonality.AGGRESSIVE]: {
    name: 'Aggressive',
    description: 'Attacks relentlessly, leaves blots',
    style: '⚔️ High risk'
  },
  [AIPersonality.DEFENSIVE]: {
    name: 'Defensive',
    description: 'Ultra-safe, builds anchors',
    style: '🛡️ Patient'
  },
  [AIPersonality.TACTICAL]: {
    name: 'Tactical',
    description: 'Master of primes and holding games',
    style: '🎯 Strategic'
  }
};

type ConfigMode = 'presets' | 'custom';

export const AIOpponentConfig = memo(function AIOpponentConfig() {
  // Game state from gameStore
  const { resetGame } = useGameStore();

  // Flow/player state from flowStore
  const { players, setAIOpponent } = useFlowStore();
  const [configMode, setConfigMode] = useState<ConfigMode>('presets');
  const [customDifficulty, setCustomDifficulty] = useState<AIDifficulty>(AIDifficulty.MEDIUM);
  const [customPersonality, setCustomPersonality] = useState<AIPersonality>(AIPersonality.BALANCED);

  const currentAI = players[Player.BLACK];

  const handlePresetSelect = useCallback((presetName: keyof typeof AI_PRESETS) => {
    setAIOpponent(presetName);
    resetGame();
  }, [setAIOpponent, resetGame]);

  const handleCustomAI = useCallback(() => {
    // Create custom AI settings
    const customSettings: AISettings = {
      difficulty: customDifficulty,
      personality: customPersonality,
      thinkingTimeMin: 800,
      thinkingTimeMax: 2000,
      name: `Custom ${DIFFICULTY_INFO[customDifficulty].name}`
    };

    // Update flowStore with custom AI
    useFlowStore.setState((state) => ({
      players: {
        ...state.players,
        [Player.BLACK]: {
          ...state.players[Player.BLACK],
          type: PlayerType.AI,
          name: customSettings.name,
          aiSettings: customSettings
        }
      }
    }));

    resetGame();
  }, [customDifficulty, customPersonality, resetGame]);

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="grid grid-cols-2 gap-2">
          <Button
            variant={configMode === 'presets' ? "default" : "outline"}
            onClick={() => setConfigMode('presets')}
            className="justify-start"
          >
            Presets
          </Button>
          <Button
            variant={configMode === 'custom' ? "default" : "outline"}
            onClick={() => setConfigMode('custom')}
            className="justify-start"
          >
            Custom
          </Button>
        </div>

      {/* Presets Mode */}
      {configMode === 'presets' && (
        <div className="grid grid-cols-1 gap-2">
              {Object.entries(AI_PRESETS).map(([key, preset]) => {
                const isSelected = currentAI.name === preset.name;
                const diffInfo = DIFFICULTY_INFO[preset.difficulty];
                const persInfo = PERSONALITY_INFO[preset.personality];

                return (
                  <Button
                    key={key}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => handlePresetSelect(key as keyof typeof AI_PRESETS)}
                    className="justify-start h-auto py-3"
                  >
                    <div className="flex flex-col items-start w-full">
                      <div className="flex items-center gap-2 w-full">
                        <span>{diffInfo.icon}</span>
                        <span className="font-semibold">{preset.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {diffInfo.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {persInfo.style}
                      </div>
                    </div>
                  </Button>
                );
              })}
        </div>
      )}

      {/* Custom Mode */}
      {configMode === 'custom' && (
        <div className="space-y-4">
            {/* Difficulty Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty Level</label>
              <div className="grid grid-cols-1 gap-2">
                {Object.values(AIDifficulty).map((difficulty) => {
                  const info = DIFFICULTY_INFO[difficulty];
                  return (
                    <Button
                      key={difficulty}
                      variant={customDifficulty === difficulty ? "default" : "outline"}
                      onClick={() => setCustomDifficulty(difficulty)}
                      className="justify-start h-auto py-2"
                    >
                      <div className="flex flex-col items-start w-full">
                        <div className="flex items-center gap-2">
                          <span>{info.icon}</span>
                          <span className="font-semibold">{info.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {info.description}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Personality Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Playing Style</label>
              <div className="grid grid-cols-1 gap-2">
                {Object.values(AIPersonality).map((personality) => {
                  const info = PERSONALITY_INFO[personality];
                  return (
                    <Button
                      key={personality}
                      variant={customPersonality === personality ? "default" : "outline"}
                      onClick={() => setCustomPersonality(personality)}
                      className="justify-start h-auto py-2"
                    >
                      <div className="flex flex-col items-start w-full">
                        <div className="flex items-center gap-2">
                          <span>{info.style.split(' ')[0]}</span>
                          <span className="font-semibold">{info.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {info.description}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Apply Button */}
            <Button
              onClick={handleCustomAI}
              className="w-full"
              size="lg"
            >
              Create Custom Opponent
            </Button>
        </div>
      )}

      {/* Current AI Info */}
      <div className="pt-3 border-t">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Opponent:</span>
              <span className="font-medium">{currentAI.name}</span>
            </div>
            {currentAI.aiSettings && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty:</span>
                  <span className="font-medium">
                    {DIFFICULTY_INFO[currentAI.aiSettings.difficulty].icon}{' '}
                    {DIFFICULTY_INFO[currentAI.aiSettings.difficulty].name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Style:</span>
                  <span className="font-medium">
                    {PERSONALITY_INFO[currentAI.aiSettings.personality].style}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
    </div>
  );
});
