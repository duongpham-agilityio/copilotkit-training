import { FETCH_TIMEOUT_MS } from '@/constants/time.ts';
import { RELEASE_HISTORY_ROUTE_PATH } from '@/constants/endpoints.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';
import { getRequiredEnv } from '@/lib/env.ts';
import { getAuthHeader } from '@/services/get-auth-header.ts';
import {
  ListReleaseHistoryResponseSchema,
  type ListReleaseHistoryResponse,
} from '@/types/release-history-record.ts';

const TARGET = 'the release history list';

export const listReleaseHistory = async (
  queryParams: Record<string, string> = {},
): Promise<ListReleaseHistoryResponse> => {
  const baseUrl = getRequiredEnv(
    import.meta.env.VITE_MASTRA_SERVER_URL,
    'VITE_MASTRA_SERVER_URL',
  );

  const params = new URLSearchParams(queryParams);

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}${RELEASE_HISTORY_ROUTE_PATH}?${params.toString()}`,
      {
        headers: getAuthHeader(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
  } catch (error) {
    throw new Error(toNetworkErrorMessage(error, TARGET), { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Failed to list release history: ${response.status}`);
  }

  const parsed = ListReleaseHistoryResponseSchema.safeParse(
    await response.json(),
  );
  if (!parsed.success) {
    throw new Error(
      `The release history route returned an unexpected shape: ${parsed.error.message}`,
    );
  }

  return parsed.data;
};
