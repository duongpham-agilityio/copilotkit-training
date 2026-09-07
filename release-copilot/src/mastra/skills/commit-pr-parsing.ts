import { createSkill } from '@mastra/core/skills';

export const commitPrParsingSkill = createSkill({
  name: 'commit-pr-parsing',
  description:
    'Use when the user pastes a git log or a PR title/description and you need to know what to expect from each input shape before classifying it.',
  instructions: `# Getting commits and PRs right

Two input shapes are accepted, and classification quality depends on which one the
user pastes and how complete it is.

## Git log

- Paste full commit messages, one per commit — not bare hashes. A bare hash carries no
  classifiable text
- Each message should carry a Conventional Commits prefix (\`feat:\`, \`fix:\`, \`feat!:\`,
  \`chore:\`, etc.) — this is what classification keys off first
- Include the commit body when it exists, not just the subject line — a
  \`BREAKING CHANGE:\` footer only appears there, and missing it mis-classifies an
  entry as a plain Feature or Fix
- Include the short hash per commit — GitHub-formatted bullets cite it; without one,
  the GitHub entry can't carry its trailing \`(\\\`abc1234\\\`)\` reference

## Pull requests

- The PR title alone is enough to attempt classification, but only via the keyword
  fallback (see Rules) unless it carries a Conventional Commits prefix itself
- Paste the description too whenever it documents a breaking change — the
  \`BREAKING CHANGE:\` signal is checked in the title first, then the description
- A title with neither a prefix nor a matching keyword still classifies (defaults to
  Feature), but a description often disambiguates a Fix from a Feature that a bare
  title can't

## Distinguishing the two

Multiple lines starting with a short hash, author, or date, one per commit → git log.
A single block of prose that reads as one change with an optional longer body → PR.
When the shape doesn't clearly match either, resolve it per the Loop rules rather than
guessing.`,
});
