import { SLACK_ERROR_MESSAGES } from '../../../constants/messages';
import { SLACK_WEBHOOK_TIMEOUT_MS } from '../../../constants/time';

export interface PostToSlackWebhookResult {
  ok: boolean;
  error?: string;
}

const buildSlackText = (label: string, content: string): string =>
  `*Release notes* · ${label}\n\`\`\`\n${content}\n\`\`\``;

// Server-only: reads SLACK_WEBHOOK_URL. Shared by the /slack/publish route
// (History page's manual send) and the publish-release-notes-to-slack agent
// tool (chat-driven send) — never import this from client code.
export const postToSlackWebhook = async (
  label: string,
  content: string,
): Promise<PostToSlackWebhookResult> => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return { ok: false, error: SLACK_ERROR_MESSAGES.MISSING_WEBHOOK_URL };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: buildSlackText(label, content) }),
      signal: AbortSignal.timeout(SLACK_WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `${SLACK_ERROR_MESSAGES.SLACK_REJECTED} (${response.status}): ${await response.text()}`,
      };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return { ok: false, error: SLACK_ERROR_MESSAGES.WEBHOOK_TIMEOUT };
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
