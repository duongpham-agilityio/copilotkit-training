import { z } from 'zod';
import { joinLines } from '@/lib/text.ts';
import { Platform } from './platform.ts';

// The one thing the model legitimately knows that the UI doesn't: which platform the
// user asked to announce. Deliberately the ONLY parameter — the notes themselves stay
// out, so there is nothing the model can send that could differ from what is on screen.
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
