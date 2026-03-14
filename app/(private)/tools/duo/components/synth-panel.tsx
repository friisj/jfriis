'use client';

import { DuoKnob, logMapTo01, logMapFrom01 } from './knob';
import type { DuoSynthParams } from '@/lib/duo/types';

interface SynthPanelProps {
  params: DuoSynthParams;
  onParamChange: (param: keyof DuoSynthParams, value: number) => void;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</h3>
      <div className="flex items-start justify-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

export function SynthPanel({ params, onParamChange }: SynthPanelProps) {
  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Oscillators */}
      <Section label="Oscillators">
        <DuoKnob
          label="Mix"
          value={params.oscMix}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onParamChange('oscMix', v)}
          displayFn={(v) => (v < 0.3 ? 'Saw' : v > 0.7 ? 'Pulse' : 'Mix')}
        />
        <DuoKnob
          label="Detune"
          value={params.detune}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => onParamChange('detune', v)}
          displayFn={(v) => `${Math.round(v)}c`}
        />
        <DuoKnob
          label="PW"
          value={params.pulseWidth}
          min={0.01}
          max={0.99}
          step={0.01}
          onChange={(v) => onParamChange('pulseWidth', v)}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <DuoKnob
          label="LFO Spd"
          value={params.lfoRate}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => onParamChange('lfoRate', v)}
          displayFn={(v) => `${v.toFixed(1)}Hz`}
        />
        <DuoKnob
          label="LFO Dep"
          value={params.lfoDepth}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onParamChange('lfoDepth', v)}
          displayFn={(v) => (v === 0 ? 'Off' : `${Math.round(v * 100)}%`)}
        />
      </Section>

      {/* Filter */}
      <Section label="Filter">
        <DuoKnob
          label="Cutoff"
          value={params.filterCutoff}
          min={60}
          max={8000}
          step={1}
          onChange={(v) => onParamChange('filterCutoff', v)}
          displayFn={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
          mapTo01={logMapTo01}
          mapFrom01={logMapFrom01}
        />
        <DuoKnob
          label="Reso"
          value={params.filterResonance}
          min={0}
          max={20}
          step={0.1}
          onChange={(v) => onParamChange('filterResonance', v)}
          displayFn={(v) => v.toFixed(1)}
        />
      </Section>

      {/* Amp */}
      <Section label="Amp">
        <DuoKnob
          label="Level"
          value={params.level}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onParamChange('level', v)}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <DuoKnob
          label="Decay"
          value={params.decay}
          min={0.01}
          max={2}
          step={0.01}
          onChange={(v) => onParamChange('decay', v)}
          displayFn={(v) => `${v.toFixed(2)}s`}
        />
      </Section>

      {/* Chorus */}
      <Section label="Chorus">
        <DuoKnob
          label="Rate"
          value={params.chorusRate}
          min={0.1}
          max={8}
          step={0.1}
          onChange={(v) => onParamChange('chorusRate', v)}
          displayFn={(v) => `${v.toFixed(1)}Hz`}
        />
        <DuoKnob
          label="Depth"
          value={params.chorusDepth}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onParamChange('chorusDepth', v)}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <DuoKnob
          label="Wet"
          value={params.chorusWet}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onParamChange('chorusWet', v)}
          displayFn={(v) => (v === 0 ? 'Off' : `${Math.round(v * 100)}%`)}
        />
      </Section>

      {/* Space */}
      <Section label="Space">
        <DuoKnob
          label="Reverb"
          value={params.reverbWet}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onParamChange('reverbWet', v)}
          displayFn={(v) => (v === 0 ? 'Off' : `${Math.round(v * 100)}%`)}
        />
        <DuoKnob
          label="Decay"
          value={params.reverbDecay}
          min={0.5}
          max={8}
          step={0.1}
          onChange={(v) => onParamChange('reverbDecay', v)}
          displayFn={(v) => `${v.toFixed(1)}s`}
        />
      </Section>

      {/* Effects */}
      <Section label="Effects">
        <DuoKnob
          label="Crush"
          value={params.bitcrusherBits}
          min={1}
          max={16}
          step={1}
          onChange={(v) => onParamChange('bitcrusherBits', v)}
          displayFn={(v) => `${Math.round(v)}bit`}
        />
        <DuoKnob
          label="Delay"
          value={params.delayWet}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onParamChange('delayWet', v)}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <DuoKnob
          label="Accent"
          value={params.accent}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onParamChange('accent', v)}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <DuoKnob
          label="Glide"
          value={params.glide}
          min={0}
          max={0.5}
          step={0.005}
          onChange={(v) => onParamChange('glide', v)}
          displayFn={(v) => (v === 0 ? 'Off' : `${Math.round(v * 1000)}ms`)}
        />
      </Section>

    </div>
  );
}
