import {
  APP_STORE_CHARACTER_LIMIT,
  GOOGLE_PLAY_CHARACTER_LIMIT,
  RELEASE_NOTES_DEFAULT_TIME_ZONE,
  RELEASE_NOTES_TITLE_PREFIX,
} from '../../constants/release-notes';

export const APP_USAGE_FAQ = `# App Usage FAQ

## Input sources

Paste either raw \`git log\` output or a PR title (optionally with a description) into
the chat. Both feed the same classification pipeline; only the parsing step differs.
For accurate classification, paste full commit messages (not bare hashes), one per
line, each with a Conventional Commits prefix (\`feat:\`, \`fix:\`, etc.).

## Commit selection

After classification, every entry appears in a commit list (author, relative
timestamp, hash, Feature/Fix/Breaking badge) with filter tabs (All/Feat/Fix) and a
per-entry checkbox. Only checked entries are used for drafting. Unchecking a commit
removes it from the pipeline entirely, not just from display. Changing the selection
after a draft already exists does not redraft automatically — ask again to regenerate
it. Asking to draft with nothing selected: the agent will ask you to pick at least one
entry first rather than generating an empty draft.

## Title and release date

Every draft is titled "${RELEASE_NOTES_TITLE_PREFIX}yyyymmdd". The app builds that line
itself and adds it to every platform output, so it is always formatted the same way.
With no date mentioned in the request it uses today's date in ${RELEASE_NOTES_DEFAULT_TIME_ZONE};
mention a date ("release notes for 1/9/2026", slash dates read day-first) to use that
one instead, or ask for another timezone. Asking for a specific title ("title it v2.1.0
Release") replaces the whole line.

## Copy and export

The rendered draft for each platform can be copied with one click, or exported to
Markdown (\`.md\`), plain text (\`.txt\`), or JSON (structured, machine-readable). Export
always operates on the currently generated draft — it doesn't re-run classification.

## Platforms and character limits

Every draft always covers 3 platforms: GitHub (no limit, shown in the Live Preview
panel), App Store/TestFlight (${APP_STORE_CHARACTER_LIMIT} characters), and Google Play
(${GOOGLE_PLAY_CHARACTER_LIMIT} characters). The title line counts toward those limits,
so the drafted body is held slightly under them.

Naming another destination ("also make a Slack version") adds it as an extra platform
card shown in the chat, alongside the same App Store/Google Play limit rules where one
applies.

## Publishing to Slack

After a draft renders, the copilot offers to announce it in the team Slack channel. A
confirmation card appears in the chat with a platform selector — GitHub plus every
platform the current draft has — a preview of exactly what will be sent, and Send /
Cancel. Nothing is posted unless Send is clicked, and cancelling leaves the draft
untouched. The card opens on GitHub by default, or on whichever platform the user
named, and posts the variant selected on the card itself. The Slack channel is fixed
by configuration and cannot be chosen from the chat.`;
