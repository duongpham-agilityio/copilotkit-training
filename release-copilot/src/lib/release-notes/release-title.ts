import { RELEASE_NOTES_DEFAULT_TIME_ZONE } from '../../constants/config/time-zone';
import { RELEASE_NOTES_TITLE_PREFIX } from '../../constants/config/lib-config';
import type {
  PlatformDraft,
  ReleaseNotesDraft,
} from '../../types/release-notes-draft';

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

export const formatReleaseDateDisplay = (
  releaseDate: string,
  timeZone: string = RELEASE_NOTES_DEFAULT_TIME_ZONE,
): string => {
  const year = Number(releaseDate.slice(0, 4));
  const month = Number(releaseDate.slice(4, 6));
  const day = Number(releaseDate.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const buildReleaseTitle = (
  { releaseDate, titleOverride }: ReleaseNotesDraft,
  now?: Date,
): string =>
  titleOverride ??
  `${RELEASE_NOTES_TITLE_PREFIX}${releaseDate ?? formatReleaseDate(now)}`;

export const composeGithubContent = (
  draft: ReleaseNotesDraft,
  now?: Date,
): string => `# ${buildReleaseTitle(draft, now)}\n\n${draft.github}`;

export const composePlatformContent = (
  draft: ReleaseNotesDraft,
  platformDraft: PlatformDraft,
  now?: Date,
): string => `${buildReleaseTitle(draft, now)}\n\n${platformDraft.body}`;
