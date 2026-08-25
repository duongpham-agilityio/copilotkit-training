import { registerApiRoute } from '@mastra/core/server';
import { SlackPublishRequestSchema } from '../../types/slack-publish-request';
import {
  SLACK_PUBLISH_ROUTE_PATH,
  SLACK_ERROR_MESSAGES,
  SLACK_WEBHOOK_TIMEOUT_MS,
} from '../../constants/slack';

const buildSlackText = (label: string, content: string): string =>
  `*Release notes* · ${label}\n\`\`\`\n${content}\n\`\`\``;

export const slackPublishRoute = registerApiRoute(SLACK_PUBLISH_ROUTE_PATH, {
  method: 'POST',
  handler: async (context) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return context.json(
        {
          ok: false,
          error: SLACK_ERROR_MESSAGES.MISSING_WEBHOOK_URL,
        },
        500,
      );
    }

    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json(
        {
          ok: false,
          error: `${SLACK_ERROR_MESSAGES.INVALID_REQUEST}: body is not valid JSON.`,
        },
        400,
      );
    }

    const parsed = SlackPublishRequestSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        {
          ok: false,
          error: `${SLACK_ERROR_MESSAGES.INVALID_REQUEST}: ${parsed.error.message}`,
        },
        400,
      );
    }

    const { label, content } = parsed.data;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: buildSlackText(label, content) }),
        signal: AbortSignal.timeout(SLACK_WEBHOOK_TIMEOUT_MS),
      });

      if (!response.ok) {
        return context.json(
          {
            ok: false,
            error: `${SLACK_ERROR_MESSAGES.SLACK_REJECTED} (${response.status}): ${await response.text()}`,
          },
          502,
        );
      }

      return context.json({ ok: true });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        return context.json(
          { ok: false, error: SLACK_ERROR_MESSAGES.WEBHOOK_TIMEOUT },
          504,
        );
      }

      return context.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  },
});
