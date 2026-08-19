import { z } from 'zod';
// Relative, extensionless import (not the `@/` alias): this module is bundled by
// both Vite (client, via src/services/publish-to-slack.ts) and Mastra's own server
// bundler (via src/mastra/api/slack-publish-route.ts), and Mastra's bundler doesn't
// resolve the `@/` alias — see src/mastra/** for the same convention.
import { Platform } from './platform';

// Slack's message text limit is 40,000 characters. The cap here leaves room for the
// heading and the code fence added around it, and rejects a runaway payload before it
// reaches Slack rather than after.
const MAX_CONTENT_LENGTH = 35_000;

export const SlackPublishRequestSchema = z.object({
  platform: z.enum([Platform.Github, Platform.AppStore, Platform.GooglePlay]),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
});

export type SlackPublishRequest = z.infer<typeof SlackPublishRequestSchema>;
