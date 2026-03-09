"""
Stage 1: Stem Separation

Uses Demucs to decompose source audio into constituent stems.
Saves separated stems to local output directory.
"""

import tempfile
import uuid
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch
from demucs.apply import apply_model
from demucs.pretrained import get_model
from fastapi import UploadFile

from models import SeparationConfig, SourceInfo, Stem, StemSet, StemType

# Cache models by name to avoid reloading on every request
_model_cache: dict[str, object] = {}


def _get_model(model_name: str):
    """Get or create a cached Demucs model instance."""
    if model_name not in _model_cache:
        model = get_model(model_name)
        model.eval()
        _model_cache[model_name] = model
    return _model_cache[model_name]


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

    # Load model
    model = _get_model(config.model)
    model_sr = model.samplerate  # typically 44100

    # Load audio using librosa (avoids torchcodec dependency)
    # librosa returns mono by default; load as multi-channel numpy array
    audio_data, sr = sf.read(str(source_path), always_2d=True)
    # audio_data shape: (samples, channels) — transpose to (channels, samples)
    audio_data = audio_data.T
    wav = torch.from_numpy(audio_data).float()

    # Resample if needed
    if sr != model_sr:
        # Use librosa for resampling
        resampled_channels = []
        for ch in range(wav.shape[0]):
            resampled = librosa.resample(wav[ch].numpy(), orig_sr=sr, target_sr=model_sr)
            resampled_channels.append(resampled)
        wav = torch.from_numpy(np.stack(resampled_channels)).float()

    # Normalize for better separation quality
    ref = wav.mean(0)
    wav_mean = ref.mean()
    wav_std = ref.std()
    wav_norm = (wav - wav_mean) / (wav_std + 1e-8)

    # Run separation
    # apply_model expects (batch, channels, time)
    with torch.no_grad():
        sources = apply_model(
            model,
            wav_norm[None],
            device="cpu",  # use CPU for compatibility; GPU if available
            split=True,
            overlap=0.25,
            progress=True,
        )

    # sources shape: (batch, num_sources, channels, time)
    sources = sources[0]  # remove batch dim → (num_sources, channels, time)

    # Denormalize
    sources = sources * (wav_std + 1e-8) + wav_mean

    # Save each stem
    stems: list[Stem] = []

    for i, stem_name in enumerate(model.sources):
        stem_tensor = sources[i]  # (channels, time)
        stem_path = stems_dir / f"{stem_name}.wav"

        # Save as WAV (channels, time) → (time, channels) for soundfile
        sf.write(str(stem_path), stem_tensor.cpu().numpy().T, model_sr)

        peak = float(stem_tensor.abs().max().item())
        duration_ms = (stem_tensor.shape[-1] / model_sr) * 1000

        # Map Demucs stem name to our StemType enum
        try:
            stem_type = StemType(stem_name)
        except ValueError:
            stem_type = StemType.other

        stems.append(
            Stem(
                type=stem_type,
                audio_url=str(stem_path),
                duration_ms=duration_ms,
                peak_amplitude=peak,
            )
        )

    return StemSet(source=source_info, stems=stems)
