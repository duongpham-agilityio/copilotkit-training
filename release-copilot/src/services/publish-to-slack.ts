import type { SlackPublishRequest } from '@/types/slack-publish-request.ts';
import { SLACK_PUBLISH_ROUTE_PATH } from '@/constants/endpoints.ts';
import { FETCH_TIMEOUT_MS } from '@/constants/time.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';
import { getRequiredEnv } from '@/lib/env.ts';
import { getAuthHeader } from '@/services/get-auth-header.ts';

interface PublishToSlackResult {
  ok: boolean;
  error?: string;
}

const TARGET = 'the Slack publish route';

export const publishToSlack = async ({
  platformId,
  label,
  content,
}: SlackPublishRequest): Promise<PublishToSlackResult> => {
  try {
    const baseUrl = getRequiredEnv(
      import.meta.env.VITE_MASTRA_SERVER_URL,
      'VITE_MASTRA_SERVER_URL',
    );

    const response = await fetch(`${baseUrl}${SLACK_PUBLISH_ROUTE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ platformId, label, content }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.ok) {
      return { ok: true };
    }

    let error = `Publish failed with status ${response.status}.`;
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
