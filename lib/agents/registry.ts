/**
 * Agent Registry — configuration for all available agents.
 */

export interface AgentConfig {
  id: string;
  label: string;
  description: string;
  features: {
    imageUpload: boolean;
    toolHints: boolean;
    voice: boolean;
    thinking: boolean;
    compaction: boolean;
    soulTraits: boolean;
    imagePicker: boolean;
    heartbeat: boolean;
  };
}

export const AGENTS: Record<string, AgentConfig> = {
  chief: {
    id: 'chief',
    label: 'Chief',
    description: 'Operations & orchestration',
    features: {
      imageUpload: false,
      toolHints: false,
      voice: false,
      thinking: true,
      compaction: false,
      soulTraits: false,
      imagePicker: false,
      heartbeat: false,
    },
  },
  luv: {
    id: 'luv',
    label: 'Luv',
    description: 'Parametric character engine',
    features: {
      imageUpload: true,
      toolHints: true,
      voice: true,
      thinking: true,
      compaction: true,
      soulTraits: true,
      imagePicker: true,
      heartbeat: true,
    },
  },
};

export const AGENT_IDS = Object.keys(AGENTS);
export const DEFAULT_AGENT = 'chief';

export function getAgentConfig(agentId: string): AgentConfig {
  return AGENTS[agentId] ?? AGENTS[DEFAULT_AGENT];
}
