import { buildIntro } from './intro';
import { COMMIT_CLASSIFICATION } from './commit-classification';
import { RELEASE_NOTE_FORMATTING } from './release-note-formatting';
import { APP_USAGE_FAQ } from './app-usage-faq';
import { RELEASE_NOTES_DEFAULT_TIME_ZONE } from '../../constants/release-notes';
import { formatReleaseDate } from '../../lib/release-notes/release-title';

const toHourIso = (now: Date): string =>
  `${now.toISOString().slice(0, 13)}:00Z`;

export const buildReleaseCopilotInstructions = (
  now: Date = new Date(),
): string =>
  [
    buildIntro({
      nowIso: toHourIso(now),
      today: formatReleaseDate(now),
      defaultTimeZone: RELEASE_NOTES_DEFAULT_TIME_ZONE,
    }),
    COMMIT_CLASSIFICATION,
    RELEASE_NOTE_FORMATTING,
    APP_USAGE_FAQ,
  ].join('\n\n---\n\n');
