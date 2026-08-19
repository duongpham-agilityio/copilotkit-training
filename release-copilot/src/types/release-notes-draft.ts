import { z } from 'zod';
// Relative, extensionless import (not the `@/` alias): this module is bundled by
// both Vite (client) and Mastra's own server bundler (via the backend
// render-release-notes-preview tool), and Mastra's bundler doesn't resolve the `@/`
// alias — see src/mastra/** for the same convention.
import { joinLines } from '../lib/text';
import { Platform } from './platform';

export const ReleaseNotesDraftSchema = z.object({
  github: z
    .string()
    .min(1)
    .describe(
      joinLines(
        'GitHub release notes as Markdown: headed sections (## Features,',
        '## Fixes, ## Breaking Changes), one emoji-prefixed bullet per entry,',
        'commit IDs as inline code. No length limit.',
      ),
    ),
  appStore: z
    .string()
    .min(1)
    .describe(
      'App Store/TestFlight "What\'s New" text: plain text, no markdown, max 4000 characters.',
    ),
  googlePlay: z
    .string()
    .min(1)
    .describe(
      'Google Play release notes: plain text, no markdown, max 500 characters.',
    ),
});

export type ReleaseNotesDraft = z.infer<typeof ReleaseNotesDraftSchema>;

export const DRAFT_FIELD_BY_PLATFORM: Record<
  Platform,
  keyof ReleaseNotesDraft
> = {
  [Platform.Github]: 'github',
  [Platform.AppStore]: 'appStore',
  [Platform.GooglePlay]: 'googlePlay',
};
