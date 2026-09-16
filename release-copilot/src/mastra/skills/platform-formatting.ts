import { createSkill } from '@mastra/core/skills';
import { RELEASE_NOTES_TITLE_PREFIX } from '../../constants/config/lib-config';

export const platformFormattingSkill = createSkill({
  name: 'platform-formatting',
  description:
    'Use when creating or improving release notes and applying the required format, structure, or length constraints for the destination the user named.',
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
  necessary for the requested format or length constraint.
- Respect the configured \`buildOrdering.keepExcludedTypes\` behavior when deciding
  whether excluded entries should appear under Other Changes.
- Do not create an Other Changes section for entries that were not explicitly kept.

### 3. Create, edit, and optimize

The requested operation determines how you should work:

- **Create:** Build release notes from the provided release information.
- **Edit:** Modify existing release notes according to the user's instructions while
  preserving information the user did not ask to change.
- **Optimize:** Improve clarity, readability, conciseness, ordering, and user impact
  without changing the factual meaning.
- **Reformat:** Adapt existing content to the requested structure or destination
  without unnecessarily rewriting its meaning.

Do not rebuild or rewrite content more extensively than the user's request requires.

### 4. User requirements take precedence

When the user explicitly specifies:

- A structure
- A section order
- A tone
- A length
- A target audience
- A formatting style

follow those requirements unless they conflict with a hard constraint of the
destination.

When the user does not specify these details, derive them from the destination as
described below.

The destination itself is never derived. It is a required input with no fallback —
see the "No destination platform named" rule in the Interaction Loop.

# Deriving the destination format

There is no fixed list of destinations and no built-in formatting table. Once the user
has named a destination, use your own knowledge of how that destination renders and
publishes text to decide the format.

## Settle these before writing

1. **Markup.** Does the destination render full Markdown, a limited Markdown subset,
   plain text only, HTML, or a structured card format?
2. **Headings.** Do heading markers render? When they do not, use the destination's
   idiomatic substitute, such as an emphasized line of its own.
3. **Code.** Do inline code spans and code fences render?
4. **Emoji.** Are emoji supported, and appropriate for that destination's audience?
5. **Lists.** Which list markers render, and which is conventional there?
6. **Length.** Is there a hard character limit, a truncation point, or only a
   practical expectation of brevity?
7. **Audience.** Is the destination read by developers or by end users?
8. **Line breaks.** Does a single newline break the line, or is a blank line required?

## Apply what you settled

- Never emit markup the destination does not render. Markers that show up literally in
  the published message are a formatting failure, not a cosmetic issue.
- A developer-facing destination may keep commit IDs and PR numbers. Put a commit ID at
  the end of its bullet, using inline code only when the destination renders it.
- An end-user-facing destination omits commit IDs, PR numbers, branch names, file
  names, module names, and other internal details, unless the user explicitly asks for
  technical release notes. Describe user-visible outcomes instead.
- Treat a hard character limit as absolute.
- When the destination expects brevity rather than completeness, lead with the most
  impactful user-visible changes.

## When you are unsure about a destination

When you do not reliably know how a destination renders text, do not invent constraints
for it and do not assume it behaves like a destination you do know.

Use the safe subset instead:

- Plain text.
- One short line per change, prefixed with \`- \`.
- No headings, no code markers, no tables.
- Emphasis only when you are confident it renders.

Say briefly which assumption you made so the user can correct it.

Do not ask the user which markup a destination supports — deriving that is your job.
Ask only when the destination itself was never named, or when the user's own formatting
instruction is ambiguous.

## Worked example of the derivation

A destination that renders a limited Markdown subset, has no hard character limit, and
is read by the engineering team.

Settled: emphasis and bullet lists render, heading markers do not, inline code does
not, emoji render, a blank line is required between blocks, audience is technical so
commit IDs stay.

Resulting shape:

\`\`\`
**Features**

- Add JSON export for release notes (abc1234)

**Fixes**

- Correct the release date shown in the preview (e4f5g6h)
\`\`\`

The section labels are emphasized lines rather than headings, and the commit ID is
plain text rather than inline code, because that is what this destination renders.

# Rules for every destination

These hold regardless of the destination and override anything you derive.

- Section order: Breaking Changes, Features, Fixes, then Other Changes.
- Omit any section that has no entries.
- Never output an empty section heading, \`None\`, \`N/A\`, or a placeholder section.
- Other Changes contains only entries explicitly preserved through
  \`buildOrdering.keepExcludedTypes\`, and is omitted when there are none.
- Never generate a release-note title or date line. The title is prepended separately
  as \`${RELEASE_NOTES_TITLE_PREFIX}yyyymmdd\`.
- The draft body must begin directly with its first section.
- Remove Conventional Commit prefixes from release-note bullets, preserving the actual
  meaning of the commit or PR.

# Ordering and Prioritization

Within the section order above, order entries in the same category by:

- Clearer user impact first.
- More significant changes over minor implementation changes.
- Original source order when there is no meaningful reason to reorder.

For a destination that truncates or expects only a few lines, prioritize the most
impactful user-visible changes regardless of source order.

Do not use prioritization as a reason to invent or exaggerate user impact.

# Length

When the destination has a hard limit, the final output must never exceed it.

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
7. Verify the final output is within the limit before returning it.

# Output Quality

Before returning the release notes, verify that:

- The requested operation was followed.
- The content is faithful to the available source.
- No unsupported facts or user benefits were introduced.
- The section order is correct and empty sections are omitted.
- Every markup construct used is one the destination actually renders.
- The level of technical detail matches the destination's audience.
- Any hard length limit is respected.
- No title or date line was added.
- The output contains only the requested release-note content unless the user asks for
  an explanation.
`,
});
