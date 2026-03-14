'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo, useCallback, useState } from 'react'
import * as THREE from 'three'

// ─── Parametric Controls ───────────────────────────────────────────────

interface IrisParams {
  // Color
  baseHue: number        // 0-360: dominant iris hue
  saturation: number     // 0-1: color intensity
  brightness: number     // 0-1: overall lightness (light→dark iris)
  secondaryHue: number   // 0-360: secondary color for heterochromia

  // Anatomy
  pupilSize: number      // 0.1-0.5: pupil radius relative to iris
  limbalRingWidth: number // 0-0.15: dark ring at iris edge
  limbalRingDarkness: number // 0-1: how dark the limbal ring is
  collaretteRadius: number   // 0.3-0.7: position of collarette boundary
  collaretteStrength: number // 0-1: visibility of collarette zigzag

  // Texture
  fiberDensity: number   // 10-80: number of radial fiber strands
  fiberStrength: number  // 0-1: visibility of radial fibers
  cryptDensity: number   // 0-1: frequency of crypts (diamond gaps)
  cryptDepth: number     // 0-1: darkness of crypts
  furrowCount: number    // 2-8: number of concentric furrows
  furrowStrength: number // 0-1: visibility of furrows
  noiseScale: number     // 1-5: organic noise frequency
  noiseStrength: number  // 0-0.5: how much noise disrupts structure
}

const DEFAULT_PARAMS: IrisParams = {
  baseHue: 210,
  saturation: 0.55,
  brightness: 0.45,
  secondaryHue: 40,
  pupilSize: 0.25,
  limbalRingWidth: 0.08,
  limbalRingDarkness: 0.7,
  collaretteRadius: 0.45,
  collaretteStrength: 0.5,
  fiberDensity: 40,
  fiberStrength: 0.6,
  cryptDensity: 0.4,
  cryptDepth: 0.5,
  furrowCount: 4,
  furrowStrength: 0.3,
  noiseScale: 3.0,
  noiseStrength: 0.15,
}

