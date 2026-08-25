import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { COPILOTKIT_RESOURCE_ID } from '@/constants/copilotkit.ts';
import { FETCH_TIMEOUT_MS } from '@/constants/network.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';
import { ListThreadsResponseSchema, type ThreadSummary } from '@/types/thread.ts';

const TARGET = 'the threads list';

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

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/memory/threads?${params.toString()}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(toNetworkErrorMessage(error, TARGET), { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Failed to list threads: ${response.status}`);
  }

  const parsed = ListThreadsResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      `The threads route returned an unexpected shape: ${parsed.error.message}`,
    );
  }

  return parsed.data.threads;
};
