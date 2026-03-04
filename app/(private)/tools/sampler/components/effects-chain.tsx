'use client';

import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { FilterType, PadEffects, StutterRate } from '@/lib/types/sampler';

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

/** Convert linear 0–1 slider to 20–20000 Hz (logarithmic) */
function sliderToHz(v: number): number {
  return 20 * Math.pow(1000, v);
}
/** Convert Hz back to 0–1 slider value */
function hzToSlider(hz: number): number {
  return Math.log(hz / 20) / Math.log(1000);
}
/** Format Hz for display */
function formatHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(1)}kHz` : `${Math.round(hz)}Hz`;
}

const STUTTER_RATES: StutterRate[] = ['1/2', '1/4', '1/8', '1/16', '1/32'];

const FILTER_LABELS: Record<FilterType, string> = {
  off: 'Off',
  lowpass: 'Low Pass',
  highpass: 'High Pass',
  bandpass: 'Band Pass',
};

export function EffectsChain({ effects, onChange }: EffectsChainProps) {
  function update(partial: Partial<PadEffects>) {
    onChange({ ...effects, ...partial });
  }

  const filterType = effects.filter?.type ?? 'off';
  const filterCutoff = effects.filter?.cutoff ?? 20000;
  const filterResonance = effects.filter?.resonance ?? 0.7071;

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

      {/* Filter */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Filter</h5>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0">Type</span>
          <Select
            value={filterType}
            onValueChange={(v) =>
              update({ filter: { type: v as FilterType, cutoff: filterCutoff, resonance: filterResonance } })
            }
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FILTER_LABELS) as FilterType[]).map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{FILTER_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filterType !== 'off' && (
          <>
            <Row
              label="Cutoff"
              value={hzToSlider(filterCutoff)}
              display={formatHz(filterCutoff)}
              min={0} max={1} step={0.001}
              onChange={(v) =>
                update({ filter: { type: filterType, cutoff: sliderToHz(v), resonance: filterResonance } })
              }
            />
            <Row
              label="Resonance"
              value={filterResonance}
              display={filterResonance.toFixed(1)}
              min={0.1} max={20} step={0.1}
              onChange={(v) =>
                update({ filter: { type: filterType, cutoff: filterCutoff, resonance: v } })
              }
            />
          </>
        )}
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

      {/* Compressor */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Compressor</h5>
        <Row
          label="Threshold"
          value={effects.compressor?.threshold ?? 0}
          display={`${effects.compressor?.threshold ?? 0}dB`}
          min={-60} max={0} step={1}
          onChange={(v) =>
            update({
              compressor: {
                threshold: v,
                ratio: effects.compressor?.ratio ?? 1,
                attack: effects.compressor?.attack ?? 0.003,
                release: effects.compressor?.release ?? 0.25,
              },
            })
          }
        />
        <Row
          label="Ratio"
          value={effects.compressor?.ratio ?? 1}
          display={`${(effects.compressor?.ratio ?? 1).toFixed(1)}:1`}
          min={1} max={20} step={0.5}
          onChange={(v) =>
            update({
              compressor: {
                threshold: effects.compressor?.threshold ?? 0,
                ratio: v,
                attack: effects.compressor?.attack ?? 0.003,
                release: effects.compressor?.release ?? 0.25,
              },
            })
          }
        />
        <Row
          label="Attack"
          value={effects.compressor?.attack ?? 0.003}
          display={`${((effects.compressor?.attack ?? 0.003) * 1000).toFixed(0)}ms`}
          min={0} max={1} step={0.001}
          onChange={(v) =>
            update({
              compressor: {
                threshold: effects.compressor?.threshold ?? 0,
                ratio: effects.compressor?.ratio ?? 1,
                attack: v,
                release: effects.compressor?.release ?? 0.25,
              },
            })
          }
        />
        <Row
          label="Release"
          value={effects.compressor?.release ?? 0.25}
          display={`${((effects.compressor?.release ?? 0.25) * 1000).toFixed(0)}ms`}
          min={0} max={1} step={0.001}
          onChange={(v) =>
            update({
              compressor: {
                threshold: effects.compressor?.threshold ?? 0,
                ratio: effects.compressor?.ratio ?? 1,
                attack: effects.compressor?.attack ?? 0.003,
                release: v,
              },
            })
          }
        />
      </div>

      {/* Distortion */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Distortion</h5>
        <Row
          label="Drive"
          value={effects.distortion?.drive ?? 0}
          display={`${Math.round(effects.distortion?.drive ?? 0)}`}
          min={0} max={100} step={1}
          onChange={(v) =>
            update({ distortion: { drive: v, mix: effects.distortion?.mix ?? 0 } })
          }
        />
        <Row
          label="Mix"
          value={effects.distortion?.mix ?? 0}
          display={`${Math.round((effects.distortion?.mix ?? 0) * 100)}%`}
          min={0} max={1} step={0.01}
          onChange={(v) =>
            update({ distortion: { drive: effects.distortion?.drive ?? 0, mix: v } })
          }
        />
      </div>

      {/* Bitcrusher */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Bitcrusher</h5>
        <Row
          label="Bit Depth"
          value={effects.bitcrusher?.bitDepth ?? 16}
          display={`${effects.bitcrusher?.bitDepth ?? 16}bit`}
          min={1} max={16} step={1}
          onChange={(v) =>
            update({ bitcrusher: { bitDepth: v, rateReduction: effects.bitcrusher?.rateReduction ?? 1 } })
          }
        />
        <Row
          label="Rate Red."
          value={effects.bitcrusher?.rateReduction ?? 1}
          display={`${effects.bitcrusher?.rateReduction ?? 1}x`}
          min={1} max={40} step={1}
          onChange={(v) =>
            update({ bitcrusher: { bitDepth: effects.bitcrusher?.bitDepth ?? 16, rateReduction: v } })
          }
        />
      </div>

      {/* Vinyl/Tape */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Vinyl / Tape</h5>
        <Row
          label="Wow"
          value={effects.vinylSim?.wow ?? 0}
          display={`${Math.round((effects.vinylSim?.wow ?? 0) * 100)}%`}
          min={0} max={1} step={0.01}
          onChange={(v) =>
            update({
              vinylSim: {
                wow: v,
                flutter: effects.vinylSim?.flutter ?? 0,
                noise: effects.vinylSim?.noise ?? 0,
              },
            })
          }
        />
        <Row
          label="Flutter"
          value={effects.vinylSim?.flutter ?? 0}
          display={`${Math.round((effects.vinylSim?.flutter ?? 0) * 100)}%`}
          min={0} max={1} step={0.01}
          onChange={(v) =>
            update({
              vinylSim: {
                wow: effects.vinylSim?.wow ?? 0,
                flutter: v,
                noise: effects.vinylSim?.noise ?? 0,
              },
            })
          }
        />
        <Row
          label="Noise"
          value={effects.vinylSim?.noise ?? 0}
          display={`${Math.round((effects.vinylSim?.noise ?? 0) * 100)}%`}
          min={0} max={1} step={0.01}
          onChange={(v) =>
            update({
              vinylSim: {
                wow: effects.vinylSim?.wow ?? 0,
                flutter: effects.vinylSim?.flutter ?? 0,
                noise: v,
              },
            })
          }
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

      {/* Pan */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pan</h5>
        <Row
          label="Pan"
          value={effects.pan?.pan ?? 0}
          display={
            (effects.pan?.pan ?? 0) < -0.01
              ? `L${Math.round(Math.abs(effects.pan!.pan) * 100)}`
              : (effects.pan?.pan ?? 0) > 0.01
                ? `R${Math.round(effects.pan!.pan * 100)}`
                : 'C'
          }
          min={-1} max={1} step={0.01}
          onChange={(v) => update({ pan: { pan: v } })}
        />
      </div>

      {/* Reverse */}
      <div className="flex items-center justify-between">
        <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reverse</h5>
        <Switch
          checked={effects.reverse ?? false}
          onCheckedChange={(v) => update({ reverse: v })}
        />
      </div>

      {/* Stutter */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Stutter</h5>
          <Switch
            checked={effects.stutter?.on ?? false}
            onCheckedChange={(v) =>
              update({ stutter: { on: v, rate: effects.stutter?.rate ?? '1/8' } })
            }
          />
        </div>
        {effects.stutter?.on && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16 shrink-0">Rate</span>
            <Select
              value={effects.stutter?.rate ?? '1/8'}
              onValueChange={(v) =>
                update({ stutter: { on: true, rate: v as StutterRate } })
              }
            >
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STUTTER_RATES.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
