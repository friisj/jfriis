/**
 * ChordTheory - Music theory utilities for harmonic generation
 *
 * Provides chord analysis, transposition, and relationship mapping
 * using the tonal library as foundation.
 *
 * Includes onder-style chord definitions with full voicings.
 */

// Fixed: Removed Distance import (doesn't exist in tonal)
import { Chord, Note, Interval } from 'tonal';

/**
 * Chord definition with full voicing (onder-style)
 * Each chord has 6 notes spanning 3 octaves for rich, lush pads
 */
export interface ChordVoicing {
  notes: string[];  // 6 notes: ['C3', 'E3', 'G3', 'C4', 'E4', 'G4']
  bass: string;     // Bass note in octave 2: 'C2'
}

/**
 * Comprehensive chord voicing library (ported from onder)
 * Includes major, minor, suspended, and extended chords
 */
export const CHORD_VOICINGS: { [symbol: string]: ChordVoicing } = {
  // Major chords
  'Cmaj': { notes: ['C3', 'E3', 'G3', 'C4', 'E4', 'G4'], bass: 'C2' },
  'Fmaj': { notes: ['F3', 'A3', 'C4', 'F4', 'A4', 'C5'], bass: 'F2' },
  'Gmaj': { notes: ['G3', 'B3', 'D4', 'G4', 'B4', 'D5'], bass: 'G2' },
  'Dmaj': { notes: ['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'], bass: 'D2' },
  'Amaj': { notes: ['A3', 'C#4', 'E4', 'A4', 'C#5', 'E5'], bass: 'A2' },
  'Emaj': { notes: ['E3', 'G#3', 'B3', 'E4', 'G#4', 'B4'], bass: 'E2' },
  'Bmaj': { notes: ['B3', 'D#4', 'F#4', 'B4', 'D#5', 'F#5'], bass: 'B2' },
  'Ebmaj': { notes: ['Eb3', 'G3', 'Bb3', 'Eb4', 'G4', 'Bb4'], bass: 'Eb2' },
  'Abmaj': { notes: ['Ab3', 'C4', 'Eb4', 'Ab4', 'C5', 'Eb5'], bass: 'Ab2' },
  'Dbmaj': { notes: ['Db3', 'F3', 'Ab3', 'Db4', 'F4', 'Ab4'], bass: 'Db2' },

  // Minor chords
  'Amin': { notes: ['A3', 'C4', 'E4', 'A4', 'C5', 'E5'], bass: 'A2' },
  'Dmin': { notes: ['D3', 'F3', 'A3', 'D4', 'F4', 'A4'], bass: 'D2' },
  'Em': { notes: ['E3', 'G3', 'B3', 'E4', 'G4', 'B4'], bass: 'E2' },
  'Bmin': { notes: ['B3', 'D4', 'F#4', 'B4', 'D5', 'F#5'], bass: 'B2' },
  'F#min': { notes: ['F#3', 'A3', 'C#4', 'F#4', 'A4', 'C#5'], bass: 'F#2' },
  'C#min': { notes: ['C#3', 'E3', 'G#3', 'C#4', 'E4', 'G#4'], bass: 'C#2' },
  'Gmin': { notes: ['G3', 'Bb3', 'D4', 'G4', 'Bb4', 'D5'], bass: 'G2' },
  'Cmin': { notes: ['C3', 'Eb3', 'G3', 'C4', 'Eb4', 'G4'], bass: 'C2' },
  'Fmin': { notes: ['F3', 'Ab3', 'C4', 'F4', 'Ab4', 'C5'], bass: 'F2' },

  // Suspended chords
  'Csus2': { notes: ['C3', 'D3', 'G3', 'C4', 'D4', 'G4'], bass: 'C2' },
  'Fsus4': { notes: ['F3', 'Bb3', 'C4', 'F4', 'Bb4', 'C5'], bass: 'F2' },
  'Gsus4': { notes: ['G3', 'C4', 'D4', 'G4', 'C5', 'D5'], bass: 'G2' },
  'Dsus4': { notes: ['D3', 'G3', 'A3', 'D4', 'G4', 'A4'], bass: 'D2' },
  'Asus4': { notes: ['A3', 'D4', 'E4', 'A4', 'D5', 'E5'], bass: 'A2' },

  // Major 7th chords
  'Cmaj7': { notes: ['C3', 'E3', 'G3', 'B3', 'C4', 'E4'], bass: 'C2' },
  'Fmaj7': { notes: ['F3', 'A3', 'C4', 'E4', 'F4', 'A4'], bass: 'F2' },
  'Gmaj7': { notes: ['G3', 'B3', 'D4', 'F#4', 'G4', 'B4'], bass: 'G2' },
  'Dmaj7': { notes: ['D3', 'F#3', 'A3', 'C#4', 'D4', 'F#4'], bass: 'D2' },
  'Amaj7': { notes: ['A3', 'C#4', 'E4', 'G#4', 'A4', 'C#5'], bass: 'A2' },
  'Emaj7': { notes: ['E3', 'G#3', 'B3', 'D#4', 'E4', 'G#4'], bass: 'E2' },
  'Ebmaj7': { notes: ['Eb3', 'G3', 'Bb3', 'D4', 'Eb4', 'G4'], bass: 'Eb2' },
  'Abmaj7': { notes: ['Ab3', 'C4', 'Eb4', 'G4', 'Ab4', 'C5'], bass: 'Ab2' },

  // Minor 7th chords
  'Am7': { notes: ['A3', 'C4', 'E4', 'G4', 'A4', 'C5'], bass: 'A2' },
  'Dm7': { notes: ['D3', 'F3', 'A3', 'C4', 'D4', 'F4'], bass: 'D2' },
  'Em7': { notes: ['E3', 'G3', 'B3', 'D4', 'E4', 'G4'], bass: 'E2' },
  'Bm7': { notes: ['B3', 'D4', 'F#4', 'A4', 'B4', 'D5'], bass: 'B2' },
  'F#m7': { notes: ['F#3', 'A3', 'C#4', 'E4', 'F#4', 'A4'], bass: 'F#2' },
  'C#m7': { notes: ['C#3', 'E3', 'G#3', 'B3', 'C#4', 'E4'], bass: 'C#2' },
  'Gm7': { notes: ['G3', 'Bb3', 'D4', 'F4', 'G4', 'Bb4'], bass: 'G2' },
  'Cm7': { notes: ['C3', 'Eb3', 'G3', 'Bb3', 'C4', 'Eb4'], bass: 'C2' },
  'Fm7': { notes: ['F3', 'Ab3', 'C4', 'Eb4', 'F4', 'Ab4'], bass: 'F2' },

  // Extended chords (9th, 11th, 13th)
  'Cmaj9': { notes: ['C3', 'E3', 'G3', 'B3', 'D4', 'E4'], bass: 'C2' },
  'Fmaj9': { notes: ['F3', 'A3', 'C4', 'E4', 'G4', 'A4'], bass: 'F2' },
  'Gmaj9': { notes: ['G3', 'B3', 'D4', 'F#4', 'A4', 'B4'], bass: 'G2' },
  'Ebmaj9': { notes: ['Eb3', 'G3', 'Bb3', 'D4', 'F4', 'G4'], bass: 'Eb2' },
  'Am9': { notes: ['A3', 'C4', 'E4', 'G4', 'B4', 'C5'], bass: 'A2' },
  'Dm9': { notes: ['D3', 'F3', 'A3', 'C4', 'E4', 'F4'], bass: 'D2' },
  'Em9': { notes: ['E3', 'G3', 'B3', 'D4', 'F#4', 'G4'], bass: 'E2' },
  'Bb13': { notes: ['Bb3', 'D4', 'F4', 'Ab4', 'C5', 'G5'], bass: 'Bb2' },
  'G13': { notes: ['G3', 'B3', 'D4', 'F4', 'A4', 'E5'], bass: 'G2' },

  // Dominant 7th chords
  'G7': { notes: ['G3', 'B3', 'D4', 'F4', 'G4', 'B4'], bass: 'G2' },
  'D7': { notes: ['D3', 'F#3', 'A3', 'C4', 'D4', 'F#4'], bass: 'D2' },
  'A7': { notes: ['A3', 'C#4', 'E4', 'G4', 'A4', 'C#5'], bass: 'A2' },
  'E7': { notes: ['E3', 'G#3', 'B3', 'D4', 'E4', 'G#4'], bass: 'E2' },
  'B7': { notes: ['B3', 'D#4', 'F#4', 'A4', 'B4', 'D#5'], bass: 'B2' },
  'F7': { notes: ['F3', 'A3', 'C4', 'Eb4', 'F4', 'A4'], bass: 'F2' },
  'C7': { notes: ['C3', 'E3', 'G3', 'Bb3', 'C4', 'E4'], bass: 'C2' },
  'Bb7': { notes: ['Bb3', 'D4', 'F4', 'Ab4', 'Bb4', 'D5'], bass: 'Bb2' },
  'Eb7': { notes: ['Eb3', 'G3', 'Bb3', 'Db4', 'Eb4', 'G4'], bass: 'Eb2' },
  'Ab7': { notes: ['Ab3', 'C4', 'Eb4', 'Gb4', 'Ab4', 'C5'], bass: 'Ab2' },

  // Simplified chord names (map to full versions)
  'C': { notes: ['C3', 'E3', 'G3', 'C4', 'E4', 'G4'], bass: 'C2' },
  'F': { notes: ['F3', 'A3', 'C4', 'F4', 'A4', 'C5'], bass: 'F2' },
  'G': { notes: ['G3', 'B3', 'D4', 'G4', 'B4', 'D5'], bass: 'G2' },
  'D': { notes: ['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'], bass: 'D2' },
  'A': { notes: ['A3', 'C#4', 'E4', 'A4', 'C#5', 'E5'], bass: 'A2' },
  'E': { notes: ['E3', 'G#3', 'B3', 'E4', 'G#4', 'B4'], bass: 'E2' },
  'B': { notes: ['B3', 'D#4', 'F#4', 'B4', 'D#5', 'F#5'], bass: 'B2' },
  'Am': { notes: ['A3', 'C4', 'E4', 'A4', 'C5', 'E5'], bass: 'A2' },
  'Dm': { notes: ['D3', 'F3', 'A3', 'D4', 'F4', 'A4'], bass: 'D2' },
  'Gm': { notes: ['G3', 'Bb3', 'D4', 'G4', 'Bb4', 'D5'], bass: 'G2' },
  'Cm': { notes: ['C3', 'Eb3', 'G3', 'C4', 'Eb4', 'G4'], bass: 'C2' },
  'Fm': { notes: ['F3', 'Ab3', 'C4', 'F4', 'Ab4', 'C5'], bass: 'F2' },
};

