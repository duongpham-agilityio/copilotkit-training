import { registerApiRoute } from '@mastra/core/server';
import { Platform } from '../../types/platform';
import { SlackPublishRequestSchema } from '../../types/slack-publish-request';
import {
  SLACK_PUBLISH_ROUTE_PATH,
  SLACK_ERROR_MESSAGES,
} from '../../constants/slack';

const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.Github]: 'GitHub',
  [Platform.AppStore]: 'App Store / TestFlight',
  [Platform.GooglePlay]: 'Google Play',
};

const buildSlackText = (platform: Platform, content: string): string =>
  `*Release notes* · ${PLATFORM_LABELS[platform]}\n\`\`\`\n${content}\n\`\`\``;

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

    const parsed = SlackPublishRequestSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json(
        {
          ok: false,
          error: `${SLACK_ERROR_MESSAGES.INVALID_REQUEST}: ${parsed.error.message}`,
        },
        400,
      );
    }

    const { platform, content } = parsed.data;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: buildSlackText(platform, content) }),
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
