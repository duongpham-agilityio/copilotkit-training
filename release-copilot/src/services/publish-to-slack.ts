import type { SlackPublishRequest } from '@/types/slack-publish-request.ts';
import { SLACK_PUBLISH_ROUTE_PATH } from '@/constants/slack.ts';

interface PublishToSlackResult {
  ok: boolean;
  error?: string;
}

export const publishToSlack = async ({
  platform,
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
      body: JSON.stringify({ platform, content }),
    });

    if (response.ok) {
      return { ok: true };
    }

    let error = `Publish failed with status ${response.status}.`;
    try {
      const body: unknown = await response.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof body.error === 'string'
      ) {
        error = body.error;
      }
    } catch {
    }

    return { ok: false, error };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
