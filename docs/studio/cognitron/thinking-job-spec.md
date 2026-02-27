# Thinking Job Pipeline — Implementation Spec

> Complete specification for rebuilding the Cognitron "thinking" job pipeline from scratch in another codebase. All prompts, API calls, data flow, and schema included verbatim.

---

## Overview

A **thinking job** is a 3-step linear chain that generates editorial/photojournalistic images from narrative briefs. It uses a thinking-capable LLM to reason about composition and style before generating.

```
Story + Photographer + Publication
  ↓
Step 1: Subject Translation  (LLM with thinking)
  ↓
Step 2: Creative Direction    (LLM with thinking)
  ↓
Step 3: Image Generation      (Gemini 3 Pro native image gen)
  ↓
Photorealistic editorial image
```

Each step persists its output progressively, so intermediate reasoning is always recoverable.

---

## 1. Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `story` | text | yes | Creative brief / narrative (e.g., "The hidden cost of cheap electronics") |
| `photographer` | text | yes | Real photographer name used as style anchor (e.g., "Edward Burtynsky") |
| `publication` | text | yes | Editorial context (e.g., "The New Yorker", "National Geographic") |
| `aspect_ratio` | text | no | Output ratio: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`. Default: `1:1` |
| `image_size` | text | no | Resolution: `1K` (~1024px), `2K` (~2048px), `4K` (~4096px). Default: `2K` |
| `style_hints` | text | no | Additional style guidance appended to step 2 prompt |

---

## 2. Database Schema

```sql
CREATE TABLE cog_thinking_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES cog_series(id) ON DELETE CASCADE,
  title TEXT,

  -- Inputs
  story TEXT NOT NULL,
  photographer TEXT NOT NULL,
  publication TEXT NOT NULL,
  aspect_ratio TEXT,
  image_size TEXT DEFAULT '2K',
  style_hints TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  -- Valid values: draft | running | completed | failed | cancelled

  -- Step outputs (written progressively during execution)
  derived_subject TEXT,        -- Step 1 output
  subject_thinking TEXT,       -- Step 1 reasoning trace
  creative_direction TEXT,     -- Step 2 output
  direction_thinking TEXT,     -- Step 2 reasoning trace
  generation_prompt TEXT,      -- Final prompt sent to image generator

  -- Result
  generated_image_id UUID REFERENCES cog_images(id) ON DELETE SET NULL,

  -- Execution tracking
  trace JSONB[] DEFAULT '{}',  -- Array of trace entries (timing, tokens, steps)
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Trace Entry Shape

Each element in the `trace` array:

```json
{
  "phase": "thinking",
  "step": "subject_translation | creative_direction | image_generation",
  "timestamp": "2026-02-24T12:00:00.000Z",
  "duration_ms": 3200,
  "tokens_in": 150,
  "tokens_out": 12,
  "detail": "Derived subject: e-waste processing facility"
}
```

---

## 3. Step 1 — Subject Translation

### Purpose

Extract a concrete, photographable subject from an abstract narrative brief.

### Model

Gemini with extended thinking (`gemini-3-pro-image-preview` via Vercel AI SDK `generateText`). Any thinking-capable model works — the key is that the model reasons about the mapping from narrative to visual subject.

### Prompts (verbatim)

**System:**
```
You extract the core photographable subject from a creative brief. Output a short, concrete noun phrase — the thing the camera will point at.

Examples:
- "The hidden cost of cheap electronics" -> "e-waste processing facility"
- "How AI is reshaping energy demand" -> "data centre"
- "The race for clean energy" -> "experimental fusion reactor"
- "Supply chain fragility exposed" -> "container port"
- "The new nuclear debate" -> "uranium mining"
- "Next-gen aviation takes shape" -> "aircraft manufacturing floor"
```

**User:**
```
Creative brief: "${story}"

What is the subject? Output only the noun phrase, nothing else.
```

### Output