// ─── GLSL Shader ───────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  // Color
  uniform float u_baseHue;
  uniform float u_saturation;
  uniform float u_brightness;
  uniform float u_secondaryHue;

  // Anatomy
  uniform float u_pupilSize;
  uniform float u_limbalRingWidth;
  uniform float u_limbalRingDarkness;
  uniform float u_collaretteRadius;
  uniform float u_collaretteStrength;

  // Texture
  uniform float u_fiberDensity;
  uniform float u_fiberStrength;
  uniform float u_cryptDensity;
  uniform float u_cryptDepth;
  uniform float u_furrowCount;
  uniform float u_furrowStrength;
  uniform float u_noiseScale;
  uniform float u_noiseStrength;

  uniform float u_time;

  // ─── Noise Functions ───────────────────────────────────────

  // Hash for pseudo-random values
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // 2D value noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal Brownian Motion
  float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      value += amplitude * noise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // ─── Color Utilities ──────────────────────────────────────

  vec3 hsl2rgb(float h, float s, float l) {
    h = mod(h, 360.0) / 360.0;
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c * 0.5;
    vec3 rgb;
    if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
  }

  // ─── Main ──────────────────────────────────────────────────

  void main() {
    // Center UV coordinates, map to [-1, 1]
    vec2 uv = (vUv - 0.5) * 2.0;
    float r = length(uv);
    float angle = atan(uv.y, uv.x);

    // Discard outside the iris disc
    if (r > 1.0) discard;

    // ── Pupil ──
    float pupilEdge = smoothstep(u_pupilSize - 0.008, u_pupilSize + 0.008, r);
    // Pupillary ruff — thin dark fringe at pupil margin
    float ruffWidth = 0.015;
    float ruff = 1.0 - 0.4 * smoothstep(u_pupilSize, u_pupilSize + ruffWidth, r)
                          * (1.0 - smoothstep(u_pupilSize + ruffWidth, u_pupilSize + ruffWidth * 2.0, r));

    // ── Normalized radius within iris annulus (pupil edge to outer edge) ──
    float irisR = (r - u_pupilSize) / (1.0 - u_pupilSize);
    irisR = clamp(irisR, 0.0, 1.0);

    // ── Base color with radial gradient ──
    // Lighter near pupil (more scattering), darker at edge
    float radialGradient = 1.0 - irisR * 0.3;
    vec3 baseColor = hsl2rgb(u_baseHue, u_saturation, u_brightness * radialGradient);

    // ── Central heterochromia — secondary color ring near pupil ──
    float heteroMix = smoothstep(0.0, 0.25, irisR) * (1.0 - smoothstep(0.25, 0.5, irisR));
    vec3 secondaryColor = hsl2rgb(u_secondaryHue, u_saturation * 0.8, u_brightness * 1.2);
    baseColor = mix(baseColor, secondaryColor, heteroMix * 0.3);

    // ── Radial fibers (trabeculae / stromal fibers) ──
    float fiberAngle = angle * u_fiberDensity;
    float fiber = sin(fiberAngle) * 0.5 + 0.5;
    // Add slight wobble to fibers
    float fiberWobble = noise(vec2(angle * 10.0, r * 20.0)) * 0.3;
    fiber = fiber + fiberWobble;
    fiber = pow(fiber, 2.0); // sharpen
    // Fibers stronger in ciliary zone (outer)
    float fiberMask = smoothstep(0.1, 0.4, irisR);
    float fiberEffect = fiber * u_fiberStrength * fiberMask;

    // ── Collarette (zigzag boundary) ──
    float collaretteAngleVar = sin(angle * 12.0) * 0.03 + sin(angle * 7.0) * 0.02;
    float collarettePos = u_collaretteRadius + collaretteAngleVar;
    float collaretteLine = 1.0 - smoothstep(0.0, 0.02, abs(irisR - collarettePos));
    float collaretteEffect = collaretteLine * u_collaretteStrength * 0.3;

    // ── Crypts (diamond-shaped openings in stroma) ──
    // Place crypts primarily in the ciliary zone near the collarette
    vec2 cryptUV = vec2(angle * u_fiberDensity * 0.5, irisR * 15.0);
    float cryptNoise = noise(cryptUV * 2.0 + vec2(17.3, 42.1));
    float cryptMask = smoothstep(collarettePos, collarettePos + 0.15, irisR)
                    * (1.0 - smoothstep(collarettePos + 0.15, collarettePos + 0.35, irisR));
    float cryptThreshold = 1.0 - u_cryptDensity * 0.5;
    float crypts = step(cryptThreshold, cryptNoise) * cryptMask * u_cryptDepth;

    // ── Concentric furrows ──
    float furrowR = irisR * u_furrowCount * 3.14159;
    float furrows = sin(furrowR) * 0.5 + 0.5;
    furrows = pow(furrows, 4.0); // thin lines
    float furrowMask = smoothstep(0.3, 0.6, irisR); // mainly outer zone
    float furrowEffect = furrows * u_furrowStrength * 0.15 * furrowMask;

    // ── Organic noise (breaks up regularity) ──
    vec2 noiseUV = vec2(angle * 3.0 + r * u_noiseScale, r * u_noiseScale * 5.0);
    float organicNoise = fbm(noiseUV + vec2(7.7, 13.3), 4);
    float noiseEffect = (organicNoise - 0.5) * u_noiseStrength;

    // ── Limbal ring (dark ring at iris outer edge) ──
    float limbalStart = 1.0 - u_limbalRingWidth;
    float limbal = smoothstep(limbalStart - 0.02, limbalStart + 0.02, irisR);
    float limbalDark = limbal * u_limbalRingDarkness;

    // ── Compose ──
    vec3 color = baseColor;

    // Add fiber brightening
    color += vec3(fiberEffect * 0.12);

    // Collarette darkening
    color -= vec3(collaretteEffect);

    // Crypts — darken (revealing deeper pigment layer)
    color -= vec3(crypts * 0.2);

    // Furrows — subtle darkening
    color -= vec3(furrowEffect);

    // Organic noise modulation
    color += vec3(noiseEffect);

    // Limbal ring darkening
    color *= 1.0 - limbalDark * 0.6;

    // Pupillary ruff
    color *= ruff;

    // ── Outer edge anti-aliasing ──
    float outerAA = 1.0 - smoothstep(0.97, 1.0, r);
    float pupilAA = 1.0 - pupilEdge;

    // Final: black pupil or iris color
    vec3 pupilColor = vec3(0.02);
    vec3 finalColor = mix(pupilColor, color, pupilEdge);

    // Apply outer AA
    gl_FragColor = vec4(finalColor, outerAA);
  }
