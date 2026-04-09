/**
 * Agent Registry — configuration for all available agents.
 *
 * Each agent declares its identity and which features it supports.
 * The chat surface uses this to conditionally render input controls,
 * panels, and message components.
 */

export interface AgentConfig {
  id: string;
  label: string;
  description: string;
  features: {
    /** File/image upload in input bar */
    imageUpload: boolean;
    /** Tool hint selector (force specific tool) */
    toolHints: boolean;
    /** Text-to-speech voice playback */
    voice: boolean;
    /** Extended thinking toggle (Claude models) */
    thinking: boolean;
    /** Conversation compaction + branching */
    compaction: boolean;
    /** Soul trait modulation panel */
    soulTraits: boolean;
    /** Image picker panel (Cog series browser) */
    imagePicker: boolean;
    /** Heartbeat settings panel */
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
