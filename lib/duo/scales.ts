/** DUO synth — minor pentatonic scale mapping */

// Minor pentatonic intervals: root, b3, 4, 5, b7
const PENTATONIC_INTERVALS = [0, 3, 5, 7, 10];

// Two octaves of C minor pentatonic (default)
const BASE_NOTES = [
  'C3', 'Eb3', 'F3', 'G3', 'Bb3',
  'C4', 'Eb4', 'F4', 'G4', 'Bb4',
];

// All chromatic note names for transposition (canonical: prefer flats for display)
const CHROMATIC = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Map enharmonic equivalents to their canonical semitone offset
const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

/**
 * Parse a note string like "C4" into { name, octave, midi }
 */
function parseNote(note: string): { name: string; octave: number; midi: number } {
  const match = note.match(/^([A-G][b#]?)(\d+)$/);
  if (!match) throw new Error(`Invalid note: ${note}`);
  const name = match[1];
  const octave = parseInt(match[2]);
  const semitone = NOTE_TO_SEMITONE[name];
  if (semitone === undefined) throw new Error(`Unknown note name: ${name}`);
  const midi = (octave + 1) * 12 + semitone;
  return { name, octave, midi };
}

/**
 * Convert MIDI number back to note string
 */
function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = CHROMATIC[midi % 12];
  return `${name}${octave}`;
}

/**
 * Get the scale notes for a given transpose offset (in semitones).
 * Returns 10 notes (2 octaves of minor pentatonic).
 */
export function getScaleNotes(transpose: number = 0): string[] {
  return BASE_NOTES.map((note) => {
    const { midi } = parseNote(note);
    return midiToNote(midi + transpose);
  });
}

/**
 * Get a random note from the scale
 */
export function getRandomNote(transpose: number = 0): string {
  const notes = getScaleNotes(transpose);
  return notes[Math.floor(Math.random() * notes.length)];
}

/**
 * Note frequency (A4 = 440Hz)
 */
export function noteToFrequency(note: string): number {
  const { midi } = parseNote(note);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export { BASE_NOTES, PENTATONIC_INTERVALS, CHROMATIC };
