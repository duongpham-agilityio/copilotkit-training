import type { SlackPublishRequest } from '@/types/slack-publish-request.ts';
import { SLACK_PUBLISH_ROUTE_PATH } from '@/constants/slack.ts';
import { FETCH_TIMEOUT_MS } from '@/constants/network.ts';
import { toNetworkErrorMessage } from '@/lib/network-error-message.ts';

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
  const baseUrl = import.meta.env.VITE_MASTRA_SERVER_URL;
  if (!baseUrl) {
    return {
      ok: false,
      error: 'VITE_MASTRA_SERVER_URL is not set — cannot reach the publish route.',
    };
  }

  try {
    const response = await fetch(`${baseUrl}${SLACK_PUBLISH_ROUTE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
