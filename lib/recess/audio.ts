/**
 * Recess Audio — thin wrapper around SamplerEngine
 *
 * Loads the `recess-fx` collection and exposes named sound triggers.
 * Degrades gracefully: if collection has no sounds yet or load fails,
 * all play calls are silent no-ops.
 */

import { SamplerEngine } from '@/lib/sampler-engine'
import { getCollectionWithPads } from '@/lib/sampler'
import type { PadWithSound } from '@/lib/types/sampler'

const COLLECTION_SLUG = 'recess-fx'

export type RecessSound =
  | 'footstep'
  | 'wall-bump'
  | 'door-open'
  | 'key-collect'
  | 'encounter'
  | 'challenge'
  | 'accuse-right'
  | 'accuse-wrong'
  | 'dodge-success'
  | 'dodge-fail'
  | 'throw-hit'
  | 'throw-miss'
  | 'gym-enter'
  | 'floor-down'
  | 'detention'
  | 'victory'

export class RecessAudio {
  private engine: SamplerEngine | null = null
  private padsByLabel: Map<string, PadWithSound> = new Map()
  private ready = false
  private loading = false

  async init(): Promise<void> {
    if (this.ready || this.loading) return
    this.loading = true

    try {
      const collection = await getCollectionWithPads(COLLECTION_SLUG)
      this.engine = new SamplerEngine()
      await this.engine.preload(collection.pads)

      for (const pad of collection.pads) {
        if (pad.label) {
          this.padsByLabel.set(pad.label, pad)
        }
      }

      this.ready = true
    } catch {
      // Collection doesn't exist or has no sounds — silent mode
      this.ready = false
    } finally {
      this.loading = false
    }
  }

  play(sound: RecessSound): void {
    if (!this.ready || !this.engine) return
    const pad = this.padsByLabel.get(sound)
    if (!pad?.sound) return
    this.engine.trigger(pad)
  }

  dispose(): void {
    this.engine?.dispose()
    this.engine = null
    this.padsByLabel.clear()
    this.ready = false
  }
}

// Singleton for use across the app
let instance: RecessAudio | null = null

export function getRecessAudio(): RecessAudio {
  if (!instance) {
    instance = new RecessAudio()
  }
  return instance
}
