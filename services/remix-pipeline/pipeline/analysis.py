"""
Stage 2: Audio Analysis

Uses librosa to extract musical properties from separated stems:
BPM, key, transients, energy maps, spectral features.
"""

from pathlib import Path

import librosa
import numpy as np

from models import (
    AnalysisConfig,
    AnalysisResult,
    EnergyPoint,
    StemAnalysis,
    StemSet,
    StemType,
    Transient,
)

# Key name mapping from chroma index to key string
_KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def _estimate_key(y: np.ndarray, sr: int) -> tuple[str, float]:
    """Estimate musical key using chromagram correlation with key profiles."""
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = chroma.mean(axis=1)

    # Krumhansl-Kessler major and minor key profiles
    major_profile = np.array(
        [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
    )
    minor_profile = np.array(
        [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
    )

    best_corr = -1.0
    best_key = "C"

    for shift in range(12):
        shifted_chroma = np.roll(chroma_mean, -shift)
        major_corr = float(np.corrcoef(shifted_chroma, major_profile)[0, 1])
        minor_corr = float(np.corrcoef(shifted_chroma, minor_profile)[0, 1])

        if major_corr > best_corr:
            best_corr = major_corr
            best_key = _KEY_NAMES[shift]
        if minor_corr > best_corr:
            best_corr = minor_corr
            best_key = f"{_KEY_NAMES[shift]}m"

    confidence = max(0.0, min(1.0, (best_corr + 1) / 2))  # normalize -1..1 to 0..1
    return best_key, confidence


async def analyze_stems(stem_set: StemSet, config: AnalysisConfig) -> AnalysisResult:
    """
    Analyze separated stems for musical properties.

    Args:
        stem_set: Separated stems from stage 1
        config: Analysis recipe parameters

    Returns:
        AnalysisResult with BPM, key, transients, energy maps per stem
    """
    # Use drums stem for BPM detection (most reliable), fall back to first stem
    drums_stem = next((s for s in stem_set.stems if s.type == StemType.drums), None)
    bpm_stem = drums_stem or stem_set.stems[0]

    y_bpm, sr_bpm = librosa.load(bpm_stem.audio_url, sr=None)
    tempo, beat_frames = librosa.beat.beat_track(y=y_bpm, sr=sr_bpm)
    bpm = float(np.atleast_1d(tempo)[0])

    # BPM confidence: based on autocorrelation strength
    onset_env = librosa.onset.onset_strength(y=y_bpm, sr=sr_bpm)
    ac = librosa.autocorrelate(onset_env, max_size=len(onset_env))
    ac_norm = ac / (ac[0] + 1e-10)
    bpm_confidence = float(min(1.0, max(0.0, ac_norm[1:].max())))

    # Key estimation from melodic stems
    key = "C"
    key_confidence = 0.0
    if config.detect_key:
        melodic_stem = next(
            (
                s
                for s in stem_set.stems
                if s.type in (StemType.other, StemType.piano, StemType.guitar)
            ),
            stem_set.stems[0],
        )
        y_key, sr_key = librosa.load(melodic_stem.audio_url, sr=None)
        key, key_confidence = _estimate_key(y_key, sr_key)

    # Assume 4/4 time signature
    time_signature: tuple[int, int] = (4, 4)
    bar_duration_ms = (60_000 / bpm) * time_signature[0]

    # Per-stem analysis
    stem_analyses: list[StemAnalysis] = []

    for stem in stem_set.stems:
        y, sr = librosa.load(stem.audio_url, sr=None)
        duration_s = len(y) / sr

        # Onset detection → transients
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units="frames")
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        onset_strengths = librosa.onset.onset_strength(y=y, sr=sr)

        transients: list[Transient] = []
        for frame, time_s in zip(onset_frames, onset_times):
            strength = float(onset_strengths[min(frame, len(onset_strengths) - 1)])
            # Normalize strength to 0-1
            max_strength = float(onset_strengths.max()) if len(onset_strengths) > 0 else 1.0
            norm_strength = strength / (max_strength + 1e-10)
            transients.append(
                Transient(time_ms=float(time_s * 1000), strength=norm_strength)
            )

        # Energy map — per-bar or per-beat
        bar_duration_s = bar_duration_ms / 1000
        if config.energy_resolution == "beat":
            resolution_s = bar_duration_s / time_signature[0]
        else:
            resolution_s = bar_duration_s

        energy_map: list[EnergyPoint] = []
        num_segments = max(1, int(duration_s / resolution_s))

        for i in range(num_segments):
            start_sample = int(i * resolution_s * sr)
            end_sample = int(min((i + 1) * resolution_s * sr, len(y)))
            segment = y[start_sample:end_sample]

            if len(segment) == 0:
                continue

            rms = float(np.sqrt(np.mean(segment**2)))
            energy_map.append(
                EnergyPoint(
                    bar=i + 1,
                    time_ms=float(i * resolution_s * 1000),
                    energy=rms,
                )
            )

        # Normalize energy to 0-1
        if energy_map:
            max_energy = max(ep.energy for ep in energy_map)
            if max_energy > 0:
                for ep in energy_map:
                    ep.energy = ep.energy / max_energy

        # Spectral centroid and RMS
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        rms_feature = librosa.feature.rms(y=y)

        stem_analyses.append(
            StemAnalysis(
                stem_type=stem.type,
                transients=transients,
                energy_map=energy_map,
                spectral_centroid_mean=float(spectral_centroid.mean()),
                rms_mean=float(rms_feature.mean()),
            )
        )

    return AnalysisResult(
        bpm=bpm,
        bpm_confidence=bpm_confidence,
        key=key,
        key_confidence=key_confidence,
        time_signature=time_signature,
        bar_duration_ms=bar_duration_ms,
        stems=stem_analyses,
    )
