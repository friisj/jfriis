/**
 * Test script for Replicate inpainting API
 * Run with: npx tsx --env-file=.env.local scripts/test-replicate-inpainting.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

if (!REPLICATE_API_TOKEN) {
  console.error('REPLICATE_API_TOKEN not found in .env.local');
  process.exit(1);
}

// Model versions
const MODELS = {
  SD_INPAINTING: {
    name: 'stability-ai/stable-diffusion-inpainting',
    version: '95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3',
  },
  SDXL_INPAINTING: {
    name: 'lucataco/sdxl-inpainting',
    version: 'a5b13068cc81a89a4fbeefeccc774869fcb34df4dbc92c1555e0f2771d49dde7',
  },
};

// Create a simple test image and mask (64x64 solid colors for testing)
function createTestImage(): string {
  // Create a simple 64x64 red square as PNG
  // This is a minimal valid PNG for testing API connectivity
  // In reality, we'd use a real image
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return `data:image/png;base64,${testImageBase64}`;
}

function createTestMask(): string {
  // Create a simple white 1x1 PNG (white = inpaint this area)
  const testMaskBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4////fwYACXoC/glhJoYAAAAASUVORK5CYII=';
  return `data:image/png;base64,${testMaskBase64}`;
}

interface ReplicatePrediction {
  id: string;
  status: string;
  output: string[] | null;
  error: string | null;
  metrics?: {
    predict_time?: number;
  };
}

async function pollPrediction(predictionId: string): Promise<ReplicatePrediction> {
  const maxAttempts = 60;
  const pollInterval = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Poll failed: ${response.status}`);
    }

    const prediction: ReplicatePrediction = await response.json();
    console.log(`  Status: ${prediction.status}`);

    if (prediction.status === 'succeeded') {
      return prediction;
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(prediction.error || `Prediction ${prediction.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Prediction timed out');
}

async function testModel(
  modelKey: keyof typeof MODELS,
  testImageUrl: string,
  testMaskUrl: string
): Promise<void> {
  const model = MODELS[modelKey];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${model.name}`);
  console.log(`${'='.repeat(60)}`);

  const startTime = Date.now();

  const input: Record<string, unknown> = {
    image: testImageUrl,
    mask: testMaskUrl,
    prompt: 'clean, smooth, natural',
    negative_prompt: 'blurry, low quality',
  };

  // Model-specific params
  if (modelKey === 'SD_INPAINTING') {
    input.num_inference_steps = 20;
    input.guidance_scale = 7.5;
    input.scheduler = 'DPMSolverMultistep';
  } else if (modelKey === 'SDXL_INPAINTING') {
    input.steps = 20;
    input.guidance_scale = 8;
    input.strength = 0.7;
    input.scheduler = 'K_EULER';
  }

  console.log('Creating prediction...');

  try {
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: model.version,
        input,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`  Create failed: ${createResponse.status}`);
      console.error(`  ${errorText.slice(0, 500)}`);
      return;
    }

    const createResult: ReplicatePrediction = await createResponse.json();
    console.log(`  Prediction ID: ${createResult.id}`);

    // Poll for result
    console.log('Polling for result...');
    const finalResult = await pollPrediction(createResult.id);

    const duration = Date.now() - startTime;

    console.log('\n  Results:');
    console.log(`  - Total time: ${duration}ms`);
    console.log(`  - Predict time: ${finalResult.metrics?.predict_time}s`);
    console.log(`  - Output URL: ${finalResult.output?.[0]?.slice(0, 80)}...`);

    // Save the output
    if (finalResult.output?.[0]) {
      const outputResponse = await fetch(finalResult.output[0]);
      const outputBuffer = Buffer.from(await outputResponse.arrayBuffer());
      const outputPath = path.join(__dirname, `test-output-${modelKey.toLowerCase()}.png`);
      fs.writeFileSync(outputPath, outputBuffer);
      console.log(`  - Saved to: ${outputPath}`);
    }

    console.log('  SUCCESS');
  } catch (error) {
    console.error(`  FAILED: ${error}`);
  }
}

function loadImageAsDataUri(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

async function main() {
  console.log('Replicate Inpainting API Test');
  console.log('=============================\n');
  console.log(`Token: ${REPLICATE_API_TOKEN?.slice(0, 8)}...`);

  // Load test files
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  const testMaskPath = path.join(__dirname, 'test-mask.png');

  if (!fs.existsSync(testImagePath)) {
    console.error(`Test image not found: ${testImagePath}`);
    console.log('Run: curl -sL -o scripts/test-image.jpg "https://picsum.photos/512/512"');
    process.exit(1);
  }

  if (!fs.existsSync(testMaskPath)) {
    console.error(`Test mask not found: ${testMaskPath}`);
    console.log('Run: node scripts/create-test-mask.js');
    process.exit(1);
  }

  const testImageDataUri = loadImageAsDataUri(testImagePath);
  const testMaskDataUri = loadImageAsDataUri(testMaskPath);

  console.log(`Image size: ${Math.round(testImageDataUri.length / 1024)}KB`);
  console.log(`Mask size: ${Math.round(testMaskDataUri.length / 1024)}KB`);

  // Test SDXL model
  await testModel('SDXL_INPAINTING', testImageDataUri, testMaskDataUri);

  console.log('\n\nTest complete!');
}

main().catch(console.error);
