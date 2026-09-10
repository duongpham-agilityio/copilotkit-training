import type { SaveReleaseHistoryRequest } from '@/types/save-release-history-request.ts';
import { RELEASE_HISTORY_ROUTE_PATH } from '@/constants/endpoints.ts';
import { FETCH_TIMEOUT_MS } from '@/constants/time.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';
import { getRequiredEnv } from '@/lib/env.ts';
import { getAuthHeader } from '@/services/get-auth-header.ts';

interface SaveReleaseHistoryResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const TARGET = 'the release history save route';

export const saveReleaseHistory = async (
  payload: SaveReleaseHistoryRequest,
): Promise<SaveReleaseHistoryResult> => {
  try {
    const baseUrl = getRequiredEnv(
      import.meta.env.VITE_MASTRA_SERVER_URL,
      'VITE_MASTRA_SERVER_URL',
    );

    const response = await fetch(`${baseUrl}${RELEASE_HISTORY_ROUTE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const id =
        typeof body === 'object' &&
        body !== null &&
        'id' in body &&
        typeof body.id === 'string'
          ? body.id
          : undefined;
      return { ok: true, id };
    }

    let error = `Save failed with status ${response.status}.`;
    const body: unknown = await response.json().catch(() => null);
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      error = body.error;
    }

    return { ok: false, error };
  } catch (error) {
    return { ok: false, error: toNetworkErrorMessage(error, TARGET) };
  }
};
