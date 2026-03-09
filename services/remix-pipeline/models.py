"""
Pydantic models mirroring the TypeScript types in lib/types/remix.ts.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class StemType(str, Enum):
    drums = "drums"
    bass = "bass"
    vocals = "vocals"
    other = "other"
    guitar = "guitar"
    piano = "piano"


class ChopStrategy(str, Enum):
    transient = "transient"
    bar = "bar"
    hybrid = "hybrid"


# ---------------------------------------------------------------------------
# Recipe sub-models (input)
# ---------------------------------------------------------------------------


class SeparationConfig(BaseModel):
    model: str = "htdemucs"
    stems: int = 4


class AnalysisConfig(BaseModel):
    detect_key: bool = True
    energy_resolution: str = "bar"  # 'beat' | 'bar'


class StemChoppingOverride(BaseModel):
    strategy: Optional[ChopStrategy] = None
    min_length_ms: Optional[int] = None


class ChoppingConfig(BaseModel):
    strategy: ChopStrategy = ChopStrategy.hybrid
    min_length_ms: int = 500
    max_length_ms: int = 8000
    prefer_sustained: bool = False
    stems_override: Optional[dict[StemType, StemChoppingOverride]] = None


class RecipeInput(BaseModel):
    """Subset of Recipe relevant to the Python microservice (stages 1-3)."""

    separation: SeparationConfig = SeparationConfig()
    analysis: AnalysisConfig = AnalysisConfig()
    chopping: ChoppingConfig = ChoppingConfig()


# ---------------------------------------------------------------------------
# Stage output models
# ---------------------------------------------------------------------------


class SourceInfo(BaseModel):
    filename: str
    duration_ms: float
    sample_rate: int
    channels: int


class Stem(BaseModel):
    type: StemType
    audio_url: str
    duration_ms: float
    peak_amplitude: float


class StemSet(BaseModel):
    source: SourceInfo
    stems: list[Stem]


class Transient(BaseModel):
    time_ms: float
    strength: float


class EnergyPoint(BaseModel):
    bar: int
    time_ms: float
    energy: float


class StemAnalysis(BaseModel):
    stem_type: StemType
    transients: list[Transient]
    energy_map: list[EnergyPoint]
    spectral_centroid_mean: float
    rms_mean: float


class AnalysisResult(BaseModel):
    bpm: float
    bpm_confidence: float
    key: str
    key_confidence: float
    time_signature: tuple[int, int]
    bar_duration_ms: float
    stems: list[StemAnalysis]


class Chop(BaseModel):
    id: str
    stem_type: StemType
    audio_url: str
    start_ms: float
    end_ms: float
    duration_ms: float
    bar_start: int
    bar_end: int
    strategy: ChopStrategy
    energy: float
    has_transient_onset: bool
    tags: list[str]


class StemChops(BaseModel):
    stem_type: StemType
    chops: list[Chop]


class SampleBank(BaseModel):
    source: SourceInfo
    analysis: AnalysisResult
    stems: list[StemChops]


# ---------------------------------------------------------------------------
# API response
# ---------------------------------------------------------------------------


class ProcessResponse(BaseModel):
    job_id: str
    sample_bank: SampleBank
    stem_urls: list[str]
    chop_urls: list[str]
