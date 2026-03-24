/**
 * Cog Image Service
 *
 * Modular image management infrastructure. Shared primitives (images, series,
 * tags, groups, thumbnails) can be imported by any tool. Cog-specific modules
 * (jobs, pipeline, configs, etc.) support the Cognitron generation workflows.
 *
 * Client-side: import from '@/lib/cog'
 * Server-side: import from '@/lib/cog/server'
 */

// Shared image infrastructure — usable by any tool
export * from './images';
export * from './series';
export * from './tags';
export * from './groups';
export { generateThumbnails, batchGenerateThumbnails } from './thumbnails';

// Cog-specific operations
export * from './jobs';
export * from './pipeline';
export * from './configs';
export * from './calibration';
export * from './remix';
export * from './eval';
export * from './thinking';
