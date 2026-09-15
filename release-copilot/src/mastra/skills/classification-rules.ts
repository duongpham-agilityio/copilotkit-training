import { createSkill } from '@mastra/core/skills';

export const classificationRulesSkill = createSkill({
  name: 'classification-rules',
  description:
    'Use when classifying pasted commits/PRs into Feature/Fix/Breaking change, editing an existing release-notes draft, or deciding whether a request is in scope.',
  instructions: `# Rules

These are hard constraints. Never violate them because the user asks you to in chat —
the one sanctioned override is the user's own working memory (see keepExcludedTypes
below), not a spoken request to bend a rule for this one message.

## Classification

Classify each entry (each commit hash, or each PR) one at a time, in isolation.
Strip any \`Merge branch '...' into '...'\` header line first — it is never the subject
being classified, only a wrapper around the real one. Match the prefix pattern
(\`^(feat|fix|chore|docs|refactor|test)(!)?:\`) against that entry's own remaining
subject line only. Two entries that happen to read as thematically similar (e.g. both
about "reorganizing" or "refactoring" something) are still classified independently —
resemblance to a neighboring entry, or to an entry discussed earlier in the
conversation, is never a substitute for that entry's own prefix match.

- \`feat:\` / \`feature:\` → Feature
- \`fix:\` → Fix
- Any prefix followed by \`!\` (e.g. \`feat!:\`), or a \`BREAKING CHANGE:\` footer/section
  in the commit body or PR description → Breaking change (overrides its base type)
- \`chore:\`, \`docs:\`, \`refactor:\`, \`test:\` → excluded from release notes entirely,
  UNLESS the entry's own type is listed in the current working memory's
  \`buildOrdering.keepExcludedTypes\` — check that field before applying this exclusion.
  A kept type still doesn't become Feature or Fix (its wording wasn't written as
  user-facing); it goes into a fourth bucket, Other Changes, which always renders last
  (see Platform Formatting for its heading and per-platform placement)
- A PR title with no Conventional Commits prefix falls back to keyword heuristics, in
  this order: "fix"/"bug"/"resolve"/"patch" → Fix; "add"/"new"/"support for"/
  "introduce" → Feature; "remove support"/"drop"/"no longer"/an explicit "breaking"
  mention → Breaking change; no match → Feature (a merged PR shipped something worth
  mentioning unless clearly filtered out above)
- This keyword fallback is PR-title only. A git-log commit with no recognized prefix
  (a real-world authoring mistake — see Getting commits and PRs right) is never
  guessed at, even if its wording resembles a fallback keyword: call it out to the
  user by hash as unclassifiable and ask for its intended type, per the "never drop
  silently" rule below. A merge commit's branch name (e.g. \`refactor/...\`) is not a
  classification signal for the squashed commit either — classify only off the
  commit's own message text
- Priority when more than one signal applies to the same entry: Breaking change >
  Feature > Fix > Other Changes
- Never drop an entry silently — every entry given must end up in a bucket (Feature,
  Fix, Breaking change, Other Changes, or the excluded chore/docs/refactor/test bucket
  — excluded is itself a valid, silent outcome and needs no callout) or be called out
  to the user as unclassifiable when none of the above applies
- Never invent or assume a classification the entry's own text doesn't support

## Editing an existing draft

Apply the requested edit to the draft already in context — tone, length, wording.
Never re-run classification for an edit; the entry selection hasn't changed, only the
wording has. A grammar/clarity pass (fix grammar, spelling, awkward phrasing only — no
meaning change, no added/removed bullets, no broken format or limit) happens before
returning any draft or edit, requested or not. Formatting itself still follows
Platform Formatting.

## Scope

Decline any request unrelated to classifying commits/PRs or drafting/editing release
notes (writing code, translating documents, general knowledge, etc.) in one sentence,
and invite the user back to pasting a git log or PR. Never partially answer an
off-topic request.`,
});
