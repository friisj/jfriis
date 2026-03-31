// @strudel/core
declare module '@strudel/core' {
  export function evalScope(...modules: unknown[]): Promise<void>
  export function setTime(fn: () => number): void
  export function repl(options: Record<string, unknown>): unknown
}

// @strudel/webaudio
declare module '@strudel/webaudio' {
  export function webaudioRepl(options?: Record<string, unknown>): unknown
  export function initAudioOnFirstClick(options?: Record<string, unknown>): void
  export function registerSynthSounds(): Promise<void>
}

// @strudel/transpiler
declare module '@strudel/transpiler' {
  export function transpiler(input: string, options?: Record<string, unknown>): string
  export function evaluate(code: string): Promise<{ pattern: unknown; meta?: unknown }>
}

// @strudel/mini
declare module '@strudel/mini' {
  export function miniAllStrings(): void
}

// @strudel/tonal
declare module '@strudel/tonal' {}

// @strudel/web (used by tools/strudel reference port)
declare module '@strudel/web' {
  export function initStrudel(options?: Record<string, unknown>): Promise<unknown>
  export function evaluate(code: string, autoplay?: boolean): Promise<unknown>
  export function hush(): void
}

// @strudel/codemirror
declare module '@strudel/codemirror' {
  import type { Extension } from '@codemirror/state'
  import type { EditorView } from '@codemirror/view'

  // StrudelMirror (used by tools/strudel reference port)
  export class StrudelMirror {
    constructor(options: {
      root: HTMLElement
      id?: string
      initialCode?: string
      onDraw?: (haps: unknown[], time: number, painters: unknown) => void
      drawContext?: CanvasRenderingContext2D
      drawTime?: [number, number]
      autodraw?: boolean
      prebake: () => Promise<unknown>
      bgFill?: boolean
      solo?: boolean
      theme?: string
      onToggle?: (started: boolean) => void
      onError?: (error: Error) => void
      mondo?: unknown
    })
    editor: EditorView
    repl: { scheduler: { started: boolean } }
    code: string
    evaluate(autostart?: boolean): Promise<void>
    stop(): Promise<void>
    toggle(): Promise<void>
    setCode(code: string): void
    clear(): void
    flash(ms?: number): void
    setTheme(theme: string): void
  }

  // Editor init
  export function initEditor(options: {
    initialCode?: string
    onChange: (update: unknown) => void
    onEvaluate?: () => void
    onStop?: () => void
    root: HTMLElement
    mondo?: boolean
  }): EditorView

  // Extensions and compartments for runtime reconfiguration
  export const extensions: Record<string, (on: boolean | string, config?: unknown) => Extension>
  export const compartments: Record<string, { of: (ext: Extension) => Extension; reconfigure: (ext: Extension) => import('@codemirror/state').StateEffect<unknown> }>
  export const defaultSettings: Record<string, unknown>

  // Slider and widget updates
  export function updateSliderWidgets(view: EditorView, widgets: unknown[]): void
  export function updateWidgets(view: EditorView, widgets: unknown[]): void
  export const sliderWithID: (id: string, value: number, min?: number, max?: number) => unknown

  // Highlight
  export const highlightExtension: Extension[]
  export function updateMiniLocations(view: EditorView, locations: number[][]): void
  export function highlightMiniLocations(view: EditorView, atTime: number, haps: unknown[]): void
  export const isPatternHighlightingEnabled: (on: boolean, config?: unknown) => Extension

  // Flash
  export function flash(view: EditorView, ms?: number): void
  export const isFlashEnabled: (on: boolean) => Extension
  export const flashField: Extension

  // Themes
  export function initTheme(name: string): void
  export function activateTheme(name: string): void
  export const theme: Extension
}

// @strudel/draw
declare module '@strudel/draw' {
  export class Drawer {
    constructor(
      onDraw: (haps: unknown[], time: number, drawer: Drawer, painters: unknown[]) => void,
      drawTime: [number, number],
    )
    scheduler: unknown
    visibleHaps: unknown[]
    painters: unknown[]
    start(scheduler: { now: () => number; pattern?: unknown }): void
    stop(): void
    invalidate(): void
  }

  export function cleanupDraw(all?: boolean, id?: string): void

  export function pitchwheel(options?: {
    haps?: unknown[]
    ctx?: CanvasRenderingContext2D
    id?: number | string
    hapcircles?: number
    circle?: number
    edo?: number
    root?: number
    thickness?: number
    hapRadius?: number
    mode?: 'flake' | 'polygon'
    margin?: number
    time?: number
  }): void

  export function __pianoroll(options: {
    time: number
    haps: unknown[]
    ctx: CanvasRenderingContext2D
    cycles?: number
    playhead?: number
    flipTime?: number
    flipValues?: number
    hideNegative?: boolean
    inactive?: string
    active?: string
    background?: string
    minMidi?: number
    maxMidi?: number
    autorange?: number
    fold?: number
  }): void
}
