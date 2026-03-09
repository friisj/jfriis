"""
Stage 1: Stem Separation

Uses Demucs to decompose source audio into constituent stems.
Saves separated stems to local output directory (upload to storage handled by caller).
"""

import tempfile
import uuid
from pathlib import Path

import soundfile as sf
import torch
import torchaudio
from demucs.api import Separator, save_audio
from fastapi import UploadFile

from models import SeparationConfig, SourceInfo, Stem, StemSet, StemType

# Cache separators by model name to avoid reloading on every request
_separator_cache: dict[str, Separator] = {}


def _get_separator(model: str) -> Separator:
    """Get or create a cached Separator instance for the given model."""
    if model not in _separator_cache:
        _separator_cache[model] = Separator(model=model)
    return _separator_cache[model]


async def separate_stems(
    audio: UploadFile,
    config: SeparationConfig,
    job_id: str | None = None,
    output_dir: Path | None = None,
) -> StemSet:
    """
    Separate source audio into stems using Demucs.

    Args:
        audio: Uploaded source audio file
        config: Separation recipe parameters (model, stem count)
        job_id: Optional job ID for organizing output files
        output_dir: Optional base directory for output files

    Returns:
        StemSet with local file paths to separated stems
    """
    job_id = job_id or str(uuid.uuid4())
    output_dir = output_dir or Path(tempfile.mkdtemp(prefix="remix-"))
    stems_dir = output_dir / job_id / "stems"
    stems_dir.mkdir(parents=True, exist_ok=True)

    # Save uploaded file to temp location
    source_path = output_dir / job_id / f"source_{audio.filename}"
    source_path.parent.mkdir(parents=True, exist_ok=True)
    content = await audio.read()
    source_path.write_bytes(content)

    # Get source audio metadata
    info = sf.info(str(source_path))
    source_info = SourceInfo(
        filename=audio.filename or "unknown",
        duration_ms=info.duration * 1000,
        sample_rate=info.samplerate,
        channels=info.channels,
    )

    # Run Demucs separation
    separator = _get_separator(config.model)
    origin, separated = separator.separate_audio_file(str(source_path))

    # Save each stem and build metadata
    stems: list[Stem] = []
    sample_rate = separator.samplerate

    for stem_name, stem_tensor in separated.items():
        # stem_tensor shape: (channels, time)
        stem_path = stems_dir / f"{stem_name}.wav"
        save_audio(stem_tensor, str(stem_path), samplerate=sample_rate)

        peak = stem_tensor.abs().max().item()
        duration_ms = (stem_tensor.shape[-1] / sample_rate) * 1000

        # Map Demucs stem name to our StemType enum
        try:
            stem_type = StemType(stem_name)
        except ValueError:
            # Unknown stem name — map to 'other'
            stem_type = StemType.other

        stems.append(
            Stem(
                type=stem_type,
                audio_url=str(stem_path),  # local path for now; caller uploads to storage
                duration_ms=duration_ms,
                peak_amplitude=peak,
            )
        )

    return StemSet(source=source_info, stems=stems)
