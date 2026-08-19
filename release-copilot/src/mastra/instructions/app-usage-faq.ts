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
itself and adds it to all 3 platform outputs, so it is always formatted the same way.
With no date mentioned in the request it uses today's date in ${RELEASE_NOTES_DEFAULT_TIME_ZONE};
mention a date ("release notes for 1/9/2026", slash dates read day-first) to use that
one instead, or ask for another timezone. Asking for a specific title ("title it v2.1.0
Release") replaces the whole line.

## Copy and export

The rendered draft for each platform can be copied with one click, or exported to
Markdown (\`.md\`), plain text (\`.txt\`), or JSON (structured, machine-readable). Export
always operates on the currently generated draft — it doesn't re-run classification.

## Platform character limits

- GitHub: no limit
- App Store/TestFlight: ${APP_STORE_CHARACTER_LIMIT} characters
- Google Play: ${GOOGLE_PLAY_CHARACTER_LIMIT} characters

The title line counts toward those limits, so the drafted body is held slightly under
them.

## Publishing to Slack

After a draft renders, the copilot offers to announce it in the team Slack channel. A
confirmation card appears in the chat with a platform selector, a preview of exactly
what will be sent, and Send / Cancel. The card shows the same text as the Live Preview
panel — both read the one generated draft, so they can never disagree. Nothing is
posted unless Send is clicked, and cancelling leaves the draft untouched. The card
opens on whichever platform the preview panel is showing and posts the variant
selected on the card itself, so a different platform can be announced without
switching tabs. The Slack channel is fixed by configuration and cannot be chosen from
the chat.`;
