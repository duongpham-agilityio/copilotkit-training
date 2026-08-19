import { registerApiRoute } from '@mastra/core/server';
import { z } from 'zod';
import { Platform } from '../../types/platform';
import { SLACK_PUBLISH_ROUTE_PATH, SLACK_ERROR_MESSAGES } from '../../constants/slack';

const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.Github]: 'GitHub',
  [Platform.AppStore]: 'App Store / TestFlight',
  [Platform.GooglePlay]: 'Google Play',
};

// Slack's message text limit is 40,000 characters. The cap here leaves room for the
// heading and the code fence added below, and rejects a runaway payload before it
// reaches Slack rather than after.
const MAX_CONTENT_LENGTH = 35_000;

const PublishRequestSchema = z.object({
  platform: z.enum([Platform.Github, Platform.AppStore, Platform.GooglePlay]),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
});

// The notes go inside a code block deliberately. Slack renders mrkdwn, not GitHub
// Markdown, so `## Features` would appear as literal text — and the point of the posted
// message is that someone copies it verbatim into GitHub or App Store Connect, which a
// code block keeps exact and one-click copyable.
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

    const parsed = PublishRequestSchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(
        { ok: false, error: `${SLACK_ERROR_MESSAGES.INVALID_REQUEST}: ${parsed.error.message}` },
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
      // Returned rather than thrown so the caller always receives the same shape. Never
      // retried here: a blind retry after an ambiguous failure can post the announcement
      // twice.
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
