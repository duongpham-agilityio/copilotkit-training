import { INTRO } from './intro';
import { COMMIT_CLASSIFICATION } from './commit-classification';
import { RELEASE_NOTE_FORMATTING } from './release-note-formatting';
import { APP_USAGE_FAQ } from './app-usage-faq';

// Rules are split one file per topic so each stays independently readable and
// diffable; joined here into the single instructions string the agent needs.
// Content is copied verbatim from `src/mastra/skills/*/SKILL.md`, which stay in the
// repo as the readable reference — edit those and these together.
export const RELEASE_COPILOT_INSTRUCTIONS = [
  INTRO,
  COMMIT_CLASSIFICATION,
  RELEASE_NOTE_FORMATTING,
  APP_USAGE_FAQ,
].join('\n\n---\n\n');
