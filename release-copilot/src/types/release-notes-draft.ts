import { z } from 'zod';
import { joinLines } from '../lib/text';
import {
  APP_STORE_CHARACTER_LIMIT,
  GOOGLE_PLAY_CHARACTER_LIMIT,
  PLATFORM_CHARACTER_LIMITS,
  RELEASE_NOTES_TITLE_PREFIX,
  RELEASE_TITLE_CHARACTER_BUDGET,
} from '../constants/release-notes';

const APP_STORE_BODY_LIMIT =
  APP_STORE_CHARACTER_LIMIT - RELEASE_TITLE_CHARACTER_BUDGET;
const GOOGLE_PLAY_BODY_LIMIT =
  GOOGLE_PLAY_CHARACTER_LIMIT - RELEASE_TITLE_CHARACTER_BUDGET;

export const PlatformDraftSchema = z.object({
  platformId: z
    .string()
    .min(1)
    .describe(
      joinLines(
        'Kebab-case identifier: slack, discord, email-customer, changelog,',
        'x-twitter... NEVER use this for github/app-store/google-play — those',
        'three have their own dedicated fields above.',
      ),
    ),
  label: z
    .string()
    .min(1)
    .describe('Display name shown to the user: "Slack", "Customer Email".'),
  body: z
    .string()
    .min(1)
    .describe(
      'The body for this platform. Never write a title line — the app prepends it.',
    ),
  characterLimit: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .describe("This platform's character limit, if it has one. Omit when unlimited."),
});

export type PlatformDraft = z.infer<typeof PlatformDraftSchema>;

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
    )
    .optional(),
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
    )
    .optional(),
  platforms: z
    .array(PlatformDraftSchema)
    .default([])
    .describe(
      'Variants for platforms other than the three above. An empty array is normal.',
    )
    .superRefine((list, ctx) => {
      list.forEach((platformDraft, index) => {
        // The repo's own table beats whatever the model claims — a fabricated
        // limit cannot pass validation.
        const limit =
          PLATFORM_CHARACTER_LIMITS[platformDraft.platformId] ??
          platformDraft.characterLimit;
        if (
          limit &&
          platformDraft.body.length > limit - RELEASE_TITLE_CHARACTER_BUDGET
        ) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'body'],
            message: `Exceeds the ${limit}-character limit for ${platformDraft.platformId}.`,
          });
        }
      });
    }),
});

export type ReleaseNotesDraft = z.infer<typeof ReleaseNotesDraftSchema>;
