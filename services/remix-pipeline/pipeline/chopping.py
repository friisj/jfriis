"""
Stage 3: Chopping

Slices separated stems into discrete chops based on analysis data
and recipe configuration. Supports transient-based, bar-based,
and hybrid chopping strategies.
"""

import uuid
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from models import (
    AnalysisResult,
    Chop,
    ChoppingConfig,
    ChopStrategy,
    SampleBank,
    StemChops,
    StemSet,
    StemType,
)


def _get_stem_config(
    config: ChoppingConfig, stem_type: StemType
) -> tuple[ChopStrategy, int, int]:
    """Get chopping parameters for a specific stem, applying overrides."""
    strategy = config.strategy
    min_length = config.min_length_ms
    max_length = config.max_length_ms

    if config.stems_override and stem_type in config.stems_override:
        override = config.stems_override[stem_type]
        if override.strategy is not None:
            strategy = override.strategy
        if override.min_length_ms is not None:
            min_length = override.min_length_ms

    return strategy, min_length, max_length


def _chop_at_boundaries(
    y: np.ndarray,
    sr: int,
    boundaries_ms: list[float],
    min_length_ms: int,
    max_length_ms: int,
    duration_ms: float,
) -> list[tuple[float, float]]:
    """Given boundary times, produce (start_ms, end_ms) pairs respecting length constraints."""
    # Add 0 and end if not present
    if not boundaries_ms or boundaries_ms[0] > 0:
        boundaries_ms = [0.0] + boundaries_ms
    if boundaries_ms[-1] < duration_ms:
        boundaries_ms.append(duration_ms)

    regions: list[tuple[float, float]] = []
    i = 0
    while i < len(boundaries_ms) - 1:
        start = boundaries_ms[i]
        end = boundaries_ms[i + 1]

        # Merge short regions forward
        while (end - start) < min_length_ms and i + 2 < len(boundaries_ms):
            i += 1
            end = boundaries_ms[i + 1]

        # Split overly long regions
        if (end - start) > max_length_ms:
            chunk_end = start + max_length_ms
            regions.append((start, chunk_end))
            # Insert a new boundary
            boundaries_ms.insert(i + 1, chunk_end)
        else:
            if (end - start) >= min_length_ms:
                regions.append((start, end))

        i += 1

    return regions


def _classify_chop(
    y_chop: np.ndarray, sr: int
) -> list[str]:
    """Auto-tag a chop based on its audio characteristics."""
    tags: list[str] = []

    if len(y_chop) < sr * 0.01:  # less than 10ms
        return ["transient"]

    rms = float(np.sqrt(np.mean(y_chop**2)))
    duration_s = len(y_chop) / sr

    # Percussive vs sustained: check attack/decay ratio
    envelope = np.abs(y_chop)
    peak_idx = int(np.argmax(envelope))
    peak_ratio = peak_idx / len(envelope) if len(envelope) > 0 else 0.5

    if peak_ratio < 0.15 and duration_s < 0.5:
        tags.append("percussive")
    elif duration_s > 1.0:
        tags.append("sustained")

    # Tonal vs noisy: spectral flatness
    spec_flat = librosa.feature.spectral_flatness(y=y_chop)
    mean_flatness = float(spec_flat.mean())
    if mean_flatness < 0.1:
        tags.append("tonal")
    elif mean_flatness > 0.5:
        tags.append("noisy")

    if not tags:
        tags.append("mixed")

    return tags


