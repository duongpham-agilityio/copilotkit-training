import { z } from 'zod';
// Relative, extensionless import (not the `@/` alias): this module is bundled by
// both Vite (client) and Mastra's own server bundler (via the backend
// render-release-notes-preview tool), and Mastra's bundler doesn't resolve the `@/`
// alias — see src/mastra/** for the same convention.
import { joinLines } from '../lib/text';
import { Platform } from './platform';
import {
  APP_STORE_CHARACTER_LIMIT,
  GOOGLE_PLAY_CHARACTER_LIMIT,
  RELEASE_NOTES_TITLE_PREFIX,
  RELEASE_TITLE_CHARACTER_BUDGET,
} from '../constants/release-notes';

// The store limits apply to the finished text, which the app builds as
// `<title>\n\n<body>` — so the model's budget is the limit minus the title.
const APP_STORE_BODY_LIMIT =
  APP_STORE_CHARACTER_LIMIT - RELEASE_TITLE_CHARACTER_BUDGET;
const GOOGLE_PLAY_BODY_LIMIT =
  GOOGLE_PLAY_CHARACTER_LIMIT - RELEASE_TITLE_CHARACTER_BUDGET;

export const ReleaseNotesDraftSchema = z.object({
  releaseDate: z
    .string()
    .regex(/^\d{8}$/)
    .optional()
    .describe(
      joinLines(
        'The release date as yyyymmdd (e.g. 20260901), normalized from whatever',
        'the user wrote. Set it ONLY when the user named a release date;',
        'ambiguous slash dates are day-first (1/9/2026 is 1 September 2026).',
        'Omit this field entirely when the user gave no date — the app then',
        "fills in today's date itself. Never guess a date.",
      ),
    ),
  titleOverride: z
    .string()
    .min(1)
    .max(RELEASE_TITLE_CHARACTER_BUDGET)
    .optional()
    .describe(
      joinLines(
        'A replacement for the whole title line, used verbatim. Set it ONLY when',
        'the user explicitly asked for a different title (e.g. "title it v2.1.0',
        'Release"). Omit it otherwise — the app then builds',
        `"${RELEASE_NOTES_TITLE_PREFIX}yyyymmdd" itself.`,
      ),
    ),
  github: z
    .string()
    .min(1)
    .describe(
      joinLines(
        'GitHub release notes body as Markdown, starting at the first `##`',
        'section — never write a title/H1 line, the app prepends it. Sections in',
        'this order, omitting any that have no entries: ## 💥 Breaking Changes,',
        '## ✨ Features, ## 🐛 Fixes. One bullet per entry, commit IDs as inline',
        'code. No length limit.',
      ),
    ),
  appStore: z
    .string()
    .min(1)
    .max(APP_STORE_BODY_LIMIT)
    .describe(
      joinLines(
        'App Store/TestFlight "What\'s New" body — never write a title line, the',
        'app prepends it. Plain text only: no markdown, no emoji, no commit',
        'hashes, no internal file or module names. Written for end users, not',
        `developers. At most ${APP_STORE_BODY_LIMIT} characters.`,
      ),
    ),
  googlePlay: z
    .string()
    .min(1)
    .max(GOOGLE_PLAY_BODY_LIMIT)
    .describe(
      joinLines(
        'Google Play release notes body — never write a title line, the app',
        'prepends it. Plain text only: no markdown, no emoji, no commit hashes,',
        'no internal names. Most impactful change first, since Play truncates.',
        `At most ${GOOGLE_PLAY_BODY_LIMIT} characters.`,
      ),
    ),
});

export type ReleaseNotesDraft = z.infer<typeof ReleaseNotesDraftSchema>;

// Spelled out rather than `keyof ReleaseNotesDraft`: the draft also carries
// releaseDate/titleOverride, which are metadata about the notes, not per-platform
// bodies — `keyof` would let one of them be mapped to a platform by mistake.
export const DRAFT_FIELD_BY_PLATFORM: Record<
  Platform,
  'github' | 'appStore' | 'googlePlay'
> = {
  [Platform.Github]: 'github',
  [Platform.AppStore]: 'appStore',
  [Platform.GooglePlay]: 'googlePlay',
};
