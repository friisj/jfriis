#!/usr/bin/env node
/**
 * One-shot script to generate tileable texture PNGs for Recess 3D.
 * Run: node scripts/generate-recess-textures.mjs
 *
 * Uses node-canvas to render the same procedural patterns,
 * saving them as static assets. These are placeholders until
 * Flux-generated textures replace them.
 */

import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'
import { join } from 'path'

const OUT = join(import.meta.dirname, '../public/textures/recess/surfaces')

function addNoise(ctx, size, amount) {
  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount
    data[i] = Math.max(0, Math.min(255, data[i] + noise))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
  }
  ctx.putImageData(imageData, 0, 0)
}

// ── Wall textures ────────────────────────────────────────────

function generateWall(size, baseColor, mortarColor, brickRows = 8, brickCols = 4) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = mortarColor
  ctx.fillRect(0, 0, size, size)

  const brickW = size / brickCols
  const brickH = size / brickRows
  const gap = 2

  for (let row = 0; row < brickRows; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2
    for (let col = -1; col <= brickCols; col++) {
      ctx.fillStyle = baseColor
      ctx.fillRect(col * brickW + offset + gap / 2, row * brickH + gap / 2, brickW - gap, brickH - gap)
    }
  }

  addNoise(ctx, size, 15)
  return canvas
}

// ── Floor textures ───────────────────────────────────────────

function generateFloor(size, baseColor, lineColor, tileCount = 4) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, size, size)

  const tileSize = size / tileCount
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1.5

  for (let i = 0; i <= tileCount; i++) {
    const pos = i * tileSize
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(size, pos); ctx.stroke()
  }

  // Scuff marks
  ctx.globalAlpha = 0.1
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const len = 5 + Math.random() * 20
    const angle = Math.random() * Math.PI * 2
    ctx.strokeStyle = Math.random() > 0.5 ? '#555' : '#999'
    ctx.lineWidth = 0.5 + Math.random()
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  addNoise(ctx, size, 10)
  return canvas
}

// ── Ceiling textures ─────────────────────────────────────────

function generateCeiling(size, baseColor, dotDensity = 800) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, size, size)

  // Acoustic dots
  ctx.fillStyle = adjustColor(baseColor, -15)
  for (let i = 0; i < dotDensity; i++) {
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, 0.3 + Math.random() * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }

  // Tile edges
  const tileSize = size / 2
  ctx.strokeStyle = adjustColor(baseColor, -20)
  ctx.lineWidth = 1
  for (let i = 0; i <= 2; i++) {
    const pos = i * tileSize
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(size, pos); ctx.stroke()
  }

  addNoise(ctx, size, 8)
  return canvas
}

// ── Concrete texture (for darker floors) ─────────────────────

function generateConcrete(size, baseColor) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, size, size)

  // Cracks
  ctx.globalAlpha = 0.15
  for (let i = 0; i < 8; i++) {
    let x = Math.random() * size
    let y = Math.random() * size
    ctx.strokeStyle = adjustColor(baseColor, -30)
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let j = 0; j < 6; j++) {
      x += (Math.random() - 0.5) * 30
      y += (Math.random() - 0.5) * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  addNoise(ctx, size, 20)
  return canvas
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function save(canvas, name) {
  const buffer = canvas.toBuffer('image/png')
  const path = join(OUT, `${name}.png`)
  writeFileSync(path, buffer)
  console.log(`  ${name}.png (${buffer.length} bytes)`)
}

// ── Generate all variants ────────────────────────────────────

console.log('Generating Recess textures...\n')
const SIZE = 256

// Floor 3 (top) — warm institutional
console.log('Floor 3 (warm institutional):')
save(generateWall(SIZE, '#b0a89a', '#8a8278'), 'wall-warm')
save(generateFloor(SIZE, '#a09888', '#8a8278'), 'floor-warm')
save(generateCeiling(SIZE, '#c8c0b8'), 'ceiling-warm')

// Floor 2 (mid) — cool sterile
console.log('Floor 2 (cool sterile):')
save(generateWall(SIZE, '#8a9098', '#6a7078'), 'wall-cool')
save(generateFloor(SIZE, '#788088', '#687078'), 'floor-cool')
save(generateCeiling(SIZE, '#a0a8b0'), 'ceiling-cool')

// Floor 1 (bottom) — dark/gritty
console.log('Floor 1 (dark emergency):')
save(generateWall(SIZE, '#605850', '#3a3430'), 'wall-dark')
save(generateConcrete(SIZE, '#484040'), 'floor-dark')
save(generateCeiling(SIZE, '#585050'), 'ceiling-dark')

console.log('\nDone! Assets in public/textures/recess/surfaces/')
