import { z } from 'zod';
import { joinLines } from '@/lib/text.ts';

export const ConfirmSlackPublishSchema = z.object({
  platformId: z
    .string()
    .optional()
    .describe(
      joinLines(
        'Which platform variant the confirmation card should open on — "github",',
        '"app-store", "google-play", or one of the dynamic ids from the platforms',
        'array (e.g. "slack"). Set it only when the user named one ("post the',
        'Google Play notes"). Omit it otherwise — the card defaults to GitHub.',
      ),
    ),
});

export type ConfirmSlackPublishArgs = z.infer<typeof ConfirmSlackPublishSchema>;
