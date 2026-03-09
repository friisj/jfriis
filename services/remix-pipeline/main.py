"""
Remix Pipeline — Python Microservice

Handles stages 1-3 of the Remix pipeline:
  1. Stem Separation (Demucs)
  2. Analysis (librosa)
  3. Chopping (custom, librosa-assisted)

Receives source audio + recipe config, returns a SampleBank with
audio files in a local output directory. File serving is handled
via FastAPI's static file support for development.
"""

import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models import RecipeInput, ProcessResponse
from pipeline.separation import separate_stems
from pipeline.analysis import analyze_stems
from pipeline.chopping import chop_stems

OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Remix Pipeline", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve output files for development (stems, chops)
app.mount("/files", StaticFiles(directory=str(OUTPUT_DIR)), name="files")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/process", response_model=ProcessResponse)
async def process(
    audio: UploadFile = File(...),
    recipe: str = Form(...),
):
    """
    Run stages 1-3 of the Remix pipeline.

    Accepts source audio file + recipe JSON string.
    Returns SampleBank metadata with URLs to stem and chop audio files
    served from the /files endpoint.
    """
    job_id = str(uuid.uuid4())
    recipe_input = RecipeInput.model_validate_json(recipe)
    job_dir = OUTPUT_DIR / job_id

    # Stage 1: Stem Separation
    stem_set = await separate_stems(
        audio, recipe_input.separation, job_id=job_id, output_dir=OUTPUT_DIR
    )

    # Stage 2: Analysis (needs local filesystem paths)
    analysis = await analyze_stems(stem_set, recipe_input.analysis)

    # Stage 3: Chopping (needs local filesystem paths)
    sample_bank = await chop_stems(
        stem_set, analysis, recipe_input.chopping, output_dir=job_dir
    )

    # Rewrite all local paths to served URLs (after all stages complete)
    for stem in stem_set.stems:
        stem.audio_url = _to_url(stem.audio_url)
    for stem_chops in sample_bank.stems:
        for chop in stem_chops.chops:
            chop.audio_url = _to_url(chop.audio_url)

    return ProcessResponse(
        job_id=job_id,
        sample_bank=sample_bank,
        stem_urls=[s.audio_url for s in stem_set.stems],
        chop_urls=[
            chop.audio_url
            for sc in sample_bank.stems
            for chop in sc.chops
        ],
    )


def _to_url(local_path: str) -> str:
    """Convert a local file path to a served URL path."""
    try:
        rel = Path(local_path).relative_to(OUTPUT_DIR)
        return f"/files/{rel}"
    except ValueError:
        return local_path
