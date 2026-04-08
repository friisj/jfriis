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
    path: '/tools/spend',
    visible: true,
  },
  {
    id: 'repas',
    title: 'Repas',
    description: 'Weekly meal planner',
    path: '/tools/repas',
    visible: true,
  },
  {
    id: 'stable',
    title: 'Stable',
    description: 'Character sketchbook',
    path: '/tools/stable',
    visible: true,
  },
  {
    id: 'cog',
    title: 'Cog',
    description: 'Image generation pipeline',
    path: '/tools/cog',
    visible: true,
  },
  {
    id: 'luv',
    title: 'Luv',
    description: 'Parametric character engine',
    path: '/tools/luv',
    visible: true,
  },
  {
    id: 'sampler',
    title: 'Sampler',
    description: 'Sound effects MPC',
    path: '/tools/sampler',
    visible: true,
  },
  {
    id: 'duo',
    title: 'DUO',
    description: 'Collaborative synth + sequencer',
    path: '/tools/duo',
    visible: true,
  },
  {
    id: 'strudel',
    title: 'Strudel',
    description: 'Live coding music patterns',
    path: '/tools/strudel',
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
