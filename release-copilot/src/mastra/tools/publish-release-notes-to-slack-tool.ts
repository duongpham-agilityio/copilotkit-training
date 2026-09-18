import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { SlackPublishRequestSchema } from '../../types/slack-publish-request';
import { postToSlackWebhook } from '../lib/slack/post-to-slack-webhook';
import { joinLines } from '../../lib/text';

export const publishReleaseNotesToSlackTool = createTool({
  id: 'publish-release-notes-to-slack',
  description: joinLines(
    'Post the release-notes draft currently shown to the team Slack channel.',
    'Only call this when the user explicitly asks to send it to Slack, including',
    'by accepting a "Send to Slack" suggestion. Never call it automatically right',
    'after drafting or editing, and never call it twice for the same unmodified',
    'draft. This call performs the real post immediately — there is no',
    'confirmation step after it, so never call it speculatively. Report the',
    'outcome from this tool\'s result only: never tell the user notes were',
    'posted unless `ok` is true, and surface `error` verbatim on failure.',
  ),
  inputSchema: SlackPublishRequestSchema,
  outputSchema: z.object({
    ok: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async (inputData) => postToSlackWebhook(inputData.label, inputData.content),
});
