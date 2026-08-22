import { z } from 'zod';

const MAX_CONTENT_LENGTH = 35_000;

export const SlackPublishRequestSchema = z.object({
  platformId: z.string().min(1),
  label: z.string().min(1),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
});

export type SlackPublishRequest = z.infer<typeof SlackPublishRequestSchema>;
