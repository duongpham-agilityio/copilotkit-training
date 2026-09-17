import { RELEASE_NOTES_DEFAULT_TIME_ZONE } from '../../constants/config/time-zone';
import { RELEASE_NOTES_TITLE_PREFIX } from '../../constants/config/lib-config';
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

const parseReleaseDate = (releaseDate: string): Date => {
  const year = Number(releaseDate.slice(0, 4));
  const month = Number(releaseDate.slice(4, 6));
  const day = Number(releaseDate.slice(6, 8));
  return new Date(Date.UTC(year, month - 1, day, 12));
};

const formatParsedReleaseDate = (
  releaseDate: string,
  options: Intl.DateTimeFormatOptions,
  timeZone: string,
): string =>
  new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(
    parseReleaseDate(releaseDate),
  );

// "Sep 2, 2026"
export const formatReleaseDateDisplay = (
  releaseDate: string,
  timeZone: string = RELEASE_NOTES_DEFAULT_TIME_ZONE,
): string =>
  formatParsedReleaseDate(
    releaseDate,
    { year: 'numeric', month: 'short', day: 'numeric' },
    timeZone,
  );

// "Sep 2"
export const formatReleaseShortDateDisplay = (
  releaseDate: string,
  timeZone: string = RELEASE_NOTES_DEFAULT_TIME_ZONE,
): string =>
  formatParsedReleaseDate(releaseDate, { month: 'short', day: 'numeric' }, timeZone);

// "September 2026"
export const formatReleaseMonthDisplay = (
  releaseDate: string,
  timeZone: string = RELEASE_NOTES_DEFAULT_TIME_ZONE,
): string =>
  formatParsedReleaseDate(releaseDate, { year: 'numeric', month: 'long' }, timeZone);

export const buildReleaseTitle = (
  { releaseDate, titleOverride }: ReleaseNotesDraft,
  now?: Date,
): string =>
  titleOverride ??
  `${RELEASE_NOTES_TITLE_PREFIX}${releaseDate ?? formatReleaseDate(now)}`;

export const composeReleaseContent = (
  draft: ReleaseNotesDraft,
  now?: Date,
): string => `${buildReleaseTitle(draft, now)}\n\n${draft.content}`;