async def chop_stems(
    stem_set: StemSet,
    analysis: AnalysisResult,
    config: ChoppingConfig,
    output_dir: Path | None = None,
) -> SampleBank:
    """
    Chop separated stems into a sample bank.

    Args:
        stem_set: Separated stems from stage 1
        analysis: Musical analysis from stage 2
        config: Chopping recipe parameters
        output_dir: Directory to save chop audio files

    Returns:
        SampleBank with chop metadata and audio file paths
    """
    bar_duration_ms = analysis.bar_duration_ms
    all_stem_chops: list[StemChops] = []

    for stem in stem_set.stems:
        strategy, min_length_ms, max_length_ms = _get_stem_config(
            config, stem.type
        )

        y, sr = librosa.load(stem.audio_url, sr=None)
        duration_ms = (len(y) / sr) * 1000

        # Determine chop boundaries based on strategy
        stem_analysis = next(
            (sa for sa in analysis.stems if sa.stem_type == stem.type), None
        )

        if strategy == ChopStrategy.transient:
            # Use detected transient positions as boundaries
            if stem_analysis and stem_analysis.transients:
                boundaries = [t.time_ms for t in stem_analysis.transients]
            else:
                # Fallback: detect onsets directly
                onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
                onset_times = librosa.frames_to_time(onset_frames, sr=sr)
                boundaries = [float(t * 1000) for t in onset_times]

        elif strategy == ChopStrategy.bar:
            # Chop at bar boundaries
            num_bars = max(1, int(duration_ms / bar_duration_ms))
            boundaries = [i * bar_duration_ms for i in range(num_bars + 1)]

        else:  # hybrid
            # Bar grid as primary, transients as secondary within bars
            num_bars = max(1, int(duration_ms / bar_duration_ms))
            bar_boundaries = [i * bar_duration_ms for i in range(num_bars + 1)]

            if stem_analysis and stem_analysis.transients:
                transient_times = [t.time_ms for t in stem_analysis.transients]
            else:
                onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
                onset_times = librosa.frames_to_time(onset_frames, sr=sr)
                transient_times = [float(t * 1000) for t in onset_times]

            # Merge: use bar boundaries + transients that are far from bar boundaries
            boundaries = list(bar_boundaries)
            for t in transient_times:
                # Only add transient if it's > min_length_ms/2 away from nearest bar boundary
                nearest_bar = min(bar_boundaries, key=lambda b: abs(b - t))
                if abs(t - nearest_bar) > min_length_ms / 2:
                    boundaries.append(t)
            boundaries = sorted(set(boundaries))

        # Apply prefer_sustained: if set, bias toward bar boundaries and longer chops
        if config.prefer_sustained:
            min_length_ms = max(min_length_ms, int(bar_duration_ms))

        # Generate chop regions
        regions = _chop_at_boundaries(
            y, sr, boundaries, min_length_ms, max_length_ms, duration_ms
        )

        # Determine output directory for this stem's chops
        if output_dir:
            chops_dir = output_dir / "chops" / stem.type.value
        else:
            stem_path = Path(stem.audio_url)
            chops_dir = stem_path.parent.parent / "chops" / stem.type.value
        chops_dir.mkdir(parents=True, exist_ok=True)

        chops: list[Chop] = []
        for idx, (start_ms, end_ms) in enumerate(regions):
            start_sample = int((start_ms / 1000) * sr)
            end_sample = int((end_ms / 1000) * sr)
            y_chop = y[start_sample:end_sample]

            if len(y_chop) == 0:
                continue

            # Save chop audio
            chop_id = f"{stem.type.value}_{idx:03d}"
            chop_path = chops_dir / f"{chop_id}.wav"
            sf.write(str(chop_path), y_chop, sr)

            # Compute chop metadata
            energy = float(np.sqrt(np.mean(y_chop**2)))
            bar_start = max(1, int(start_ms / bar_duration_ms) + 1)
            bar_end = max(bar_start, int(end_ms / bar_duration_ms) + 1)

            # Check if chop starts with a transient
            has_onset = False
            if stem_analysis:
                has_onset = any(
                    abs(t.time_ms - start_ms) < 50  # within 50ms
                    for t in stem_analysis.transients
                )

            tags = _classify_chop(y_chop, sr)

            chops.append(
                Chop(
                    id=chop_id,
                    stem_type=stem.type,
                    audio_url=str(chop_path),
                    start_ms=start_ms,
                    end_ms=end_ms,
                    duration_ms=end_ms - start_ms,
                    bar_start=bar_start,
                    bar_end=bar_end,
                    strategy=strategy,
                    energy=energy,
                    has_transient_onset=has_onset,
                    tags=tags,
                )
            )

        all_stem_chops.append(
            StemChops(stem_type=stem.type, chops=chops)
        )

    return SampleBank(
        source=stem_set.source,
        analysis=analysis,
        stems=all_stem_chops,
    )
