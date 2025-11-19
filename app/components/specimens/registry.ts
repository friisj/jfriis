/**
 * Specimen Registry
 *
 * This file maps specimen component IDs to their actual React components.
 * When you create a new specimen component, add it here to make it available.
 */

import { ComponentType } from 'react'
import SimpleCard from './simple-card'

export interface SpecimenMetadata {
  id: string
  name: string
  description: string
  component: ComponentType<any>
  category?: string
  tags?: string[]
}

/**
 * Registry of all available specimen components
 * Add your specimen components here
 */
export const specimenRegistry: Record<string, SpecimenMetadata> = {
  'simple-card': {
    id: 'simple-card',
    name: 'Simple Card',
    description: 'A basic card component with static content, hover effects, and dark mode support',
    component: SimpleCard,
    category: 'ui-component',
    tags: ['card', 'ui', 'basic'],
  },
  // Add more specimens here as you create them:
  // 'animated-button': {
  //   id: 'animated-button',
  //   name: 'Animated Button',
  //   description: 'Button with smooth animations',
  //   component: AnimatedButton,
  //   category: 'interactive',
  //   tags: ['button', 'animation'],
  // },
}

/**
 * Get a specimen component by ID
 */
export function getSpecimen(id: string): SpecimenMetadata | undefined {
  return specimenRegistry[id]
}

/**
 * Get all available specimens
 */
export function getAllSpecimens(): SpecimenMetadata[] {
  return Object.values(specimenRegistry)
}

/**
 * Check if a specimen exists
 */
export function specimenExists(id: string): boolean {
  return id in specimenRegistry
}
