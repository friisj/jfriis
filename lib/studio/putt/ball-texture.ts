import * as THREE from "three";

/**
 * Generate a procedural normal map for golf ball dimples
 * Creates a pattern of circular indentations across the sphere surface
 */
export function createDimpleNormalMap(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;

  // Fill with neutral normal (pointing outward)
  ctx.fillStyle = "#8080ff"; // RGB(128, 128, 255) = normal pointing out
  ctx.fillRect(0, 0, size, size);

  // Dimple pattern parameters
  const dimpleRadius = 12;
  const dimpleSpacing = 24;
  const dimpleDepth = 2.5; // How much the normal deviates (increased for visibility)

  // Create hexagonal pattern of dimples
  for (let row = 0; row < size / dimpleSpacing + 1; row++) {
    for (let col = 0; col < size / dimpleSpacing + 1; col++) {
      // Offset every other row for hexagonal packing
      const xOffset = row % 2 === 0 ? 0 : dimpleSpacing / 2;
      const x = col * dimpleSpacing + xOffset;
      const y = row * dimpleSpacing;

      // Add some randomness to make it look more natural
      const jitterX = (Math.random() - 0.5) * 3;
      const jitterY = (Math.random() - 0.5) * 3;

      drawDimple(ctx, x + jitterX, y + jitterY, dimpleRadius, dimpleDepth);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3); // Repeat pattern for full coverage
  texture.needsUpdate = true;

  return texture;
}

/**
 * Draw a single dimple as a normal map gradient
 */
function drawDimple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  depth: number
) {
  // Create radial gradient for the dimple normal
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

  // Center: normal points inward (much darker for stronger effect)
  const centerR = Math.floor(Math.max(0, 128 - depth * 60));
  const centerG = Math.floor(Math.max(0, 128 - depth * 60));
  const centerB = Math.floor(Math.max(100, 255 - depth * 80));

  // Edge: normal returns to surface normal
  const edgeR = 128;
  const edgeG = 128;
  const edgeB = 255;

  gradient.addColorStop(0, `rgb(${centerR}, ${centerG}, ${centerB})`);
  gradient.addColorStop(0.5, `rgb(${edgeR - 40}, ${edgeG - 40}, ${edgeB - 60})`);
  gradient.addColorStop(1, `rgb(${edgeR}, ${edgeG}, ${edgeB})`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Create a bump map for actual visual depth
 */
export function createDimpleBumpMap(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;

  // Fill with mid-gray (no displacement)
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);

  // Dimple pattern parameters (matching normal map)
  const dimpleRadius = 12;
  const dimpleSpacing = 24;

  // Create hexagonal pattern of dimples
  for (let row = 0; row < size / dimpleSpacing + 1; row++) {
    for (let col = 0; col < size / dimpleSpacing + 1; col++) {
      const xOffset = row % 2 === 0 ? 0 : dimpleSpacing / 2;
      const x = col * dimpleSpacing + xOffset;
      const y = row * dimpleSpacing;

      const jitterX = (Math.random() - 0.5) * 3;
      const jitterY = (Math.random() - 0.5) * 3;

      // Draw dimple depression (dark = indented)
      const gradient = ctx.createRadialGradient(
        x + jitterX,
        y + jitterY,
        0,
        x + jitterX,
        y + jitterY,
        dimpleRadius
      );

      gradient.addColorStop(0, "#000000"); // Black center (deep)
      gradient.addColorStop(0.6, "#404040"); // Dark gray
      gradient.addColorStop(1, "#808080"); // Return to surface

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x + jitterX, y + jitterY, dimpleRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.needsUpdate = true;

  return texture;
}

/**
 * Create a subtle roughness map to complement the dimples
 */
export function createDimpleRoughnessMap(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;

  // Base roughness
  ctx.fillStyle = "#b0b0b0"; // Medium-high roughness
  ctx.fillRect(0, 0, size, size);

  // Add slight noise for texture variation
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + noise)); // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.needsUpdate = true;

  return texture;
}
