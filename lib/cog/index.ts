/**
 * Cog Image Service — Shared Primitives
 *
 * These modules provide the image management infrastructure that can be used
 * by any tool (Cog, Luv, etc.). Import from '@/lib/cog' for client-side
 * operations, or from '@/lib/cog/server' for server-side.
 *
 * Cog-specific operations (jobs, pipelines, configs, calibration, remix,
 * thinking) remain in '@/lib/cog-full' (the original monolith).
 */

// Shared image infrastructure — usable by any tool
export * from './images';
export * from './series';
export * from './tags';
export * from './groups';
export { generateThumbnails, batchGenerateThumbnails } from './thumbnails';
