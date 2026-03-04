/**
 * Luv: Scene Registry
 *
 * Defines available scenes that compose chassis module data into
 * visual outputs. Each scene declares which modules it requires
 * and which are optional.
 */

export interface SceneDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: 'portrait' | 'figure' | 'detail' | 'composite';
  requiredModules: string[];
  optionalModules: string[];
}

const scenes: SceneDefinition[] = [
  {
    id: 'portrait-headshot',
    slug: 'portrait-headshot',
    name: 'Portrait Headshot',
    description: 'Close-up portrait focusing on facial features',
    category: 'portrait',
    requiredModules: ['eyes', 'mouth', 'nose', 'skeletal', 'skin', 'hair'],
    optionalModules: [],
  },
  {
    id: 'portrait-bust',
    slug: 'portrait-bust',
    name: 'Portrait Bust',
    description: 'Head and shoulders portrait with upper body visible',
    category: 'portrait',
    requiredModules: ['eyes', 'mouth', 'nose', 'skeletal', 'skin', 'hair'],
    optionalModules: ['body-proportions'],
  },
  {
    id: 'full-figure',
    slug: 'full-figure',
    name: 'Full Figure',
    description: 'Full body view showing all proportions',
    category: 'figure',
    requiredModules: ['body-proportions', 'skeletal', 'skin', 'hair'],
    optionalModules: ['eyes', 'mouth', 'nose'],
  },
  {
    id: 'eye-detail',
    slug: 'eye-detail',
    name: 'Eye Detail',
    description: 'Close-up of eyes with full iris and expression detail',
    category: 'detail',
    requiredModules: ['eyes', 'skin'],
    optionalModules: ['skeletal'],
  },
  {
    id: 'mouth-detail',
    slug: 'mouth-detail',
    name: 'Mouth Detail',
    description: 'Close-up of mouth and lip detail',
    category: 'detail',
    requiredModules: ['mouth', 'skin'],
    optionalModules: ['skeletal'],
  },
  {
    id: 'hand-study',
    slug: 'hand-study',
    name: 'Hand Study',
    description: 'Detailed hand pose reference',
    category: 'detail',
    requiredModules: ['skin', 'body-proportions'],
    optionalModules: ['skeletal'],
  },
  {
    id: 'composite-overview',
    slug: 'composite-overview',
    name: 'Composite Overview',
    description: 'Multi-view composite showing key angles',
    category: 'composite',
    requiredModules: ['eyes', 'mouth', 'nose', 'skeletal', 'skin', 'hair', 'body-proportions'],
    optionalModules: [],
  },
];

const sceneMap = new Map(scenes.map((s) => [s.slug, s]));

export function getScene(slug: string): SceneDefinition | undefined {
  return sceneMap.get(slug);
}

export function getAllScenes(): SceneDefinition[] {
  return scenes;
}

export function getScenesForModule(moduleSlug: string): SceneDefinition[] {
  return scenes.filter(
    (s) =>
      s.requiredModules.includes(moduleSlug) ||
      s.optionalModules.includes(moduleSlug)
  );
}

export function getScenesByCategory(category: SceneDefinition['category']): SceneDefinition[] {
  return scenes.filter((s) => s.category === category);
}
