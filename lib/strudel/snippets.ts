export type Snippet = {
  name: string
  code: string
  category: SnippetCategory
}

export type SnippetCategory = 'rhythm' | 'melody' | 'chords' | 'effects' | 'viz'

export const SNIPPET_CATEGORIES: { id: SnippetCategory; label: string }[] = [
  { id: 'rhythm', label: 'Rhythm' },
  { id: 'melody', label: 'Melody' },
  { id: 'chords', label: 'Chords' },
  { id: 'effects', label: 'Effects' },
  { id: 'viz', label: 'Viz' },
]

export const SNIPPETS: Snippet[] = [
  // --- Rhythm ---
  {
    name: 'Four on the floor',
    category: 'rhythm',
    code: `s("bd sd:2 bd sd:2")`,
  },
  {
    name: 'Euclidean beat',
    category: 'rhythm',
    code: `s("bd(3,8) sd(2,8,1) hh*8")`,
  },
  {
    name: 'Breakbeat',
    category: 'rhythm',
    code: `s("808bd [~ 808bd] 808sd [808bd ~]")`,
  },
  {
    name: 'Polyrhythm',
    category: 'rhythm',
    code: `stack(
  s("bd(3,8)"),
  s("hh(5,8)"),
  s("sd(2,5)")
)`,
  },

  // --- Melody ---
  {
    name: 'Arpeggiated minor',
    category: 'melody',
    code: `note("c3 eb3 g3 bb3 g3 eb3")
  .s("sawtooth")
  .cutoff(1200)
  .decay(.1).sustain(.3)`,
  },
  {
    name: 'Pentatonic sequence',
    category: 'melody',
    code: `n("0 2 4 5 7 9 7 5")
  .scale("C:minor:pentatonic")
  .s("triangle")
  .room(.4)`,
  },
  {
    name: 'Random melody',
    category: 'melody',
    code: `n(irand(12))
  .scale("D:dorian")
  .s("square")
  .lpf(800)
  .fast(2)`,
  },
  {
    name: 'Chromatic run',
    category: 'melody',
    code: `note("c3 db3 d3 eb3 e3 f3 gb3 g3")
  .s("sawtooth")
  .cutoff(sine.range(300, 2000).slow(2))`,
  },

  // --- Chords ---
  {
    name: 'Jazz voicings',
    category: 'chords',
    code: `"<Dm7 G7 Cmaj7 Am7>"
  .voicings("lefthand")
  .note()
  .sound("piano")
  .slow(2)
  .room(.5)`,
  },
  {
    name: 'Stacked fifths',
    category: 'chords',
    code: `note("c3,g3,d4 f3,c4,g4")
  .s("sawtooth")
  .cutoff(600)
  .slow(2)`,
  },
  {
    name: 'Pad with filter sweep',
    category: 'chords',
    code: `note("<[c3,eb3,g3,bb3] [f3,ab3,c4,eb4]>")
  .s("sawtooth")
  .cutoff(sine.range(200, 3000).slow(8))
  .resonance(10)
  .attack(.5).release(1)
  .room(.7)`,
  },

  // --- Effects ---
  {
    name: 'Delay feedback',
    category: 'effects',
    code: `.delay(.5)
.delaytime(.125)
.delayfeedback(.6)`,
  },
  {
    name: 'Reverb wash',
    category: 'effects',
    code: `.room(.8)
.roomsize(8)`,
  },
  {
    name: 'Bitcrush',
    category: 'effects',
    code: `.crush(4)
.coarse(2)`,
  },
  {
    name: 'LP filter wobble',
    category: 'effects',
    code: `.cutoff(sine.range(200, 4000).slow(4))
.resonance(15)`,
  },
  {
    name: 'Distortion',
    category: 'effects',
    code: `.distort(.4)
.shape(.6)`,
  },

  // --- Viz ---
  {
    name: 'Spiral',
    category: 'viz',
    code: `.spiral()`,
  },
  {
    name: 'Pitch wheel',
    category: 'viz',
    code: `.pitchwheel()`,
  },
  {
    name: 'Scope',
    category: 'viz',
    code: `.scope()`,
  },
]

// --- Presets ---

export type Preset = {
  id: string
  name: string
  code: string
  builtIn?: boolean
}

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'welcome',
    name: 'Welcome',
    builtIn: true,
    code: `// Welcome to Strudel!
// Press Ctrl+Enter to evaluate, Ctrl+. to stop
// docs: https://strudel.cc/workshop/getting-started

note("c3 eb3 g3 bb3")
  .s("sawtooth")
  .cutoff(sine.range(400, 2000).slow(4))
  .decay(.1)
  .sustain(.3)
  .delay(.25)
  .delaytime(.125)
  .room(.5)`,
  },
  {
    id: 'acid-bass',
    name: 'Acid Bass',
    builtIn: true,
    code: `note("c2 c2 eb2 [c2 c3]")
  .s("sawtooth")
  .cutoff(sine.range(200, 5000).fast(2))
  .resonance(20)
  .decay(.05).sustain(0)
  .gain(.8)
  .distort(.3)
  .delay(.25).delaytime(.166)`,
  },
  {
    id: 'ambient-pad',
    name: 'Ambient Pad',
    builtIn: true,
    code: `note("<[c3,eb3,g3,bb3] [ab2,c3,eb3,g3] [f2,ab2,c3,eb3] [g2,bb2,d3,f3]>")
  .s("sawtooth")
  .cutoff(sine.range(300, 1200).slow(16))
  .attack(2).release(4)
  .room(.9).roomsize(10)
  .gain(.3)
  .slow(4)`,
  },
  {
    id: 'dnb-loop',
    name: 'DnB Loop',
    builtIn: true,
    code: `stack(
  s("808bd ~ 808bd ~, ~ 808sd ~ 808sd, hh*8")
    .speed(1.5),
  note("c2 ~ ~ c2 ~ ~ eb2 ~")
    .s("sawtooth")
    .cutoff(400).decay(.08).sustain(0)
).cpm(87)`,
  },
  {
    id: 'generative',
    name: 'Generative',
    builtIn: true,
    code: `n(irand(8))
  .scale("C:minor:pentatonic")
  .s("triangle")
  .cutoff(perlin.range(300, 2000))
  .delay(.3).delaytime(.2)
  .room(.6)
  .fast(2)
  .sometimes(x => x.rev())`,
  },
  {
    id: 'polyrhythm',
    name: 'West African',
    builtIn: true,
    code: `stack(
  s("bd(3,8)").gain(.9),
  s("hh(5,8)").gain(.5),
  s("sd(2,5)").gain(.7),
  n("0 2 [4 5] 7").scale("C:minor:pentatonic")
    .s("kalimba").gain(.4).room(.5)
)`,
  },
]
