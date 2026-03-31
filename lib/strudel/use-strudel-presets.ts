'use client'

import { useCallback, useEffect, useState } from 'react'
import { BUILT_IN_PRESETS } from './snippets'
import type { Preset } from './snippets'

const STORAGE_KEY = 'strudel-presets'

function loadUserPresets(): Preset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUserPresets(presets: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export function useStrudelPresets() {
  const [userPresets, setUserPresets] = useState<Preset[]>([])

  useEffect(() => {
    setUserPresets(loadUserPresets())
  }, [])

  const allPresets = [...BUILT_IN_PRESETS, ...userPresets]

  const save = useCallback((name: string, code: string) => {
    const id = `user-${Date.now()}`
    const preset: Preset = { id, name, code }
    const updated = [...loadUserPresets(), preset]
    saveUserPresets(updated)
    setUserPresets(updated)
    return preset
  }, [])

  const remove = useCallback((id: string) => {
    const updated = loadUserPresets().filter((p) => p.id !== id)
    saveUserPresets(updated)
    setUserPresets(updated)
  }, [])

  return { presets: allPresets, userPresets, save, remove }
}
