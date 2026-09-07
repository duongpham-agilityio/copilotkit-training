import { BASE_INSTRUCTIONS } from '../base';
import { buildIntro } from './intro';
import { LOOP } from './loop';
import { RELEASE_NOTES_DEFAULT_TIME_ZONE } from '../../../../constants/release-notes';
import { formatReleaseDate } from '../../../../lib/release-notes/release-title';

const toHourIso = (now: Date): string =>
  `${now.toISOString().slice(0, 13)}:00Z`;

export const buildReleaseCopilotInstructionsV2 = (
  now: Date = new Date(),
): string =>
  [
    buildIntro({
      nowIso: toHourIso(now),
      today: formatReleaseDate(now),
      defaultTimeZone: RELEASE_NOTES_DEFAULT_TIME_ZONE,
    }),
    ...BASE_INSTRUCTIONS,
    LOOP,
  ].join('\n\n---\n\n');
