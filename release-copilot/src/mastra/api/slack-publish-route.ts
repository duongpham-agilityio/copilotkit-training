import { registerApiRoute } from '@mastra/core/server';
import { SlackPublishRequestSchema } from '../../types/slack-publish-request';
import { SLACK_PUBLISH_ROUTE_PATH } from '../../constants/endpoints';
import { SLACK_ERROR_MESSAGES } from '../../constants/messages';
import { postToSlackWebhook } from '../lib/slack/post-to-slack-webhook';

export const slackPublishRoute = registerApiRoute(SLACK_PUBLISH_ROUTE_PATH, {
  method: 'POST',
  handler: async (context) => {
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
    const result = await postToSlackWebhook(label, content);

    return context.json(result, result.ok ? 200 : 502);
  },
});
