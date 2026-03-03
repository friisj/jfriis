'use client';

import { Slider } from '@/components/ui/slider';
import type { PadEffects } from '@/lib/types/sampler';

interface EffectsChainProps {
  effects: PadEffects;
  onChange: (effects: PadEffects) => void;
}

function Row({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="text-xs font-mono text-muted-foreground w-12 text-right shrink-0">
        {display}
      </span>
    </div>
  );
}

export function EffectsChain({ effects, onChange }: EffectsChainProps) {
  function update(partial: Partial<PadEffects>) {
    onChange({ ...effects, ...partial });
  }

  return (
    <div className="space-y-5">
      {/* Volume & Pitch */}
      <div className="space-y-2.5">
        <Row
          label="Volume"
          value={effects.volume}
          display={`${Math.round(effects.volume * 100)}%`}
          min={0} max={1} step={0.01}
          onChange={(v) => update({ volume: v })}
        />
        <Row
          label="Pitch"
          value={effects.pitch}
          display={`${effects.pitch > 0 ? '+' : ''}${effects.pitch}st`}
          min={-24} max={24} step={1}
          onChange={(v) => update({ pitch: v })}
        />
      </div>

      {/* Reverb */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reverb</h5>
        <Row
          label="Wet"
          value={effects.reverb?.wet ?? 0}
          display={`${Math.round((effects.reverb?.wet ?? 0) * 100)}%`}
          min={0} max={1} step={0.01}
          onChange={(v) => update({ reverb: { wet: v, decay: effects.reverb?.decay ?? 1.5 } })}
        />
        <Row
          label="Decay"
          value={effects.reverb?.decay ?? 1.5}
          display={`${(effects.reverb?.decay ?? 1.5).toFixed(1)}s`}
          min={0.1} max={5} step={0.1}
          onChange={(v) => update({ reverb: { decay: v, wet: effects.reverb?.wet ?? 0 } })}
        />
      </div>

      {/* EQ */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">EQ</h5>
        {(['low', 'mid', 'high'] as const).map((band) => (
          <Row
            key={band}
            label={band.charAt(0).toUpperCase() + band.slice(1)}
            value={effects.eq?.[band] ?? 0}
            display={`${(effects.eq?.[band] ?? 0) > 0 ? '+' : ''}${effects.eq?.[band] ?? 0}dB`}
            min={-12} max={12} step={0.5}
            onChange={(v) =>
              update({
                eq: {
                  low: effects.eq?.low ?? 0,
                  mid: effects.eq?.mid ?? 0,
                  high: effects.eq?.high ?? 0,
                  [band]: v,
                },
              })
            }
          />
        ))}
      </div>

      {/* Delay */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Delay</h5>
        <Row
          label="Time"
          value={effects.delay?.time ?? 0.25}
          display={`${(effects.delay?.time ?? 0.25).toFixed(2)}s`}
          min={0.01} max={2} step={0.01}
          onChange={(v) =>
            update({ delay: { time: v, feedback: effects.delay?.feedback ?? 0, wet: effects.delay?.wet ?? 0 } })
          }
        />
        <Row
          label="Feedback"
          value={effects.delay?.feedback ?? 0}
          display={`${Math.round((effects.delay?.feedback ?? 0) * 100)}%`}
          min={0} max={0.9} step={0.01}
          onChange={(v) =>
            update({ delay: { feedback: v, time: effects.delay?.time ?? 0.25, wet: effects.delay?.wet ?? 0 } })
          }
        />
        <Row
          label="Wet"
          value={effects.delay?.wet ?? 0}
          display={`${Math.round((effects.delay?.wet ?? 0) * 100)}%`}
          min={0} max={1} step={0.01}
          onChange={(v) =>
            update({ delay: { wet: v, time: effects.delay?.time ?? 0.25, feedback: effects.delay?.feedback ?? 0 } })
          }
        />
      </div>
    </div>
  );
}
