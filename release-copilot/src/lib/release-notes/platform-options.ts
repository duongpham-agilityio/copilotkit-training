import { composeGithubContent, composePlatformContent } from '@/lib/release-notes/release-title.ts';
import { toPlatformDrafts } from '@/lib/release-notes/to-platform-drafts.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { PlatformOption } from '@/types/platform-option.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

// GitHub is composed separately because it takes its own path to the Live
// Preview panel; toPlatformDrafts only ever returns non-GitHub platforms.
export const buildPlatformOptions = (draft: ReleaseNotesDraft): PlatformOption[] => [
  {
    platformId: KnownPlatformId.Github,
    label: 'GitHub',
    content: composeGithubContent(draft),
  },
  ...toPlatformDrafts(draft).map((platformDraft) => ({
    platformId: platformDraft.platformId,
    label: platformDraft.label,
    content: composePlatformContent(draft, platformDraft),
  })),
];
