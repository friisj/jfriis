/**
 * Chief: Agent Delegation Tools
 *
 * Two tools: discover available agents, then delegate work to them.
 * Chief doesn't hardcode agent names — it discovers them at runtime
 * from the registry and delegates by ID.
 */

import { tool, zodSchema, generateText, stepCountIs, type ToolSet } from 'ai';
import { z } from 'zod';
import { AGENTS, DEFAULT_AGENT } from './registry';
import { getModel } from '../ai/models';

/**
 * List all available agents and their capabilities.
 * Chief uses this to understand who it can delegate to.
 */
export const listAgents = tool({
  description:
    'List all available agents and their capabilities. ' +
    'Use this to discover which agents exist and what they can do, ' +
    'before deciding whether to delegate a task.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const agents = Object.values(AGENTS)
      .filter((a) => a.id !== DEFAULT_AGENT) // Don't list self
      .map((a) => ({
        id: a.id,
        label: a.label,
        description: a.description,
        capabilities: Object.entries(a.features)
          .filter(([, enabled]) => enabled)
          .map(([name]) => name),
      }));

    return {
      agents,
      count: agents.length,
      note: 'Use delegate_to_agent to send a task to any of these agents.',
    };
  },
});

/**
 * Delegate a task to another agent. Runs a sub-completion with that
 * agent's full configuration (system prompt, tools) and returns the result.
 *
 * The delegated agent runs independently — it doesn't see Chief's
 * conversation history, only the prompt you provide.
 */
export const delegateToAgent = tool({
  description:
    'Delegate a task to another agent. The agent runs independently with its own ' +
    'system prompt and tools, processing only the prompt you provide. ' +
    'Use list_agents first to discover available agents. ' +
    'Good for: image generation (Luv), character work (Luv), or any task ' +
    'that requires a specialist agent\'s unique capabilities.',
  inputSchema: zodSchema(
    z.object({
      agentId: z.string().describe('Agent ID from list_agents (e.g. "luv")'),
      prompt: z.string().describe(
        'The task prompt for the agent. Be specific — the agent has no context ' +
        'from this conversation. Include all relevant details.'
      ),
      modelKey: z.string().optional().describe('Model to use (default: claude-sonnet)'),
    })
  ),
  execute: async ({ agentId, prompt, modelKey }) => {
    // Validate agent exists
    const agentConfig = AGENTS[agentId];
    if (!agentConfig) {
      return {
        success: false,
        error: `Agent "${agentId}" not found. Use list_agents to see available agents.`,
      };
    }

    // Can't delegate to self
    if (agentId === DEFAULT_AGENT) {
      return {
        success: false,
        error: 'Cannot delegate to yourself. Handle this task directly.',
      };
    }

    try {
      // Load agent-specific setup
      const setup = await loadAgentSetup(agentId, modelKey ?? 'claude-sonnet');
      if (!setup) {
        return {
          success: false,
          error: `Failed to load agent "${agentId}" configuration.`,
        };
      }

      // Run sub-completion
      const result = await generateText({
        model: getModel(modelKey ?? 'claude-sonnet'),
        system: setup.systemPrompt,
        prompt,
        tools: setup.tools,
        stopWhen: stepCountIs(10),
      });

      return {
        success: true,
        agentId,
        agentLabel: agentConfig.label,
        response: result.text,
        toolCalls: result.steps.flatMap((s) =>
          (s.toolCalls ?? []).map((tc) => ({
            toolName: (tc as { toolName: string }).toolName,
          }))
        ),
        stepsUsed: result.steps.length,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Delegation failed',
        agentId,
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Agent setup loader
// ---------------------------------------------------------------------------

async function loadAgentSetup(
  agentId: string,
  modelKey: string,
): Promise<{ systemPrompt: string; tools: ToolSet } | null> {
  if (agentId === 'luv') {
    const { setupLuvAgent } = await import('./luv-adapter');
    const luv = await setupLuvAgent([], {
      modelKey,
      thinking: false,
    });
    return {
      systemPrompt: luv.systemPrompt,
      tools: luv.tools,
    };
  }

  // Future agents would be added here
  return null;
}

export const chiefDelegationTools = {
  list_agents: listAgents,
  delegate_to_agent: delegateToAgent,
};
