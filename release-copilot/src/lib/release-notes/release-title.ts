import {
  RELEASE_NOTES_DEFAULT_TIME_ZONE,
  RELEASE_NOTES_TITLE_PREFIX,
} from '../../constants/release-notes';
import { Platform } from '../../types/platform';
import { DRAFT_FIELD_BY_PLATFORM } from '../../types/release-notes-draft';
import type { ReleaseNotesDraft } from '../../types/release-notes-draft';

export const formatReleaseDate = (
  now: Date = new Date(),
  timeZone: string = RELEASE_NOTES_DEFAULT_TIME_ZONE,
): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .replaceAll('-', '');

export const buildReleaseTitle = (
  { releaseDate, titleOverride }: ReleaseNotesDraft,
  now?: Date,
): string =>
  titleOverride ??
  `${RELEASE_NOTES_TITLE_PREFIX}${releaseDate ?? formatReleaseDate(now)}`;

export const composeDraftContent = (
  draft: ReleaseNotesDraft,
  platform: Platform,
  now?: Date,
): string => {
  const title = buildReleaseTitle(draft, now);
  const body = draft[DRAFT_FIELD_BY_PLATFORM[platform]];

  return platform === Platform.Github
    ? `# ${title}\n\n${body}`
    : `${title}\n\n${body}`;
};
