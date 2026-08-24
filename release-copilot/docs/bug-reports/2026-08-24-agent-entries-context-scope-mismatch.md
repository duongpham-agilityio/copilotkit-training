---
date: 2026-08-24
branch: fix/agent-entries-context-scope
commit:
files: [src/hooks/use-commit-entries.tsx]
severity: medium
---

# Copilot misreports commit/entry counts due to a mislabeled live context field

## Summary

Asking the copilot how many entries/commits exist (or are eligible/selected) could
return an undercounted number, even though the underlying Zustand store
(`useCommitEntriesView`) always held the correct data. The live context pushed to the
model carried only the checked subset of entries, but was keyed with the same name
(`entries`) used everywhere else in the app/instructions to mean the full classified
list.

## Root Cause

`src/hooks/use-commit-entries.tsx:93-103` (pre-fix):

```ts
useAgentContext({
  description: joinLines(
    'The entries currently checked in the commit list panel — live state the',
    'user can change between turns, not a snapshot of what they pasted.',
    ...
  ),
  value: { entries: view.selectedEntries },
});
```

The key `entries` here holds `view.selectedEntries` — the checked subset — but the
same word `entries` is used, with the opposite meaning (the *full* classified list),
in two other places the model also reads:

- `src/types/release-entry.ts:79`, `EntryListToolSchema.entries` — "The full list of
  entries classified from the git log or PR text", the schema for the
  `showEntryList` tool call the model itself makes.
- `src/mastra/instructions/commit-classification.ts` and
  `src/mastra/instructions/app-usage-faq.ts` — both use "entries"/"entry" to mean
  every classified item shown in the commit list, regardless of checkbox state.

So the same field name meant two different scopes depending on which source the
model happened to consult, with nothing to disambiguate them.

## Explanation

1. On classification, `useFrontendTool` registers the full list via `showEntryList`
   (`src/hooks/use-commit-entries.tsx:54-91`), and `entries-slice.ts:39`
   (`setEntries`) defaults `selectedIds` to every entry's id — so at that moment
   `selectedEntries.length === entries.length` and the bug is invisible.
2. `useAgentContext` is a declarative push refreshed on **every** agent run
   (confirmed from the CopilotKit SDK's own bundled skill,
   `node_modules/@copilotkit/react-core/skills/react-core/references/agent-access.md`:
   "declarative push of app state to every agent run... global... every agent run
   sees every registered entry") — it is not subject to Mastra's
   `Memory({ lastMessages: 6 })` trimming (`src/mastra/agents/release-copilot-agent.ts:30`).
   So the *selected* count is always fresh and correct for what it represents.
3. Once the user unchecks any entry (`toggleEntrySelection`,
   `src/store/entries-slice.ts:52-63`), `selectedEntries.length` drops below the true
   total. The only place the true total ever existed in the model's context was the
   original `showEntryList` tool-call arguments, which — unlike `useAgentContext` —
   *is* part of the trimmed message history and can age out of the 6-message window
   after a few turns.
4. Any question about "how many entries" is answered from `context.entries`, which
   after step 3 is the shrunk, selection-filtered subset, mislabeled with the same
   name used everywhere else for the full set — producing an undercount that
   reproduces reliably once anything has been unchecked.

## Solution

Stop conflating the two scopes under one name: expose both the full list and the
selected subset as separate, correctly named fields in the same `useAgentContext`
call, each with a short factual description of what it represents. This keeps the
fix entirely in the context-injection layer (already confirmed to be pushed fresh on
every run) rather than adding new routing instructions elsewhere.

## Solution Details

`src/hooks/use-commit-entries.tsx:93-100` (final state):

```ts
useAgentContext({
  description: joinLines(
    'Current state of the parsed commits/PRs.',
    '`entries`: all entries classified so far.',
    '`selectedEntries`: the checked subset, used to build the release-notes',
    'draft.',
  ),
  value: { entries: view.entries, selectedEntries: view.selectedEntries },
});
```

This went through three iterations during manual chat testing with the user:

1. First pass added `entries: view.entries` alongside `selectedEntries`, with a long,
   imperative description ("use ONLY for...", "you MUST compute..."). This fixed the
   originally reported symptom (asking for the total count) but a follow-up manual
   test surfaced a second-order regression: with two similarly named fields now
   present, the model sometimes computed "how many are ready to build release notes"
   from the full `entries` list instead of `selectedEntries`, ignoring a manual
   uncheck the user had just made.
2. Second pass shortened the description, still keeping some prescriptive language.
3. Final pass (above), at the user's direction, reduced the description to a plain
   statement of what the context is and what each field is — no imperative rules.

This is a real fix for the originally reported bug (verified below), not a
workaround: the store already computed the correct full/selected split
(`useCommitEntriesView`, unchanged); the only change is which fields of that
already-correct data get exposed to the model, and under what names.

## Verification

- `NODE_OPTIONS="--max-old-space-size=4096" pnpm lint` — passes with the same single
  pre-existing, unrelated finding as before this change
  (`src/services/publish-to-slack.ts:44`, empty catch block; confirmed pre-existing
  via `git stash` + re-run). No new findings introduced by this change.
- `NODE_OPTIONS="--max-old-space-size=4096" pnpm build` — `tsc -b && vite build`
  succeeds.
- Manual chat testing (no browser-automation tool available in this environment; the
  user tested directly in the running app):
  - **Fixed and confirmed**: asking for the total number of parsed commits/entries
    now returns the correct total (previously undercounted once any entry had been
    unchecked).
  - **Not fully resolved**: asking "how many are ready to build release notes"
    immediately after manually unchecking specific entries still intermittently
    returned an incorrect count in the user's testing, even after the wording
    iterations above. The user chose to accept this as a known limitation for now
    rather than continue iterating on `useAgentContext` description wording.

## Prevention

- General lesson for this codebase: when exposing app state to the model via
  `useAgentContext`, never reuse a field name that already carries a different scope
  elsewhere in the same prompt surface (a tool schema, another instruction file). The
  collision is invisible to `tsc`/`eslint` and silently degrades answer quality.
- `useAgentContext` payloads are consumed by the model probabilistically — a wording
  change cannot be treated as verified by lint/build alone; it requires re-running
  the exact chat scenario that originally failed.
- Follow-up, not done here (user chose to bypass rather than continue chasing this
  specific edge case): if the "ready/eligible after an uncheck" miscount recurs, the
  next step is an explicit routing condition in `src/mastra/instructions/intro.ts`
  for count/eligibility questions, rather than further tuning of the
  `useAgentContext` description text.
- No automated test covers model answer correctness on live chat — this class of bug
  is inherently only caught by manual conversational testing, not `pnpm lint`/`pnpm
  build`.
