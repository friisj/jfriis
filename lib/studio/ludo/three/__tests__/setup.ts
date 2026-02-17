// Jest setup for 3D testing environment

import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock performance.now for consistent timing in tests
const performanceNow = (() => {
  const start = Date.now();
  return () => Date.now() - start;
})();

Object.defineProperty(global, 'performance', {
  value: {
    now: performanceNow,
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB baseline
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 200 * 1024 * 1024
    }
  }
});

// Mock requestAnimationFrame for animation testing
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  return setTimeout(cb, 16); // ~60fps
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Mock WebGL context for Three.js with comprehensive API coverage
const mockWebGLContext = {
  canvas: null,
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,

  // Extension support
  getExtension: jest.fn((name: string) => {
    // Return mock extensions for common Three.js requirements
    if (name === 'WEBGL_depth_texture') return {};
    if (name === 'EXT_texture_filter_anisotropic') return { TEXTURE_MAX_ANISOTROPY_EXT: 0x84FE };
    if (name === 'WEBGL_lose_context') return { loseContext: jest.fn(), restoreContext: jest.fn() };
    if (name === 'OES_texture_float') return {};
    if (name === 'OES_texture_float_linear') return {};
    if (name === 'OES_texture_half_float') return {};
    if (name === 'OES_texture_half_float_linear') return {};
    if (name === 'OES_standard_derivatives') return {};
    if (name === 'OES_element_index_uint') return {};
    if (name === 'OES_vertex_array_object') return {
      createVertexArrayOES: jest.fn(),
      deleteVertexArrayOES: jest.fn(),
      bindVertexArrayOES: jest.fn()
    };
    return null;
  }),
  getSupportedExtensions: jest.fn(() => [
    'WEBGL_depth_texture',
    'EXT_texture_filter_anisotropic',
    'OES_texture_float',
    'OES_standard_derivatives'
  ]),

  // Parameter queries
  getParameter: jest.fn((pname: number) => {
    const params: Record<number, any> = {
      0x1F00: 'WebGL 1.0', // VENDOR
      0x1F01: 'Mock WebGL Renderer', // RENDERER
      0x1F02: 'WebGL 1.0 (Mock)', // VERSION
      0x8B8C: 'WebGL GLSL ES 1.0 (Mock)', // SHADING_LANGUAGE_VERSION
      0x0D33: 16384, // MAX_TEXTURE_SIZE
      0x84E8: 32, // MAX_VERTEX_TEXTURE_IMAGE_UNITS
      0x8869: 16, // MAX_VERTEX_ATTRIBS (corrected from 0x8B4D)
      0x8DFB: 32, // MAX_TEXTURE_IMAGE_UNITS
      0x8872: 1024, // MAX_RENDERBUFFER_SIZE
      0x851C: 16, // MAX_VARYING_VECTORS
      0x8B4B: 16, // MAX_VERTEX_UNIFORM_VECTORS
      0x8B4C: 16, // MAX_FRAGMENT_UNIFORM_VECTORS
      0x8B4D: 32, // MAX_COMBINED_TEXTURE_IMAGE_UNITS (corrected from 0x84E8)
      0x8D57: 4096, // MAX_VIEWPORT_DIMS
      0x0BA2: new Int32Array([0, 0, 800, 600]), // VIEWPORT
    };
    return params[pname] ?? 0;
  }),

  // Shader operations
  createShader: jest.fn(() => ({})),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  getShaderParameter: jest.fn(() => true),
  getShaderInfoLog: jest.fn(() => ''),
  getShaderPrecisionFormat: jest.fn(() => ({
    rangeMin: 127,
    rangeMax: 127,
    precision: 23
  })),
  deleteShader: jest.fn(),

  // Program operations
  createProgram: jest.fn(() => ({})),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn(() => true),
  getProgramInfoLog: jest.fn(() => ''),
  useProgram: jest.fn(),
  deleteProgram: jest.fn(),

  // Attribute/Uniform locations
  getAttribLocation: jest.fn(() => 0),
  getUniformLocation: jest.fn(() => ({})),

  // Buffer operations
  createBuffer: jest.fn(() => ({})),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  deleteBuffer: jest.fn(),

  // Vertex attributes
  enableVertexAttribArray: jest.fn(),
  disableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),

  // Uniforms
  uniform1f: jest.fn(),
  uniform1i: jest.fn(),
  uniform2f: jest.fn(),
  uniform3f: jest.fn(),
  uniform4f: jest.fn(),
  uniformMatrix3fv: jest.fn(),
  uniformMatrix4fv: jest.fn(),

  // Texture operations
  createTexture: jest.fn(() => ({})),
  bindTexture: jest.fn(),
  texImage2D: jest.fn(),
  texImage3D: jest.fn(), // WebGL 2
  texParameteri: jest.fn(),
  generateMipmap: jest.fn(),
  activeTexture: jest.fn(),
  deleteTexture: jest.fn(),

  // Framebuffer operations
  createFramebuffer: jest.fn(() => ({})),
  bindFramebuffer: jest.fn(),
  framebufferTexture2D: jest.fn(),
  checkFramebufferStatus: jest.fn(() => 0x8CD5), // FRAMEBUFFER_COMPLETE
  deleteFramebuffer: jest.fn(),

  // Renderbuffer operations
  createRenderbuffer: jest.fn(() => ({})),
  bindRenderbuffer: jest.fn(),
  renderbufferStorage: jest.fn(),
  framebufferRenderbuffer: jest.fn(),
  deleteRenderbuffer: jest.fn(),

  // Drawing
  clear: jest.fn(),
  clearColor: jest.fn(),
  clearDepth: jest.fn(),
  clearStencil: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),

  // State management
  viewport: jest.fn(),
  scissor: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  depthFunc: jest.fn(),
  depthMask: jest.fn(),
  frontFace: jest.fn(),
  cullFace: jest.fn(),
  blendFunc: jest.fn(),
  blendEquation: jest.fn(),
  colorMask: jest.fn(),
  lineWidth: jest.fn(),
  polygonOffset: jest.fn(),

  // Read operations
  readPixels: jest.fn(),

  // Misc
  flush: jest.fn(),
  finish: jest.fn(),
  getError: jest.fn(() => 0), // NO_ERROR
  isContextLost: jest.fn(() => false),
  getContextAttributes: jest.fn(() => ({
    alpha: true,
    antialias: true,
    depth: true,
    failIfMajorPerformanceCaveat: false,
    powerPreference: 'default',
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false,
    desynchronized: false
  })),
  pixelStorei: jest.fn(),
  hint: jest.fn(),

  // Constants
  VENDOR: 0x1F00,
  RENDERER: 0x1F01,
  VERSION: 0x1F02,
  SHADING_LANGUAGE_VERSION: 0x8B8C,
  DEPTH_BUFFER_BIT: 0x00000100,
  STENCIL_BUFFER_BIT: 0x00000400,
  COLOR_BUFFER_BIT: 0x00004000,
  TRIANGLES: 0x0004,
  UNSIGNED_BYTE: 0x1401,
  UNSIGNED_SHORT: 0x1403,
  FLOAT: 0x1406,
  RGBA: 0x1908,
  TEXTURE_2D: 0x0DE1,
  NEAREST: 0x2600,
  LINEAR: 0x2601,
  CLAMP_TO_EDGE: 0x812F,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  STATIC_DRAW: 0x88E4,
  DYNAMIC_DRAW: 0x88E8,
  MAX_TEXTURE_SIZE: 0x0D33,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x84E8,
  MAX_VERTEX_ATTRIBS: 0x8869,
  MAX_TEXTURE_IMAGE_UNITS: 0x8DFB,
  MAX_RENDERBUFFER_SIZE: 0x8872,
  MAX_VARYING_VECTORS: 0x851C,
  MAX_VERTEX_UNIFORM_VECTORS: 0x8B4B,
  MAX_FRAGMENT_UNIFORM_VECTORS: 0x8B4C,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8B4D,
  MAX_VIEWPORT_DIMS: 0x8D57,
  VIEWPORT: 0x0BA2
};

// Override HTMLCanvasElement.getContext for consistent WebGL mocking
const originalGetContext = HTMLCanvasElement.prototype.getContext;
(HTMLCanvasElement.prototype as any).getContext = jest.fn(function(this: HTMLCanvasElement, contextType: string) {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLContext;
  }
  return originalGetContext?.call(this, contextType as any);
});

// Mock IntersectionObserver for component testing
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
})) as unknown as typeof IntersectionObserver;

// Mock ResizeObserver for responsive components
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
})) as unknown as typeof ResizeObserver;

// Mock Three.js OrbitControls to avoid ESM import issues
jest.mock('three/examples/jsm/controls/OrbitControls', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const THREE = require('three');
  return {
    OrbitControls: jest.fn().mockImplementation(() => ({
      enabled: true,
      enableDamping: false,
      dampingFactor: 0.05,
      minDistance: 5,
      maxDistance: 50,
      enablePan: false,
      enableZoom: true,
      enableRotate: true,
      target: new THREE.Vector3(0, 0, 0),
      update: jest.fn(),
      dispose: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      saveState: jest.fn(),
      reset: jest.fn(),
    }))
  };
});