export interface ChordTransition {
  fromChord: string;
  toChord: string;
  probability: number;
  context: 'tonic' | 'subdominant' | 'dominant' | 'relative' | 'parallel' | 'chromatic';
}

export interface ChordAnalysis {
  root: string;
  type: string;
  notes: string[];
  intervals: string[];
  quality: 'major' | 'minor' | 'diminished' | 'augmented' | 'suspended' | 'other';
}

/**
 * Analyze a chord symbol and extract its components
 */
export function analyzeChord(chordSymbol: string): ChordAnalysis {
  const chord = Chord.get(chordSymbol);

  // Determine quality
  let quality: ChordAnalysis['quality'] = 'other';
  const type = chord.aliases[0] || chord.symbol;

  if (type.includes('maj') || (!type.includes('m') && !type.includes('dim'))) {
    quality = 'major';
  } else if (type.includes('m') && !type.includes('maj')) {
    quality = 'minor';
  } else if (type.includes('dim')) {
    quality = 'diminished';
  } else if (type.includes('aug')) {
    quality = 'augmented';
  } else if (type.includes('sus')) {
    quality = 'suspended';
  }

  return {
    root: chord.tonic || 'C',
    type: chord.aliases[0] || chord.symbol,
    notes: chord.notes,
    intervals: chord.intervals,
    quality
  };
}