`

// ─── Iris Mesh Component ───────────────────────────────────────────────

function IrisMesh({ params }: { params: IrisParams }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(() => ({
    u_baseHue: { value: params.baseHue },
    u_saturation: { value: params.saturation },
    u_brightness: { value: params.brightness },
    u_secondaryHue: { value: params.secondaryHue },
    u_pupilSize: { value: params.pupilSize },
    u_limbalRingWidth: { value: params.limbalRingWidth },
    u_limbalRingDarkness: { value: params.limbalRingDarkness },
    u_collaretteRadius: { value: params.collaretteRadius },
    u_collaretteStrength: { value: params.collaretteStrength },
    u_fiberDensity: { value: params.fiberDensity },
    u_fiberStrength: { value: params.fiberStrength },
    u_cryptDensity: { value: params.cryptDensity },
    u_cryptDepth: { value: params.cryptDepth },
    u_furrowCount: { value: params.furrowCount },
    u_furrowStrength: { value: params.furrowStrength },
    u_noiseScale: { value: params.noiseScale },
    u_noiseStrength: { value: params.noiseStrength },
    u_time: { value: 0 },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    const mat = meshRef.current?.material as THREE.ShaderMaterial | undefined
    if (!mat?.uniforms) return

    mat.uniforms.u_baseHue.value = params.baseHue
    mat.uniforms.u_saturation.value = params.saturation
    mat.uniforms.u_brightness.value = params.brightness
    mat.uniforms.u_secondaryHue.value = params.secondaryHue
    mat.uniforms.u_pupilSize.value = params.pupilSize
    mat.uniforms.u_limbalRingWidth.value = params.limbalRingWidth
    mat.uniforms.u_limbalRingDarkness.value = params.limbalRingDarkness
    mat.uniforms.u_collaretteRadius.value = params.collaretteRadius
    mat.uniforms.u_collaretteStrength.value = params.collaretteStrength
    mat.uniforms.u_fiberDensity.value = params.fiberDensity
    mat.uniforms.u_fiberStrength.value = params.fiberStrength
    mat.uniforms.u_cryptDensity.value = params.cryptDensity
    mat.uniforms.u_cryptDepth.value = params.cryptDepth
    mat.uniforms.u_furrowCount.value = params.furrowCount
    mat.uniforms.u_furrowStrength.value = params.furrowStrength
    mat.uniforms.u_noiseScale.value = params.noiseScale
    mat.uniforms.u_noiseStrength.value = params.noiseStrength
    mat.uniforms.u_time.value = clock.elapsedTime
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
}

// ─── Preset Configurations ─────────────────────────────────────────────

interface Preset {
  name: string
  params: Partial<IrisParams>
}

const PRESETS: Preset[] = [
  {
    name: 'Blue',
    params: {
      baseHue: 210, saturation: 0.55, brightness: 0.5,
      secondaryHue: 40, fiberStrength: 0.7, cryptDensity: 0.5,
      limbalRingDarkness: 0.8,
    },
  },
  {
    name: 'Green',
    params: {
      baseHue: 140, saturation: 0.4, brightness: 0.4,
      secondaryHue: 50, fiberStrength: 0.5, cryptDensity: 0.3,
      limbalRingDarkness: 0.6, noiseStrength: 0.2,
    },
  },
  {
    name: 'Brown',
    params: {
      baseHue: 30, saturation: 0.6, brightness: 0.3,
      secondaryHue: 35, fiberStrength: 0.4, cryptDensity: 0.2,
      limbalRingDarkness: 0.5, noiseStrength: 0.1,
    },
  },
  {
    name: 'Hazel',
    params: {
      baseHue: 60, saturation: 0.45, brightness: 0.4,
      secondaryHue: 30, fiberStrength: 0.55, cryptDensity: 0.35,
      limbalRingDarkness: 0.65, collaretteStrength: 0.6,
    },
  },
  {
    name: 'Amber',
    params: {
      baseHue: 40, saturation: 0.7, brightness: 0.5,
      secondaryHue: 25, fiberStrength: 0.6, cryptDensity: 0.3,
      limbalRingDarkness: 0.7, noiseStrength: 0.12,
    },
  },
  {
    name: 'Grey',
    params: {
      baseHue: 210, saturation: 0.12, brightness: 0.55,
      secondaryHue: 200, fiberStrength: 0.45, cryptDensity: 0.4,
      limbalRingDarkness: 0.75, noiseStrength: 0.18,
    },
  },
]

// ─── Slider Component ──────────────────────────────────────────────────

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-500 tabular-nums">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-zinc-300 [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:hover:bg-white"
      />
    </div>
  )
}

// ─── Control Panel ─────────────────────────────────────────────────────

function ControlPanel({
  params,
  onUpdate,
}: {
  params: IrisParams
  onUpdate: (updates: Partial<IrisParams>) => void
}) {
  const set = useCallback(
    (key: keyof IrisParams) => (v: number) => onUpdate({ [key]: v }),
    [onUpdate]
  )

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full text-sm">
      {/* Presets */}
      <div>
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Presets</h4>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onUpdate(preset.params)}
              className="px-2.5 py-1 text-xs rounded bg-zinc-800 text-zinc-300
                         hover:bg-zinc-700 hover:text-white transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Color</h4>
        <div className="flex flex-col gap-2">
          <Slider label="Base Hue" value={params.baseHue} min={0} max={360} step={1} onChange={set('baseHue')} />
          <Slider label="Saturation" value={params.saturation} min={0} max={1} step={0.01} onChange={set('saturation')} />
          <Slider label="Brightness" value={params.brightness} min={0.1} max={0.7} step={0.01} onChange={set('brightness')} />
          <Slider label="Secondary Hue" value={params.secondaryHue} min={0} max={360} step={1} onChange={set('secondaryHue')} />
        </div>
      </div>

      {/* Anatomy */}
      <div>
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Anatomy</h4>
        <div className="flex flex-col gap-2">
          <Slider label="Pupil Size" value={params.pupilSize} min={0.1} max={0.5} step={0.01} onChange={set('pupilSize')} />
          <Slider label="Limbal Ring Width" value={params.limbalRingWidth} min={0} max={0.15} step={0.01} onChange={set('limbalRingWidth')} />
          <Slider label="Limbal Ring Darkness" value={params.limbalRingDarkness} min={0} max={1} step={0.01} onChange={set('limbalRingDarkness')} />
          <Slider label="Collarette Position" value={params.collaretteRadius} min={0.2} max={0.7} step={0.01} onChange={set('collaretteRadius')} />
          <Slider label="Collarette Strength" value={params.collaretteStrength} min={0} max={1} step={0.01} onChange={set('collaretteStrength')} />
        </div>
      </div>

      {/* Texture */}
      <div>
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Texture</h4>
        <div className="flex flex-col gap-2">
          <Slider label="Fiber Density" value={params.fiberDensity} min={10} max={80} step={1} onChange={set('fiberDensity')} />
          <Slider label="Fiber Strength" value={params.fiberStrength} min={0} max={1} step={0.01} onChange={set('fiberStrength')} />
          <Slider label="Crypt Density" value={params.cryptDensity} min={0} max={1} step={0.01} onChange={set('cryptDensity')} />
          <Slider label="Crypt Depth" value={params.cryptDepth} min={0} max={1} step={0.01} onChange={set('cryptDepth')} />
          <Slider label="Furrow Count" value={params.furrowCount} min={2} max={8} step={1} onChange={set('furrowCount')} />
          <Slider label="Furrow Strength" value={params.furrowStrength} min={0} max={1} step={0.01} onChange={set('furrowStrength')} />
        </div>
      </div>

      {/* Noise */}
      <div>
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Noise</h4>
        <div className="flex flex-col gap-2">
          <Slider label="Noise Scale" value={params.noiseScale} min={1} max={5} step={0.1} onChange={set('noiseScale')} />
          <Slider label="Noise Strength" value={params.noiseStrength} min={0} max={0.5} step={0.01} onChange={set('noiseStrength')} />
        </div>
      </div>
    </div>
  )
}

// ─── Main Export ────────────────────────────────────────────────────────

export default function IrisShaderPrototype() {
  const [params, setParams] = useState<IrisParams>({ ...DEFAULT_PARAMS })

  const handleUpdate = useCallback((updates: Partial<IrisParams>) => {
    setParams((prev) => ({ ...prev, ...updates }))
  }, [])

  return (
    <div className="h-full w-full flex bg-zinc-950">
      {/* Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 0, 1.8], fov: 50 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: '#09090b' }}
        >
          <IrisMesh params={params} />
        </Canvas>
      </div>

      {/* Control panel */}
      <div className="w-72 border-l border-zinc-800 bg-zinc-950">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-200">Iris Parameters</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Stage 1: Procedural Shader</p>
        </div>
        <ControlPanel params={params} onUpdate={handleUpdate} />
      </div>
    </div>
  )
}
