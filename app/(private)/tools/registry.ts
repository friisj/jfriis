export type ToolRegistryEntry = {
  id: string;
  title: string;
  description: string;
  path: string;
  cover?: string;         // Image path or URL
  visible: boolean;       // Show on tools index
};

export const toolsRegistry: ToolRegistryEntry[] = [
  {
    id: 'spend',
    title: 'Spend',
    description: 'Household budget management',
    path: '/spend',
    cover: '/images/tools/spend-cover.jpg',
    visible: true,
  },
  {
    id: 'repas',
    title: 'Repas',
    description: 'Weekly meal planner',
    path: '/repas',
    cover: '/images/tools/repas-cover.jpg',
    visible: true,
  },
  {
    id: 'stable',
    title: 'Stable',
    description: 'Character sketchbook',
    path: '/stable',
    cover: '/images/tools/stable-cover.jpg',
    visible: true,
  },
  {
    id: 'cog',
    title: 'Cog',
    description: 'Image generation pipeline',
    path: '/cog',
    cover: '/images/tools/cog-cover.jpg',
    visible: true,
  },
  // Example hidden tool (in development)
  // {
  //   id: 'fitness',
  //   title: 'Fitness',
  //   description: 'Workout tracker',
  //   path: '/fitness',
  //   visible: false,
  // },
];

// Helper to get visible tools
export function getVisibleTools() {
  return toolsRegistry.filter((tool) => tool.visible);
}

// Helper to get tool by id
export function getToolById(id: string) {
  return toolsRegistry.find((tool) => tool.id === id);
}