/**
 * Get notes for a chord in a specific octave
 * Uses onder-style voicings when available for richer sound
 */
export function getChordNotes(chordSymbol: string, octave: number = 4): string[] {
  // Try to get voicing from onder library first
  const voicing = CHORD_VOICINGS[chordSymbol];
  if (voicing) {
    return voicing.notes;
  }

  // Fallback to tonal library for unknown chords
  const chord = Chord.get(chordSymbol);
  if (chord.notes.length > 0) {
    return chord.notes.map(note => `${note}${octave}`);
  }

  // If still no notes, return a safe default (C major)
  console.warn(`⚠️ Unknown chord: ${chordSymbol}, falling back to C major`);
  return ['C3', 'E3', 'G3', 'C4', 'E4', 'G4'];
}

/**
 * Transpose a chord by semitones
 */
export function transposeChord(chordSymbol: string, semitones: number): string {
  const chord = Chord.get(chordSymbol);
  if (!chord.tonic) return chordSymbol;

  const newRoot = Note.transpose(chord.tonic, Interval.fromSemitones(semitones));
  return `${newRoot}${chord.aliases[0] || ''}`;
}

/**
 * Get relative minor/major of a chord
 */
export function getRelativeChord(chordSymbol: string): string {
  const analysis = analyzeChord(chordSymbol);

  if (analysis.quality === 'major') {
    // Relative minor is 3 semitones down (minor 3rd)
    const newRoot = Note.transpose(analysis.root, '-3m');
    return `${newRoot}m`;
  } else if (analysis.quality === 'minor') {
    // Relative major is 3 semitones up
    const newRoot = Note.transpose(analysis.root, '3m');
    return newRoot;
  }

  return chordSymbol;
}

