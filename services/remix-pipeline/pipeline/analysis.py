"""
Stage 2: Audio Analysis

Uses librosa to extract musical properties from separated stems:
BPM, key, transients, energy maps, spectral features.
"""

from models import AnalysisConfig, AnalysisResult, StemSet


async def analyze_stems(stem_set: StemSet, config: AnalysisConfig) -> AnalysisResult:
    """
    Analyze separated stems for musical properties.

    Args:
        stem_set: Separated stems from stage 1
        config: Analysis recipe parameters (key detection, energy resolution)

    Returns:
        AnalysisResult with BPM, key, transients, energy maps per stem
    """
    # TODO: Implementation
    # 1. Download stem audio files from URLs (or use local paths if available)
    # 2. Run librosa BPM detection on drums stem (most reliable)
    # 3. Run librosa key estimation on melodic stems
    # 4. Run onset detection per stem → transient lists
    # 5. Compute per-bar (or per-beat) energy maps per stem
    # 6. Compute spectral centroid and RMS per stem
    # 7. Build and return AnalysisResult
    raise NotImplementedError("Audio analysis not yet implemented")
