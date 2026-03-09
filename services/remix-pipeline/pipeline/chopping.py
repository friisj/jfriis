"""
Stage 3: Chopping

Slices separated stems into discrete chops based on analysis data
and recipe configuration. Supports transient-based, bar-based,
and hybrid chopping strategies.
"""

from models import AnalysisResult, ChoppingConfig, SampleBank, StemSet


async def chop_stems(
    stem_set: StemSet,
    analysis: AnalysisResult,
    config: ChoppingConfig,
) -> SampleBank:
    """
    Chop separated stems into a sample bank.

    Args:
        stem_set: Separated stems from stage 1
        analysis: Musical analysis from stage 2
        config: Chopping recipe parameters (strategy, lengths, overrides)

    Returns:
        SampleBank with chop metadata and audio URLs
    """
    # TODO: Implementation
    # 1. For each stem, determine chopping strategy (global or per-stem override)
    # 2. Transient strategy: slice at onset positions from analysis
    # 3. Bar strategy: slice at bar boundaries (using BPM + time signature)
    # 4. Hybrid: transient chopping within bar grid
    # 5. Enforce min/max length constraints
    # 6. If prefer_sustained: merge short chops, bias toward bar boundaries
    # 7. Export each chop as individual audio file
    # 8. Upload to Supabase storage (remix-audio/{job_id}/chops/{stem_type}/)
    # 9. Tag each chop: 'sustained', 'percussive', 'tonal', 'noisy'
    # 10. Build and return SampleBank
    raise NotImplementedError("Chopping not yet implemented")
