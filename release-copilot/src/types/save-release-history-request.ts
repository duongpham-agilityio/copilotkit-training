import { z } from 'zod';
import { joinLines } from '../lib/text';
import { PlatformDraftSchema, ReleaseNotesDraftSchema } from './release-notes-draft';
import { ReleaseEntrySchema } from './release-entry';
import {
  APP_STORE_CHARACTER_LIMIT,
  GOOGLE_PLAY_CHARACTER_LIMIT,
  RELEASE_TITLE_CHARACTER_BUDGET,
} from '../constants/config/lib-config';

// These budgets are guidance in the field descriptions below, never validation.
// Nothing here rejects an over-long body: the draft belongs to the user, and if a
// destination truncates it they can ask for a rebuild under a stated limit.
const APP_STORE_BODY_LIMIT =
  APP_STORE_CHARACTER_LIMIT - RELEASE_TITLE_CHARACTER_BUDGET;
const GOOGLE_PLAY_BODY_LIMIT =
  GOOGLE_PLAY_CHARACTER_LIMIT - RELEASE_TITLE_CHARACTER_BUDGET;

// Deliberately NOT `ReleaseNotesDraftSchema.extend(...)` anymore. That schema's
// platform shape is now a single flexible `{platform, label, content}` slot and no
// longer carries `github`/`appStore`/`googlePlay`/`platforms` — History's own move to
// that model is a separate, future change. This schema keeps History's historical
// three-named-platform save request unchanged; only `releaseDate`/`titleOverride`
// (untouched by the draft-schema change) are reused directly from it.
export const SaveReleaseHistoryRequestSchema = z.object({
  releaseDate: ReleaseNotesDraftSchema.shape.releaseDate,
  titleOverride: ReleaseNotesDraftSchema.shape.titleOverride,
  version: z.string().min(1),
  title: z.string().min(1),
  github: z
    .string()
    .min(1)
    .describe(
      joinLines(
        'GitHub release notes body as Markdown, starting at the first `##`',
        'section — never write a title/H1 line, the app prepends it. Sections in',
        'this order, omitting any that have no entries: ## 💥 Breaking Changes,',
        '## ✨ Features, ## 🐛 Fixes, ## 🔧 Other Changes (entries whose type was',
        "kept via the user's working memory keepExcludedTypes; rare, usually",
        'absent). One bullet per entry, commit IDs as inline code. No length',
        'limit.',
      ),
    ),
  appStore: z
    .string()
    .min(1)
    .describe(
      joinLines(
        'App Store/TestFlight "What\'s New" body — never write a title line, the',
        'app prepends it. Plain text only: no markdown, no emoji, no commit',
        'hashes, no internal file or module names. Written for end users, not',
        `developers. Aim for at most ${APP_STORE_BODY_LIMIT} characters.`,
      ),
    )
    .nullish(),
  googlePlay: z
    .string()
    .min(1)
    .describe(
      joinLines(
        'Google Play release notes body — never write a title line, the app',
        'prepends it. Plain text only: no markdown, no emoji, no commit hashes,',
        'no internal names. Most impactful change first, since Play truncates.',
        `Aim for at most ${GOOGLE_PLAY_BODY_LIMIT} characters.`,
      ),
    )
    .nullish(),
  platforms: z
    .array(PlatformDraftSchema)
    .default([])
    .describe(
      'Variants for platforms other than the three above. An empty array is normal.',
    ),
  entries: z.array(ReleaseEntrySchema).min(1),
});

export type SaveReleaseHistoryRequest = z.infer<
  typeof SaveReleaseHistoryRequestSchema
>;
