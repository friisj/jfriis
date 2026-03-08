import type { HighScore } from './types'

const STORAGE_KEY = 'recess-high-scores'
const MAX_SCORES = 10

export function loadHighScores(): HighScore[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // localStorage unavailable
  }
  return []
}

export function saveHighScore(score: number, floors: number): HighScore[] {
  const scores = loadHighScores()
  const entry: HighScore = {
    score,
    floors,
    date: new Date().toISOString().slice(0, 10),
  }
  scores.push(entry)
  scores.sort((a, b) => b.score - a.score)
  const trimmed = scores.slice(0, MAX_SCORES)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // localStorage unavailable
  }
  return trimmed
}

export function isHighScore(score: number): boolean {
  const scores = loadHighScores()
  if (scores.length < MAX_SCORES) return score > 0
  return score > scores[scores.length - 1].score
}