/**
 * Get parallel minor/major of a chord
 */
export function getParallelChord(chordSymbol: string): string {
  const analysis = analyzeChord(chordSymbol);

  if (analysis.quality === 'major') {
    return `${analysis.root}m`;
  } else if (analysis.quality === 'minor') {
    return analysis.root; // Major
  }

  return chordSymbol;
}

/**
 * Build chord relationships for a key
 * Returns common chord progressions and transitions
 */
export function buildKeyChordRelationships(keySignature: string): Map<string, ChordTransition[]> {
  const isMinor = keySignature.includes('m');
  const root = keySignature.replace('m', '');

  const relationships = new Map<string, ChordTransition[]>();

  if (isMinor) {
    // Minor key: i, ii°, III, iv, v, VI, VII
    const chords = getMinorKeyChords(root);

    // i (tonic minor)
    relationships.set(chords[0], [
      { fromChord: chords[0], toChord: chords[3], probability: 0.6, context: 'subdominant' },
      { fromChord: chords[0], toChord: chords[4], probability: 0.7, context: 'dominant' },
      { fromChord: chords[0], toChord: chords[5], probability: 0.5, context: 'relative' }
    ]);

    // iv (subdominant)
    relationships.set(chords[3], [
      { fromChord: chords[3], toChord: chords[0], probability: 0.5, context: 'tonic' },
      { fromChord: chords[3], toChord: chords[4], probability: 0.7, context: 'dominant' },
      { fromChord: chords[3], toChord: chords[6], probability: 0.4, context: 'chromatic' }
    ]);

    // v (dominant)
    relationships.set(chords[4], [
      { fromChord: chords[4], toChord: chords[0], probability: 0.8, context: 'tonic' },
      { fromChord: chords[4], toChord: chords[5], probability: 0.4, context: 'relative' }
    ]);

    // VI (relative major)
    relationships.set(chords[5], [
      { fromChord: chords[5], toChord: chords[3], probability: 0.6, context: 'subdominant' },
      { fromChord: chords[5], toChord: chords[6], probability: 0.5, context: 'chromatic' },
      { fromChord: chords[5], toChord: chords[0], probability: 0.4, context: 'tonic' }
    ]);

    // VII (leading tone)
    relationships.set(chords[6], [
      { fromChord: chords[6], toChord: chords[0], probability: 0.8, context: 'tonic' },
      { fromChord: chords[6], toChord: chords[5], probability: 0.5, context: 'relative' }
    ]);

  } else {
    // Major key: I, ii, iii, IV, V, vi, vii°
    const chords = getMajorKeyChords(root);

    // I (tonic)
    relationships.set(chords[0], [
      { fromChord: chords[0], toChord: chords[5], probability: 0.7, context: 'relative' },
      { fromChord: chords[0], toChord: chords[3], probability: 0.6, context: 'subdominant' },
      { fromChord: chords[0], toChord: chords[4], probability: 0.5, context: 'dominant' }
    ]);

    // ii (supertonic)
    relationships.set(chords[1], [
      { fromChord: chords[1], toChord: chords[4], probability: 0.8, context: 'dominant' },
      { fromChord: chords[1], toChord: chords[3], probability: 0.5, context: 'subdominant' }
    ]);

    // IV (subdominant)
    relationships.set(chords[3], [
      { fromChord: chords[3], toChord: chords[0], probability: 0.5, context: 'tonic' },
      { fromChord: chords[3], toChord: chords[4], probability: 0.7, context: 'dominant' },
      { fromChord: chords[3], toChord: chords[1], probability: 0.4, context: 'chromatic' }
    ]);

    // V (dominant)
    relationships.set(chords[4], [
      { fromChord: chords[4], toChord: chords[0], probability: 0.9, context: 'tonic' },
      { fromChord: chords[4], toChord: chords[5], probability: 0.5, context: 'relative' }
    ]);

    // vi (relative minor)
    relationships.set(chords[5], [
      { fromChord: chords[5], toChord: chords[3], probability: 0.7, context: 'subdominant' },
      { fromChord: chords[5], toChord: chords[4], probability: 0.6, context: 'dominant' },
      { fromChord: chords[5], toChord: chords[1], probability: 0.5, context: 'chromatic' }
    ]);
  }

  return relationships;
}

