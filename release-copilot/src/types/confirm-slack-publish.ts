import { z } from 'zod';
import { joinLines } from '@/lib/text.ts';
import { Platform } from './platform.ts';

export const ConfirmSlackPublishSchema = z.object({
  platform: z
    .enum([Platform.Github, Platform.AppStore, Platform.GooglePlay])
    .optional()
    .describe(
      joinLines(
        'Which platform variant the confirmation card should open on. Set it only',
        'when the user named one ("post the Google Play notes"). Omit it otherwise',
        'and the card follows the preview panel the user is looking at.',
      ),
    ),
});

export type ConfirmSlackPublishArgs = z.infer<typeof ConfirmSlackPublishSchema>;
