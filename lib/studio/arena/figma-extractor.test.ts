import { describe, it, expect } from 'vitest'
import { clusterColors } from './figma-extractor'
import type { ExtractedColor } from './figma-extractor'

function color(hex: string, count: number, usage: 'fill' | 'stroke' = 'fill', nodeNames = ['node']): ExtractedColor {
  return { hex, count, usage, nodeNames }
}

describe('clusterColors', () => {
  it('merges near-identical colors with same usage', () => {
    const colors = [
      color('#1A1A2E', 10),
      color('#1B1B2F', 5), // very close to above
    ]
    const result = clusterColors(colors)
    expect(result).toHaveLength(1)
    expect(result[0].hex).toBe('#1A1A2E') // keeps higher-count hex
    expect(result[0].count).toBe(15)
  })

  it('does NOT merge colors with different usage', () => {
    const colors = [
      color('#1A1A2E', 10, 'fill'),
      color('#1B1B2F', 5, 'stroke'),
    ]
    const result = clusterColors(colors)
    expect(result).toHaveLength(2)
  })

  it('does NOT merge distant colors', () => {
    const colors = [
      color('#FF0000', 10),
      color('#0000FF', 8),
    ]
    const result = clusterColors(colors)
    expect(result).toHaveLength(2)
  })

  it('unions nodeNames on merge', () => {
    const colors = [
      color('#1A1A2E', 10, 'fill', ['header']),
      color('#1B1B2F', 5, 'fill', ['footer']),
    ]
    const result = clusterColors(colors)
    expect(result[0].nodeNames).toContain('header')
    expect(result[0].nodeNames).toContain('footer')
  })

  it('returns empty array for empty input', () => {
    expect(clusterColors([])).toEqual([])
  })

  it('does not mutate input', () => {
    const original = [color('#1A1A2E', 10)]
    const originalCount = original[0].count
    clusterColors(original)
    expect(original[0].count).toBe(originalCount)
  })
})