- `derived_subject`: The model's text output (a noun phrase, e.g., "e-waste processing facility")
- `subject_thinking`: The model's reasoning/thinking trace (if available via `result.reasoning.text`)

### Persist

After this step completes, update the job record:
```
derived_subject = <model text output>
subject_thinking = <model reasoning trace, or null>
```

Append a trace entry with step `subject_translation`.

---

## 4. Step 2 — Creative Direction

### Purpose

Given the derived subject, produce a detailed shot description as if commissioning a real photographer for a specific publication. Rich enough that an image generator can recreate the exact shot.

### Model

Same thinking model as Step 1.

### Prompts (verbatim)

**System:**
```
You are a photo editor commissioning a shoot. You deeply understand photographic styles, editorial aesthetics, and how different photographers approach their subjects. Your job is to describe exactly how a specific photographer would shoot a given subject for a specific publication — in enough detail that an image generator could recreate the shot.
```

**User:**
```
How would ${photographer} shoot "${derived_subject}" for ${publication}?

Describe the shot in rich detail:
- **Composition**: framing, perspective, what's in the foreground/background, rule of thirds, leading lines
- **Lighting**: natural/artificial, direction, quality (hard/soft), color temperature, time of day
- **Mood**: emotional tone, atmosphere, tension
- **Color palette**: dominant colors, grade, saturation
- **What's in frame**: specific elements, props, environment details
- **What's NOT in frame**: what to exclude, what to leave to imagination
- **Technical**: lens choice, depth of field, grain/texture, format feel

Write this as a cohesive creative direction — a paragraph or two that reads like an art director's brief. Be specific enough that someone could recreate this exact shot.
```

If `style_hints` is provided, append to the user prompt before the final instruction:

```

Additional style guidance: ${styleHints}
```

### Output

- `creative_direction`: The model's text output (1-2 paragraphs of detailed shot description)
- `direction_thinking`: The model's reasoning trace

### Persist

```
creative_direction = <model text output>
direction_thinking = <model reasoning trace, or null>
```

Append a trace entry with step `creative_direction`.

---

## 5. Step 3 — Image Generation

### Purpose

Generate a photorealistic image from the creative direction.

### Model

