"""
Stage 1: Stem Separation

Uses Demucs to decompose source audio into constituent stems.
Uploads separated stems to Supabase storage.
"""

from fastapi import UploadFile

from models import SeparationConfig, StemSet


async def separate_stems(audio: UploadFile, config: SeparationConfig) -> StemSet:
    """
    Separate source audio into stems using Demucs.

    Args:
        audio: Uploaded source audio file
        config: Separation recipe parameters (model, stem count)

    Returns:
        StemSet with URLs to separated stem audio files
    """
    # TODO: Implementation
    # 1. Save uploaded file to temp directory
    # 2. Run Demucs with specified model (htdemucs or htdemucs_6s)
    # 3. Upload separated stems to Supabase storage (remix-audio/{job_id}/stems/)
    # 4. Build and return StemSet with audio URLs and metadata
    raise NotImplementedError("Stem separation not yet implemented")
