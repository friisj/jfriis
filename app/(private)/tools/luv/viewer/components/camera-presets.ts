/**
 * Camera preset definitions for the character viewer.
 * Each preset targets a specific area of the character model.
 */

export interface CameraPreset {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  fullBody: {
    label: 'Full Body',
    position: [0, 1.0, 3.5],
    target: [0, 0.9, 0],
    fov: 35,
  },
  face: {
    label: 'Face',
    position: [0, 1.65, 0.8],
    target: [0, 1.6, 0],
    fov: 25,
  },
  profile: {
    label: 'Profile',
    position: [0.8, 1.6, 0.4],
    target: [0, 1.55, 0],
    fov: 25,
  },
  threeQuarter: {
    label: '3/4 View',
    position: [0.6, 1.6, 0.7],
    target: [0, 1.55, 0],
    fov: 28,
  },
  upperBody: {
    label: 'Upper Body',
    position: [0, 1.3, 1.5],
    target: [0, 1.2, 0],
    fov: 30,
  },
};

export const DEFAULT_PRESET = 'fullBody';
