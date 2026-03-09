"""
Remix Pipeline — Python Microservice

Handles stages 1-3 of the Remix pipeline:
  1. Stem Separation (Demucs)
  2. Analysis (librosa)
  3. Chopping (custom, librosa-assisted)

Receives source audio + recipe config, returns a SampleBank with
audio files uploaded to Supabase storage.
"""

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from models import RecipeInput, ProcessResponse
from pipeline.separation import separate_stems
from pipeline.analysis import analyze_stems
from pipeline.chopping import chop_stems

app = FastAPI(title="Remix Pipeline", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


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
    Returns SampleBank metadata + URLs to stem and chop audio files.
    """
    recipe_input = RecipeInput.model_validate_json(recipe)

    # Stage 1: Stem Separation
    stem_set = await separate_stems(audio, recipe_input.separation)

    # Stage 2: Analysis
    analysis = await analyze_stems(stem_set, recipe_input.analysis)

    # Stage 3: Chopping
    sample_bank = await chop_stems(stem_set, analysis, recipe_input.chopping)

    return ProcessResponse(
        sample_bank=sample_bank,
        stem_urls=[s.audio_url for s in stem_set.stems],
        chop_urls=[
            chop.audio_url
            for stem_chops in sample_bank.stems
            for chop in stem_chops.chops
        ],
    )
