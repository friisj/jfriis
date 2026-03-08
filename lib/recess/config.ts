import type { GameConfig } from './types'
import { DEFAULT_CONFIG } from './types'

const STORAGE_KEY = 'recess-config'

export function saveConfig(config: GameConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage unavailable (SSR, private browsing)
  }
}

export function loadConfig(): GameConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to handle added fields in future versions
      return { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_CONFIG
}

export function resetConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage unavailable
  }
}
