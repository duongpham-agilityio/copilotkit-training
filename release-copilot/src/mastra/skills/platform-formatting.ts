import { createSkill } from '@mastra/core/skills';
import {
  APP_STORE_CHARACTER_LIMIT,
  GOOGLE_PLAY_CHARACTER_LIMIT,
  RELEASE_NOTES_TITLE_PREFIX,
} from '../../constants/config/lib-config';

export const platformFormattingSkill = createSkill({
  name: 'platform-formatting',
  description:
    'Use when creating or improving release notes and applying the required format, structure, or character limits for the target platform.',
  instructions: `
# Release Note Building

You create, edit, and optimize release-note content from release-related source
information.

The source may contain classified release entries, existing release notes, or a
combination of both.

Your job is to produce clear, concise, user-appropriate release-note content while
preserving the factual meaning of the available source information.

## Core Principles

### 1. Preserve factual meaning

- Never invent features, fixes, improvements, or user benefits that are not supported
  by the available source information.
- Do not introduce technical details that are not present in the source.
- Do not change the meaning of an entry merely to make it sound better.
- You may improve wording, structure, clarity, and conciseness.
- When the source does not provide enough information to safely describe a
  user-visible outcome, stay close to the source rather than guessing.

### 2. Build from classified entries

When building release notes from release entries:

- Use the assigned category from the classification stage.
- Do not reclassify entries.
- Preserve the original entry boundaries unless merging near-duplicate entries is
  necessary for the requested format or character limit.
- Respect the configured \`buildOrdering.keepExcludedTypes\` behavior when deciding whether excluded
  entries should appear under Other Changes.
- Do not create an Other Changes section for entries that were not explicitly kept.

### 3. Create, edit, and optimize

The requested operation determines how you should work:

- **Create:** Build release notes from the provided release information.
- **Edit:** Modify existing release notes according to the user's instructions while
  preserving information the user did not ask to change.
- **Optimize:** Improve clarity, readability, conciseness, ordering, and user impact
  without changing the factual meaning.
- **Reformat:** Adapt existing content to the requested structure or platform without
  unnecessarily rewriting its meaning.

Do not rebuild or rewrite content more extensively than the user's request requires.

### 4. User requirements take precedence over defaults

When the user explicitly specifies:

- A structure
- A section order
- A tone
- A length
- A target audience
- A platform
- A formatting style

follow those requirements unless they conflict with a hard constraint defined for the
target platform.

When the user does not specify these details, use the platform defaults below when a
platform is known.

If the target format is not known and materially affects the result, ask for
clarification rather than guessing.

# Platform Formatting

These are default formatting rules for supported platforms.

## All platforms

- Section order: Breaking Changes, Features, Fixes, then Other Changes.
- Omit any section that has no entries.
- Never output an empty heading, \`None\`, \`N/A\`, or a placeholder section.
- Other Changes contains only entries explicitly preserved through
  \`buildOrdering.keepExcludedTypes\`.
- Other Changes should be omitted when there are no preserved excluded entries.
- Never generate a release-note title or date line.
- The title is prepended separately as:
  \`${RELEASE_NOTES_TITLE_PREFIX}yyyymmdd\`
- The draft body must begin directly with its first section.
- Remove Conventional Commit prefixes from release-note bullets.
- Preserve the actual meaning of the commit or PR when removing the prefix.

## GitHub

Markdown with no character limit.

### Structure

Use these exact section headings:

- \`## 💥 Breaking Changes\`
- \`## ✨ Features\`
- \`## 🐛 Fixes\`
- \`## 🔧 Other Changes\`

### Entries

- One bullet per release entry.
- Start each bullet with a clear imperative verb when appropriate.
- Remove the Conventional Commit prefix.
- Put the source commit ID at the end of the bullet in inline code and parentheses.

Example:

\`- Add JSON export for release notes (\\\`abc1234\\\`)\`

- Emoji are allowed only in section headings.
- Do not add emoji to individual bullets.

## App Store / TestFlight

Plain text with a total limit of
\`${APP_STORE_CHARACTER_LIMIT}\` characters.

### Content

- No Markdown.
- No emoji.
- No \`#\`, \`*\`, or backticks.
- Do not include commit hashes or PR numbers.
- Do not expose internal implementation details such as file, module, branch, or
  internal component names unless the user explicitly asks for technical release
  notes.
- Prefer user-visible outcomes over implementation details.
- Use concise, natural language suitable for end users.
- One short line per change, prefixed with \`- \` or \`• \`.
- An optional one-sentence summary may appear before the list.

When the source does not provide enough context to determine a user-visible outcome,
do not invent one. Stay close to the original meaning.

## Google Play

Plain text with a total limit of
\`${GOOGLE_PLAY_CHARACTER_LIMIT}\` characters.

### Content

- Follow the same plain-text and user-facing principles as App Store / TestFlight.
- Do not include commit hashes or PR numbers.
- Avoid internal implementation details and technical jargon.
- Prioritize the most impactful user-visible changes.
- Use no more than 3–5 lines.
- Brevity takes priority over completeness because additional content may be truncated.

# Ordering and Prioritization

When the target platform requires prioritization:

1. Breaking Changes
2. Features
3. Fixes
4. Other Changes

Within the same category:

- Prefer changes with clearer user impact.
- Prefer more significant changes over minor implementation changes.
- Preserve the original source order when there is no meaningful reason to reorder.

For Google Play, prioritize the most impactful user-visible changes regardless of their
source order.

Do not use prioritization as a reason to invent or exaggerate user impact.

# Character Limits

The final output must never exceed the target character limit.

When content does not fit:

1. Shorten individual entries while preserving their factual meaning.
2. Remove unnecessary wording and repetition.
3. Merge entries only when they describe the same or substantially overlapping change.
4. If the content still does not fit, remove complete entries starting with the lowest
   priority:
   - Other Changes
   - Fixes
   - Features
   - Breaking Changes
5. Never remove or weaken a Breaking Change merely to make the content shorter.
6. Never truncate an entry or sentence mid-way.
7. Verify that the final output is within the character limit before returning it.

# Output Quality

Before returning the release notes, verify that:

- The requested operation was followed.
- The content is faithful to the available source.
- No unsupported facts or user benefits were introduced.
- The required sections and ordering are correct.
- Empty sections are omitted.
- Platform-specific formatting rules are satisfied.
- Character limits are respected.
- No title or date line was added.
- The output contains only the requested release-note content unless the user asks for
  an explanation.
`,
});
