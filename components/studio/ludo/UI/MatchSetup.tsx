'use client';

import { useState } from 'react';
import { MatchConfiguration, MATCH_LENGTHS } from '@/lib/studio/ludo/game/types';
import { Button } from '@/components/ui/button';

type GameTypeSelection = 'single' | 'match';

interface MatchSetupProps {
  value: MatchConfiguration & { gameType: GameTypeSelection };
  onChange: (config: MatchConfiguration & { gameType: GameTypeSelection }) => void;
}

export function MatchSetup({ value, onChange }: MatchSetupProps) {
  const [rulesOpen, setRulesOpen] = useState(false);

  const updateConfig = (updates: Partial<MatchConfiguration & { gameType: GameTypeSelection }>) => {
    onChange({ ...value, ...updates });
  };

  return (
    <div className="space-y-4">
      {/* Game Type Selection - no label */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={value.gameType === 'single' ? "default" : "outline"}
          onClick={() => updateConfig({ gameType: 'single', enabled: false })}
          className="justify-start"
        >
          Single Game
        </Button>
        <Button
          variant={value.gameType === 'match' ? "default" : "outline"}
          onClick={() => updateConfig({ gameType: 'match', enabled: true })}
          className="justify-start"
        >
          Match Play
        </Button>
      </div>

      {/* Match Length - only for Match Play */}
      {value.gameType === 'match' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Match Length</label>
          <div className="grid grid-cols-4 gap-1">
            {MATCH_LENGTHS.map(length => (
              <Button
                key={length}
                variant={value.targetPoints === length ? "default" : "outline"}
                onClick={() => updateConfig({ targetPoints: length })}
                className="text-xs py-1 h-8"
              >
                {length}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Game Config - Collapsible Disclosure */}
      <details className="space-y-2" open={rulesOpen} onToggle={(e) => setRulesOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="font-semibold text-sm cursor-pointer list-none flex items-center justify-between py-2">
          Game Config
          <svg
            className={`h-4 w-4 transition-transform ${rulesOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="space-y-3 pt-1">
          {/* Doubling Cube */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Doubling Cube</label>
              <Button
                variant={value.doublingCubeEnabled ? "default" : "outline"}
                onClick={() => updateConfig({ doublingCubeEnabled: !value.doublingCubeEnabled })}
                size="sm"
                className="h-7"
              >
                {value.doublingCubeEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Allow players to double the stakes during play
            </p>
          </div>

          {/* Jacoby Rule */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Jacoby Rule</label>
              <Button
                variant={value.useJacobyRule ? "default" : "outline"}
                onClick={() => updateConfig({ useJacobyRule: !value.useJacobyRule })}
                size="sm"
                className="h-7"
              >
                {value.useJacobyRule ? "On" : "Off"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Gammons/backgammons only count if cube is turned
            </p>
          </div>

          {/* Automatic Doubles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Automatic Doubles</label>
              <Button
                variant={value.automaticDoubles ? "default" : "outline"}
                onClick={() => updateConfig({ automaticDoubles: !value.automaticDoubles })}
                size="sm"
                className="h-7"
              >
                {value.automaticDoubles ? "On" : "Off"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Double cube value if both players roll same on opening
            </p>
          </div>

          {/* Crawford Rule - match-specific */}
          {value.gameType === 'match' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Crawford Rule</label>
                <Button
                  variant={value.useCrawfordRule ? "default" : "outline"}
                  onClick={() => updateConfig({ useCrawfordRule: !value.useCrawfordRule })}
                  size="sm"
                  className="h-7"
                >
                  {value.useCrawfordRule ? "On" : "Off"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Disable doubling when trailing player is 1 point away
              </p>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