Gemini 3 Pro Image Preview (`gemini-3-pro-image-preview`) via the Google Generative AI REST API directly (not through Vercel AI SDK — the SDK doesn't support native image generation).

### Generation Prompt (verbatim)

The `creative_direction` from Step 2 is wrapped:

```
Generate a photorealistic image based on this creative direction:

${creativeDirection}

The image should look like an authentic photograph — not AI-generated, not stock photography. Capture the specific mood, lighting, and composition described above. Professional editorial quality.
```

### Persist

Before calling the API, save the final prompt:
```
generation_prompt = <the wrapped prompt above>
```

### API Call

**Endpoint:**
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent
```

**Headers:**
```
Content-Type: application/json
x-goog-api-key: ${GOOGLE_GENERATIVE_AI_API_KEY}
```

**Request Body:**
```json
{
  "contents": [
    {
      "parts": [
        { "text": "<generation_prompt>" }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["IMAGE", "TEXT"],
    "imageConfig": {
      "aspectRatio": "<aspect_ratio, default '1:1'>",
      "imageSize": "<image_size, default '2K'>"
    }
  },
  "safetySettings": [
    { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH" },
    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH" },
    { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH" },
    { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH" }
  ]
}
```

**Response Parsing:**

The image is in `candidates[0].content.parts[]` — find the part where `inlineData.mimeType` starts with `image/`:

```json
{
  "candidates": [{
    "content": {
      "parts": [
        {
          "inlineData": {
            "mimeType": "image/png",
            "data": "<base64-encoded-image>"
          }
        }
      ]
    }
  }]
}
```

Extract `inlineData.data` (base64) and `inlineData.mimeType`.

### Post-Generation

1. Upload the decoded image to storage (filename: `thinking-${jobId}-${timestamp}.{png|jpg}`)
2. Create an image record with metadata: `{ thinking_job_id, photographer, publication }`
3. Update the job: `generated_image_id = <image-record-id>`
4. Append trace entry with step `image_generation`

---

## 6. Execution Flow

```
1. Set status = 'running', started_at = now()
   Clear all previous outputs (for re-run safety)

2. Run Step 1 (Subject Translation)
   → Update: derived_subject, subject_thinking
   → Append trace

3. Run Step 2 (Creative Direction)
   → Update: creative_direction, direction_thinking
   → Append trace

4. Run Step 3 (Image Generation)
   → Update: generation_prompt (before API call)
   → Upload image to storage
   → Create image record
   → Update: generated_image_id
   → Append trace

5. Set status = 'completed', completed_at = now()
```

### Error Handling

If any step throws:
- Set `status = 'failed'`
- Set `error_message = <error message>`
- Set `completed_at = now()`
- Do NOT continue to subsequent steps

Steps 1 and 2 persist their outputs immediately, so partial results survive failures. If Step 3 fails, you still have the derived subject and creative direction.

---

## 7. Client Polling

The client monitors execution via a polling endpoint.

**Endpoint:** `GET /api/cog/thinking/{jobId}`

**Returns:** Full job record including all step outputs, trace, and status.

**Polling interval:** 2 seconds. Stop when `status` is `completed` or `failed`.

The UI can progressively render outputs as they appear:
- When `derived_subject` populates → show the extracted subject
- When `creative_direction` populates → show the creative brief
- When `generated_image_id` populates → fetch and show the image

---

## 8. Environment Variables

| Variable | Purpose |
|----------|---------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API key (used for both thinking model via Vercel AI SDK and image generation via REST) |

---

## 9. Dependencies

For Steps 1-2 (thinking/text generation):
- **Vercel AI SDK** (`ai` package) — `generateText` function
- **@ai-sdk/google** — Google provider for Vercel AI SDK
- Model: `gemini-3-pro-image-preview` (or any thinking-capable Gemini model)

For Step 3 (image generation):
- **Direct REST API** call to `generativelanguage.googleapis.com` — the Vercel AI SDK does not support Gemini's native image generation, so this uses `fetch` directly
- Model: `gemini-3-pro-image-preview`

**Note:** Steps 1-2 and Step 3 use the same model ID but different interfaces. Steps 1-2 go through the Vercel AI SDK (which handles the `generateContent` text-mode call). Step 3 goes direct to the REST API with `responseModalities: ['IMAGE', 'TEXT']`.

### Portable Alternative

If you don't want the Vercel AI SDK dependency, all three steps can use the REST API directly:

**Steps 1-2** (text generation with thinking):
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent
{
  "contents": [{ "parts": [{ "text": "<prompt>" }] }],
  "systemInstruction": { "parts": [{ "text": "<system prompt>" }] },
  "generationConfig": { "temperature": 1.0 }
}
```

Response: `candidates[0].content.parts[0].text`

Thinking trace (if the model supports it): check for a `thoughtProcess` or similar field in the response — this varies by model version and may not be available via REST.

---

## 10. Adaptation Notes

**What's portable:**
- The 3-step pipeline structure
- All three prompt templates (copy verbatim)
- The progressive persistence pattern (update after each step)
- The trace/metrics pattern
- The image generation API call

**What's jfriis-specific (replace in your codebase):**
- Supabase as the database (replace with your DB)
- `cog_series` / `cog_images` foreign keys (replace with your image storage model)
- Supabase storage for image uploads (replace with S3, R2, etc.)
- The polling API route (replace with your preferred real-time mechanism — SSE, WebSocket, or polling)
- RLS policies (replace with your auth model)

**Model substitution:**
- Steps 1-2 work with any thinking-capable model. Claude with extended thinking, GPT-4 with reasoning, or Gemini with thinking all work. The prompts are model-agnostic.
- Step 3 requires a model with native image generation. Currently uses Gemini 3 Pro. Alternatives: DALL-E 3, Flux, Stable Diffusion — but you'd need to adapt the API call format.
