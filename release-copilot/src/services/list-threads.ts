import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { COPILOTKIT_RESOURCE_ID } from '@/constants/copilotkit.ts';
import type { ThreadSummary } from '@/types/thread.ts';

interface ListThreadsResponse {
  threads: ThreadSummary[];
}

export const listThreads = async (): Promise<ThreadSummary[]> => {
  const baseUrl = import.meta.env.VITE_MASTRA_SERVER_URL;
  if (!baseUrl) {
    throw new Error(
      'VITE_MASTRA_SERVER_URL is not set — cannot reach the threads route.',
    );
  }

  const params = new URLSearchParams({
    resourceId: COPILOTKIT_RESOURCE_ID,
    agentId: RELEASE_COPILOT_AGENT_ID,
  });

  const response = await fetch(`${baseUrl}/api/memory/threads?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to list threads: ${response.status}`);
  }

  const body = (await response.json()) as ListThreadsResponse;
  return body.threads;
};
