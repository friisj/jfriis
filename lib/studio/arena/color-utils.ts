/**
 * Arena Color Utilities
 *
 * Hex ↔ OKLCH conversion for the theme editor.
 * Arena tokens store CSS hex strings; OklchPicker needs {l, c, h} numbers.
 */

// sRGB → linear sRGB
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

// linear sRGB → sRGB
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

/** Parse a hex color string to [r, g, b] in 0–1 range */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3
    ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    : h
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ]
}

/** Convert [r, g, b] (0–1 sRGB) to OKLCH {l, c, h} where l is 0–100, c is 0–0.4, h is 0–360 */
function rgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
  // sRGB to linear
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  // Linear sRGB → LMS (using Oklab's M1 matrix)
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s_ = 0.0883024619 * lr + 0.2220049174 * lg + 0.6696926158 * lb

  // Cube root
  const l3 = Math.cbrt(l_)
  const m3 = Math.cbrt(m_)
  const s3 = Math.cbrt(s_)

  // LMS → Oklab
  const L = 0.2104542553 * l3 + 0.7936177850 * m3 - 0.0040720468 * s3
  const a = 1.9779984951 * l3 - 2.4285922050 * m3 + 0.4505937099 * s3
  const bk = 0.0259040371 * l3 + 0.7827717662 * m3 - 0.8086757660 * s3

  // Oklab → OKLCH
  const C = Math.sqrt(a * a + bk * bk)
  let H = (Math.atan2(bk, a) * 180) / Math.PI
  if (H < 0) H += 360

  return {
    l: L * 100,     // 0–100
    c: C,            // 0–~0.4
    h: C < 0.001 ? 0 : H,  // achromatic → 0
  }
}

/** Convert OKLCH {l, c, h} to [r, g, b] in 0–1 sRGB range */
function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const L = l / 100
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)

  // Oklab → LMS
  const l3 = L + 0.3963377774 * a + 0.2158037573 * b
  const m3 = L - 0.1055613458 * a - 0.0638541728 * b
  const s3 = L - 0.0894841775 * a - 1.2914855480 * b

  // Cube
  const l_ = l3 * l3 * l3
  const m_ = m3 * m3 * m3
  const s_ = s3 * s3 * s3

  // LMS → linear sRGB
  const lr = +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
  const lg = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
  const lb = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_

  return [
    Math.max(0, Math.min(1, linearToSrgb(lr))),
    Math.max(0, Math.min(1, linearToSrgb(lg))),
    Math.max(0, Math.min(1, linearToSrgb(lb))),
  ]
}

/** Convert a hex color string to OKLCH {l, c, h} */
export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const [r, g, b] = hexToRgb(hex)
  return rgbToOklch(r, g, b)
}

/** Convert OKLCH {l, c, h} to a hex color string */
export function oklchToHex(l: number, c: number, h: number): string {
  const [r, g, b] = oklchToRgb(l, c, h)
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Oklab color (perceptually uniform, Cartesian — no hue wrapping) */
export interface OklabColor {
  L: number  // 0–1
  a: number
  b: number
}

/** Convert a hex color string to Oklab {L, a, b} */
export function hexToOklab(hex: string): OklabColor {
  const [r, g, b] = hexToRgb(hex)
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s_ = 0.0883024619 * lr + 0.2220049174 * lg + 0.6696926158 * lb

  const l3 = Math.cbrt(l_)
  const m3 = Math.cbrt(m_)
  const s3 = Math.cbrt(s_)

  return {
    L: 0.2104542553 * l3 + 0.7936177850 * m3 - 0.0040720468 * s3,
    a: 1.9779984951 * l3 - 2.4285922050 * m3 + 0.4505937099 * s3,
    b: 0.0259040371 * l3 + 0.7827717662 * m3 - 0.8086757660 * s3,
  }
}

/** Euclidean distance between two hex colors in Oklab space (perceptually uniform) */
export function oklabDistance(hex1: string, hex2: string): number {
  const a = hexToOklab(hex1)
  const b = hexToOklab(hex2)
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2)
}

/** Check if a string looks like a valid hex color */
export function isHexColor(s: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)
}
