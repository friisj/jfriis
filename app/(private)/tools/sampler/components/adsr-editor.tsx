'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface Envelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

interface ADSREditorProps {
  envelope: Envelope;
  onChange: (envelope: Envelope) => void;
}

export function ADSREditor({ envelope, onChange }: ADSREditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = 2;
    const drawW = w - padding * 2;
    const drawH = h - padding * 2;

    ctx.clearRect(0, 0, w, h);

    const { attack, decay, sustain, release } = envelope;

    // Calculate time segments (max 2s + 2s + hold + 3s)
    const holdTime = 0.3; // visual hold duration for sustain
    const totalTime = attack + decay + holdTime + release;
    const scale = drawW / totalTime;

    // ADSR points
    const x0 = padding;
    const y0 = padding + drawH; // bottom = 0 amplitude
    const xA = x0 + attack * scale;
    const yA = padding; // top = 1 amplitude
    const xD = xA + decay * scale;
    const yD = padding + drawH * (1 - sustain);
    const xS = xD + holdTime * scale;
    const yS = yD;
    const xR = xS + release * scale;
    const yR = y0;

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(xA, yA);
    ctx.lineTo(xD, yD);
    ctx.lineTo(xS, yS);
    ctx.lineTo(xR, yR);
    ctx.lineTo(xR, y0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Envelope line
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(xA, yA);
    ctx.lineTo(xD, yD);
    ctx.lineTo(xS, yS);
    ctx.lineTo(xR, yR);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Control points
    for (const [px, py] of [[xA, yA], [xD, yD], [xS, yS], [xR, yR]] as const) {
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99, 102, 241, 1)';
      ctx.fill();
    }
  }, [envelope]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  function update(partial: Partial<Envelope>) {
    onChange({ ...envelope, ...partial });
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Envelope</h4>

      <canvas
        ref={canvasRef}
        className="w-full h-16 rounded border border-border bg-muted/30"
      />

      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>Attack</Label>
            <span className="text-muted-foreground">{envelope.attack.toFixed(2)}s</span>
          </div>
          <Slider
            value={[envelope.attack]}
            onValueChange={([v]) => update({ attack: v })}
            min={0.001}
            max={2}
            step={0.01}
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>Decay</Label>
            <span className="text-muted-foreground">{envelope.decay.toFixed(2)}s</span>
          </div>
          <Slider
            value={[envelope.decay]}
            onValueChange={([v]) => update({ decay: v })}
            min={0.001}
            max={2}
            step={0.01}
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>Sustain</Label>
            <span className="text-muted-foreground">{Math.round(envelope.sustain * 100)}%</span>
          </div>
          <Slider
            value={[envelope.sustain]}
            onValueChange={([v]) => update({ sustain: v })}
            min={0}
            max={1}
            step={0.01}
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <Label>Release</Label>
            <span className="text-muted-foreground">{envelope.release.toFixed(2)}s</span>
          </div>
          <Slider
            value={[envelope.release]}
            onValueChange={([v]) => update({ release: v })}
            min={0.001}
            max={3}
            step={0.01}
          />
        </div>
      </div>
    </div>
  );
}
