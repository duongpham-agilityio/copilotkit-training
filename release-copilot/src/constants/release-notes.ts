// Shared between the agent's instructions (server bundle, which state the default
// timezone and the exact title shape the model must not write itself) and the
// title composer used by the Live Preview and the Slack card (client bundle).
// A rename on one side with no matching change on the other silently produces a
// draft whose title no longer matches what the agent was told — the cross-layer
// contract case in .agents/rules/conventions.md.

// The release date is a business decision, not a machine detail: it must not drift
// with wherever the Mastra server happens to be deployed. The user can still ask
// for a different timezone in chat — see the release-date rules in
// src/mastra/instructions/intro.ts.
export const RELEASE_NOTES_DEFAULT_TIME_ZONE = 'America/New_York';

export const RELEASE_NOTES_TITLE_PREFIX = 'Release Notes - #';

// Hard limits imposed by the stores themselves, applied as Zod `.max()` on the
// draft schema so an over-long draft fails validation and the model has to fix it,
// rather than only being discouraged in prose the model may ignore.
export const APP_STORE_CHARACTER_LIMIT = 4000;

export const GOOGLE_PLAY_CHARACTER_LIMIT = 500;

// The title line and its blank line are prepended by the app, so they are not part
// of what the model writes — the body budget has to leave room for them. 60 covers
// the default 25-character title with slack for a short custom one.
export const RELEASE_TITLE_CHARACTER_BUDGET = 60;
