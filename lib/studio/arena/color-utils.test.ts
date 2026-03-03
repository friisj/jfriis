import { describe, it, expect } from 'vitest'
import { hexToOklab, oklabDistance } from './color-utils'

describe('hexToOklab', () => {
  it('returns black as near-zero', () => {
    const lab = hexToOklab('#000000')
    expect(lab.L).toBeCloseTo(0, 2)
    expect(lab.a).toBeCloseTo(0, 2)
    expect(lab.b).toBeCloseTo(0, 2)
  })

  it('returns white with L near 1', () => {
    const lab = hexToOklab('#FFFFFF')
    expect(lab.L).toBeCloseTo(1, 1)
    expect(lab.a).toBeCloseTo(0, 1)
    expect(lab.b).toBeCloseTo(0, 1)
  })
})

describe('oklabDistance', () => {
  it('returns 0 for identical colors', () => {
    expect(oklabDistance('#FF0000', '#FF0000')).toBe(0)
  })

  it('returns small distance for near-identical colors', () => {
    // #1A1A2E vs #1B1B2F — very close
    const d = oklabDistance('#1A1A2E', '#1B1B2F')
    expect(d).toBeLessThan(0.01)
  })

  it('returns large distance for distant colors', () => {
    // black vs white
    const d = oklabDistance('#000000', '#FFFFFF')
    expect(d).toBeGreaterThan(0.5)
  })

  it('perceptual: red vs green is larger than red vs dark-red', () => {
    const redGreen = oklabDistance('#FF0000', '#00FF00')
    const redDarkRed = oklabDistance('#FF0000', '#CC0000')
    expect(redGreen).toBeGreaterThan(redDarkRed)
  })
})
