import { buildIntro } from './intro';
import { COMMIT_CLASSIFICATION } from './commit-classification';
import { RELEASE_NOTE_FORMATTING } from './release-note-formatting';
import { APP_USAGE_FAQ } from './app-usage-faq';
import { RELEASE_NOTES_DEFAULT_TIME_ZONE } from '../../constants/release-notes';
import { formatReleaseDate } from '../../lib/release-notes/release-title';

// Rules are split one file per topic so each stays independently readable and
// diffable; joined here into the single instructions string the agent needs.
//
// Built per request rather than exported as a constant: the model cannot know
// today's date, so the date it would need to put in a release title has to be
// injected. `now` is a parameter so this stays testable without faking the clock.
//
// Truncated to the hour on purpose. The system prompt is the same text on every
// turn apart from this line, so a to-the-second timestamp would change it on every
// single request and lose the provider's prompt cache. Whole hours are precise
// enough to resolve today's date in any timezone.
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
