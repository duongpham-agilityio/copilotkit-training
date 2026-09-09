import { createSkill } from '@mastra/core/skills';
import {
  APP_STORE_CHARACTER_LIMIT,
  GOOGLE_PLAY_CHARACTER_LIMIT,
  RELEASE_NOTES_TITLE_PREFIX,
} from '../../constants/config/lib-config';

export const platformFormattingSkill = createSkill({
  name: 'platform-formatting',
  description:
    'Use when drafting or editing a release-notes body for a specific platform (GitHub, App Store/TestFlight, Google Play) and you need that platform\'s exact format and character limit.',
  instructions: `# Platform Formatting

Hard constraints on how a rendered draft looks per platform. Never violate them, even
if the user asks you to.

## All platforms

- Section order: Breaking changes, then Features, then Fixes, then Other Changes.
  Other Changes holds only entries kept via working memory's \`keepExcludedTypes\` (see
  Rules) and is the rarest section — omit it, like any other, when it has no entries.
  Omit any section with no entries — never print an empty heading, "None", or "N/A"
- Never write a title or date line yourself. The title is always
  "${RELEASE_NOTES_TITLE_PREFIX}yyyymmdd" and is prepended separately — a draft body
  starts at its first section
- Strip the Conventional Commits prefix before it becomes a bullet: \`feat: add JSON
  export\` reads as "Add JSON export"

## GitHub (Markdown, no length limit)

- Section headings exactly: \`## 💥 Breaking Changes\`, \`## ✨ Features\`,
  \`## 🐛 Fixes\`, \`## 🔧 Other Changes\`
- One bullet per entry, starting with an imperative verb, commit ID as inline code in
  parentheses at the end: \`- Add JSON export for release notes (\\\`abc1234\\\`)\`
- Emoji belong in section headings only, never on individual bullets

## App Store / TestFlight (plain text, ${APP_STORE_CHARACTER_LIMIT} characters total)

- No markdown, no emoji, no \`#\`, \`*\`, or backticks
- No commit hashes, no PR numbers, no file/module/branch names — this text is read by
  end users, not developers
- Rewrite each entry as the user-visible outcome, not the raw commit message:
  \`fix: null deref in export worker\` becomes "Fixed a crash when exporting large
  files"
- One short line per change, prefixed with \`- \` or \`• \`; an optional one-sentence
  summary line before the list is fine

## Google Play (plain text, ${GOOGLE_PLAY_CHARACTER_LIMIT} characters total)

- Same plain-text, no-hash, no-jargon rules as App Store
- Most impactful change first — the store truncates the rest
- 3 to 5 lines at most; brevity beats completeness

## Fitting a character limit

Shorten before dropping:

1. Tighten each line to its user-facing essence; merge near-duplicate entries
2. Only if it still doesn't fit, drop whole entries, lowest priority first (Other
   Changes, then Fixes, then Features, then Breaking changes)
3. Never truncate mid-sentence, and never produce a body that exceeds the limit`,
});
