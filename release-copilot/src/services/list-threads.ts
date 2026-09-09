import { FETCH_TIMEOUT_MS } from '@/constants/time.ts';
import { MEMORY_THREADS_ROUTE_PATH } from '@/constants/endpoints.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';
import { getRequiredEnv } from '@/lib/env.ts';
import { getAuthHeader } from '@/services/get-auth-header.ts';
import {
  ListThreadsResponseSchema,
  type ThreadSummary,
} from '@/types/thread.ts';

const TARGET = 'the threads list';

export const listThreads = async (
  queryParams: Record<string, string> = {},
): Promise<ThreadSummary[]> => {
  const baseUrl = getRequiredEnv(
    import.meta.env.VITE_MASTRA_SERVER_URL,
    'VITE_MASTRA_SERVER_URL',
  );

  const params = new URLSearchParams(queryParams);

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}${MEMORY_THREADS_ROUTE_PATH}?${params.toString()}`,
      {
        headers: getAuthHeader(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
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
