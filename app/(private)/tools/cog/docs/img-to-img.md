# Image-to-Image Generation Spec

> Using existing images as inputs for new image generation jobs.

## Reference Image Support

Reference images work when **Vertex AI is configured**. The system automatically routes to the appropriate backend:

| Scenario | Backend | Model | Reference Images |
|----------|---------|-------|------------------|
| Vertex AI configured + has references | Vertex AI | `imagen-3.0-capability-001` | Passed to generation |
| Vertex AI not configured | Gemini API | `imagen-4.0-generate-001` | Context in prompt only |
| No reference images | Gemini API | `imagen-4.0-generate-001` | N/A |

### Current Status

- ✅ UI for selecting reference images
- ✅ Reference context passed to prompt generator (uses [1], [2] notation)
- ✅ Actual image data passed to Vertex AI when configured
- ✅ Graceful fallback to text-only when Vertex AI unavailable

### Setting Up Vertex AI

To enable full reference image support:

1. **Create/select Google Cloud project**
2. **Enable Vertex AI API** in Google Cloud Console
3. **Create service account** with "Vertex AI User" role
4. **Download service account key** (JSON file)
5. **Set environment variables**:
   ```bash
   GOOGLE_VERTEX_PROJECT_ID=your-project-id
   GOOGLE_VERTEX_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   ```

When these are set, jobs with reference images will automatically use Vertex AI.

---

## Research Summary

### Imagen Capabilities

Google Imagen supports two modes for image inputs:

**Subject Customization (Imagen 3 Capability Model)**
- 1-4 reference images to guide style/subject
- Supported subjects: person, product, animal companion
- Reference notation: `[1]`, `[2]` in prompts
- Model: `imagen-3.0-capability-001`

**Mask-Based Inpainting (Imagen 3 Capability Model)**
- User-provided masks (black/white images)
- Auto-generated masks:
  - `MASK_MODE_BACKGROUND` - edits background
  - `MASK_MODE_FOREGROUND` - edits foreground
  - `MASK_MODE_SEMANTIC` - semantic segmentation
- Parameters: `mask_dilation`, `baseSteps` (35-75)

**Important**: Imagen 4 (current default) is text-to-image only. Editing features require `imagen-3.0-capability-001`.

### Vercel AI SDK Support

The `generateImage` function accepts:
- `images`: Array of reference images (base64, Buffer, Uint8Array)
- `mask`: Optional mask for selective editing
- `providerOptions`: Provider-specific settings

### What Won't Work

- ControlNet-style conditioning (pose, depth, edge) - Stable Diffusion only
- Multi-person identity preservation - poor results per Google docs
- Real-time drawing feedback - API-based

---

## Phased Implementation

### Phase 1: Reference Images (Current)

Select existing images from the series as inputs for jobs. Simplest approach with direct Imagen support.

**UX Flow:**
1. On "New Job" page, user can select images from series
2. Each selected image gets a reference ID (`[1]`, `[2]`, etc.)
3. User writes prompt using reference notation
4. Optional: per-image context/instructions
5. Optional: negative prompt for what to avoid

**Schema Changes:**
- New `cog_job_inputs` table linking jobs to input images
- Each input has `reference_id`, optional `context`, optional `negative_prompt`

**UI Components:**
- Image selector in job creation form
- Reference badge overlay on selected images
- Prompt helper showing available references

### Phase 2: Auto-Mask Editing

Quick edits using Imagen's automatic mask detection.

**UX Flow:**
1. Select single image to edit
2. Choose mask mode: "Edit Background" / "Edit Subject" / "Edit Semantic"
3. Describe what to change
4. Generate variations

**Schema Changes:**
- Add `mask_mode` field to job inputs
- Add `edit_mode` to jobs (generation vs editing)

### Phase 3: Brush Masks

Manual mask painting for precise edits.

**UX Flow:**
1. Select image to edit
2. Open canvas overlay
3. Paint mask with brush (adjustable size, feathering)
4. Describe edit
5. Generate

**Schema Changes:**
- Add `mask_data` (base64) to job inputs

**UI Components:**
- Canvas drawing component
- Brush controls (size, hardness, eraser)
- Mask preview overlay

---

## Phase 1 Implementation

### Database Schema

```sql
-- Job input images: reference images used as inputs for generation
CREATE TABLE cog_job_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cog_jobs(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES cog_images(id) ON DELETE CASCADE,
  reference_id INTEGER NOT NULL, -- [1], [2], etc.
  context TEXT, -- optional per-image instructions
  negative_prompt TEXT, -- what to avoid
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, reference_id)
);

CREATE INDEX idx_cog_job_inputs_job ON cog_job_inputs(job_id);
CREATE INDEX idx_cog_job_inputs_image ON cog_job_inputs(image_id);

-- RLS
ALTER TABLE cog_job_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to cog_job_inputs"
  ON cog_job_inputs FOR ALL
  USING (is_admin());
```

### TypeScript Types

```typescript
interface CogJobInput {
  id: string;
  job_id: string;
  image_id: string;
  reference_id: number;
  context: string | null;
  negative_prompt: string | null;
  created_at: string;
}

interface CogJobInputInsert {
  job_id: string;
  image_id: string;
  reference_id: number;
  context?: string | null;
  negative_prompt?: string | null;
}

// Extended job type with inputs
interface CogJobWithInputs extends CogJob {
  inputs: (CogJobInput & { image: CogImage })[];
}
```

### Job Creation Flow

1. **Select inputs** - Pick images from series gallery
2. **Assign references** - Auto-numbered [1], [2], [3], [4] (max 4)
3. **Add context** (optional) - Per-image instructions
4. **Write prompt** - Using reference notation
5. **Add negative prompt** (optional) - Global exclusions
6. **Generate job** - LLM creates steps considering inputs
7. **Run job** - Passes images to Imagen via AI SDK

### Generation Changes

When running a job with inputs:
1. Fetch input images from storage
2. Convert to base64/Buffer format
3. Pass to `generateImage()` via `images` parameter
4. Use `imagen-3.0-capability-001` model for customization

---

## Sources

- [Vercel AI SDK generateImage](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-image)
- [Google Imagen Subject Customization](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/subject-customization)
- [Google Imagen Inpainting](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/edit-insert-objects)
- [AI UX Patterns - Inpainting](https://www.shapeof.ai/patterns/inpainting)
