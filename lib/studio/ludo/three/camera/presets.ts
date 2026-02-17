import * as THREE from 'three';

/**
 * Camera preset types for different viewing angles
 */
export enum CameraPreset {
  OVERHEAD = 'overhead',
  WHITE_PLAYER = 'white_player',
  BLACK_PLAYER = 'black_player',
  SIDE_VIEW = 'side_view',
  CINEMATIC = 'cinematic'
}

/**
 * Camera state including position, target, and zoom
 */
export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom?: number;
  fov?: number;
}

/**
 * Predefined camera positions for different viewing angles
 * All positions are designed to frame the backgammon board optimally
 */
export const CAMERA_PRESETS: Record<CameraPreset, CameraState> = {
  [CameraPreset.OVERHEAD]: {
    // Near-overhead view - tiny offset to avoid gimbal lock (0.01 rad ≈ 0.57° - visually imperceptible)
    // Position calculated for polar=0.01, distance=25, azimuth=0
    position: new THREE.Vector3(0.25, 24.998, 0),
    target: new THREE.Vector3(0, 0, 0),
    fov: 70,
  },

  [CameraPreset.WHITE_PLAYER]: {
    // View from white's perspective (bottom of board in standard layout)
    position: new THREE.Vector3(0, 8, 18),
    target: new THREE.Vector3(0, 0, -2),
    fov: 65,
  },

  [CameraPreset.BLACK_PLAYER]: {
    // View from black's perspective (top of board in standard layout)
    position: new THREE.Vector3(0, 8, -18),
    target: new THREE.Vector3(0, 0, 2),
    fov: 65,
  },

  [CameraPreset.SIDE_VIEW]: {
    // Side profile view to see checker stacks clearly
    position: new THREE.Vector3(20, 6, 0),
    target: new THREE.Vector3(0, 0, 0),
    fov: 70,
  },

  [CameraPreset.CINEMATIC]: {
    // Dramatic 3/4 angle view - most visually appealing
    position: new THREE.Vector3(12, 15, 12),
    target: new THREE.Vector3(0, 0, 0),
    fov: 60,
  }
};

/**
 * Camera control limits to prevent extreme positions
 */
export const CAMERA_LIMITS = {
  minDistance: 10,
  maxDistance: 40,
  minPolarAngle: 0.01, // Prevent gimbal lock at 0° (0.01 rad ≈ 0.57°, visually imperceptible)
  maxPolarAngle: Math.PI * 0.95, // Prevent going under the board (just shy of 180°)
  minAzimuthAngle: -Infinity,
  maxAzimuthAngle: Infinity,
  enablePan: true,
  panSpeed: 0.5,
  rotateSpeed: 0.5,
  zoomSpeed: 0.5,
};

/**
 * Animation settings for camera transitions
 */
export const CAMERA_ANIMATION = {
  duration: 1000, // milliseconds
  easing: 'easeInOutCubic' as const,
};
