'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { PadEffects } from '@/lib/types/sampler';

interface EffectsChainProps {
  effects: PadEffects;
  onChange: (effects: PadEffects) => void;
}

export function EffectsChain({ effects, onChange }: EffectsChainProps) {
  function update(partial: Partial<PadEffects>) {
    onChange({ ...effects, ...partial });
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Effects</h4>

      {/* Volume */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <Label>Volume</Label>
          <span className="text-muted-foreground">{Math.round(effects.volume * 100)}%</span>
        </div>
        <Slider
          value={[effects.volume]}
          onValueChange={([v]) => update({ volume: v })}
          min={0}
          max={1}
          step={0.01}
        />
      </div>

      {/* Pitch */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <Label>Pitch</Label>
          <span className="text-muted-foreground">{effects.pitch > 0 ? '+' : ''}{effects.pitch} st</span>
        </div>
        <Slider
          value={[effects.pitch]}
          onValueChange={([v]) => update({ pitch: v })}
          min={-24}
          max={24}
          step={1}
        />
      </div>

      {/* Reverb */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reverb</h5>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>Wet</Label>
            <span className="text-muted-foreground">{Math.round((effects.reverb?.wet ?? 0) * 100)}%</span>
          </div>
          <Slider
            value={[effects.reverb?.wet ?? 0]}
            onValueChange={([v]) =>
              update({ reverb: { ...effects.reverb, wet: v, decay: effects.reverb?.decay ?? 1.5 } })
            }
            min={0}
            max={1}
            step={0.01}
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>Decay</Label>
            <span className="text-muted-foreground">{(effects.reverb?.decay ?? 1.5).toFixed(1)}s</span>
          </div>
          <Slider
            value={[effects.reverb?.decay ?? 1.5]}
            onValueChange={([v]) =>
              update({ reverb: { ...effects.reverb, decay: v, wet: effects.reverb?.wet ?? 0 } })
            }
            min={0.1}
            max={5}
            step={0.1}
          />
        </div>
      </div>

      {/* EQ */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">EQ</h5>
        {(['low', 'mid', 'high'] as const).map((band) => (
          <div key={band} className="space-y-1">
            <div className="flex justify-between text-xs">
              <Label className="capitalize">{band}</Label>
              <span className="text-muted-foreground">{effects.eq?.[band] ?? 0} dB</span>
            </div>
            <Slider
              value={[effects.eq?.[band] ?? 0]}
              onValueChange={([v]) =>
                update({
                  eq: {
                    low: effects.eq?.low ?? 0,
                    mid: effects.eq?.mid ?? 0,
                    high: effects.eq?.high ?? 0,
                    [band]: v,
                  },
                })
              }
              min={-12}
              max={12}
              step={0.5}
            />
          </div>
        ))}
      </div>

      {/* Delay */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delay</h5>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>Time</Label>
            <span className="text-muted-foreground">{(effects.delay?.time ?? 0.25).toFixed(2)}s</span>
          </div>
          <Slider
            value={[effects.delay?.time ?? 0.25]}
            onValueChange={([v]) =>
              update({
                delay: {
                  ...effects.delay,
                  time: v,
                  feedback: effects.delay?.feedback ?? 0,
                  wet: effects.delay?.wet ?? 0,
                },
              })
            }
            min={0.01}
            max={2}
            step={0.01}
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>Feedback</Label>
            <span className="text-muted-foreground">{Math.round((effects.delay?.feedback ?? 0) * 100)}%</span>
          </div>
          <Slider
            value={[effects.delay?.feedback ?? 0]}
            onValueChange={([v]) =>
              update({
                delay: {
                  ...effects.delay,
                  feedback: v,
                  time: effects.delay?.time ?? 0.25,
                  wet: effects.delay?.wet ?? 0,
                },
              })
            }
            min={0}
            max={0.9}
            step={0.01}
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>Wet</Label>
            <span className="text-muted-foreground">{Math.round((effects.delay?.wet ?? 0) * 100)}%</span>
          </div>
          <Slider
            value={[effects.delay?.wet ?? 0]}
            onValueChange={([v]) =>
              update({
                delay: {
                  ...effects.delay,
                  wet: v,
                  time: effects.delay?.time ?? 0.25,
                  feedback: effects.delay?.feedback ?? 0,
                },
              })
            }
            min={0}
            max={1}
            step={0.01}
          />
        </div>
      </div>
    </div>
  );
}