/**
 * Get all chords in a major key (diatonic)
 */
export function getMajorKeyChords(root: string): string[] {
  return [
    root,                                    // I
    `${Note.transpose(root, '2M')}m`,       // ii
    `${Note.transpose(root, '3M')}m`,       // iii
    Note.transpose(root, '4P'),             // IV
    Note.transpose(root, '5P'),             // V
    `${Note.transpose(root, '6M')}m`,       // vi
    `${Note.transpose(root, '7M')}dim`      // vii°
  ];
}

/**
 * Get all chords in a minor key (natural minor)
 */
export function getMinorKeyChords(root: string): string[] {
  return [
    `${root}m`,                             // i
    `${Note.transpose(root, '2M')}dim`,    // ii°
    Note.transpose(root, '3m'),             // III
    `${Note.transpose(root, '4P')}m`,       // iv
    `${Note.transpose(root, '5P')}m`,       // v
    Note.transpose(root, '6m'),             // VI
    Note.transpose(root, '7m')              // VII
  ];
}

/**
 * Calculate harmonic distance between two chords (0-1, closer = more similar)
 */
export function calculateHarmonicDistance(chord1: string, chord2: string): number {
  const analysis1 = analyzeChord(chord1);
  const analysis2 = analyzeChord(chord2);

  // Root distance - calculate interval distance and get semitones
  const interval = Interval.distance(analysis1.root, analysis2.root);
  const semitones = Interval.semitones(interval);
  const rootDistance = Math.abs(semitones || 0) / 12;

  // Quality similarity
  const qualitySimilarity = analysis1.quality === analysis2.quality ? 0 : 0.5;

  // Combined distance (lower is closer)
  return (rootDistance + qualitySimilarity) / 2;
}

/**
 * Get a random note from a chord's scale
 */
export function getRandomChordNote(chordSymbol: string, octave: number = 4): string {
  const notes = getChordNotes(chordSymbol, octave);
  return notes[Math.floor(Math.random() * notes.length)];
}

/**
 * Convert a chord to its brightest variation (add 7th, 9th, etc.)
 */
export function brightenChord(chordSymbol: string): string {
  const analysis = analyzeChord(chordSymbol);

  if (analysis.quality === 'major') {
    return `${analysis.root}maj9`;
  } else if (analysis.quality === 'minor') {
    return `${analysis.root}m7`;
  }

  return chordSymbol;
}

/**
 * Convert a chord to its darkest variation
 */
export function darkenChord(chordSymbol: string): string {
  const analysis = analyzeChord(chordSymbol);

  if (analysis.quality === 'major') {
    return `${analysis.root}m`;
  } else if (analysis.quality === 'minor') {
    return `${analysis.root}m7b5`;
  }

  return chordSymbol;
}
