import { z } from 'zod';
import { Platform } from './platform';

const MAX_CONTENT_LENGTH = 35_000;

export const SlackPublishRequestSchema = z.object({
  platform: z.enum([Platform.Github, Platform.AppStore, Platform.GooglePlay]),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
});

export type SlackPublishRequest = z.infer<typeof SlackPublishRequestSchema>;
