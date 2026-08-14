# Entry Selection Agent Context Design

Date: 2026-08-14
Status: Draft

## Purpose

`showEntryList` (implemented per `2026-08-12-release-notes-external-render-design.md`)
gets the agent's classified entries into `DashboardPage`, where the user can uncheck
entries in `CommitListPanel` (`handleToggle` in `DashboardPage.tsx`). That toggle only
updates local React state (`selectedHashes`) — it never reaches the agent. So when the
user later asks for a draft, the agent has no way to know which entries are currently
checked and may include ones the user deselected.

This fulfills the follow-up the prior spec already named but didn't implement: "current
selection fed back to the agent via `useAgentContext`" (2026-08-12 spec, Scope section).

This spec covers only:

1. A hook that pushes the current entry list + selection state into the agent's context
   live, via CopilotKit's `useAgentContext`.
2. The `instructions.ts` changes needed for the agent to actually act on that context
   when rendering, and the empty-selection edge case.

Out of scope: `showReleaseNotes` itself (still spec-only, per the prior design), any
component/layout change, and export/platform-selector work.

## Mechanism

`useAgentContext({ description, value })` (`@copilotkit/react-core/v2`) registers a
live entry in the CopilotKit core client (`copilotkit.addContext`/`removeContext`),
re-registered via `useLayoutEffect` whenever `value` changes — confirmed by reading the
hook's implementation directly in the installed package
(`node_modules/@copilotkit/react-core/dist/copilotkit-nRjRp2_5.mjs`). This means the
registered context always reflects the latest render's value by the time the *next*
user message is sent — no manual sync needed, and no extra tool call (so it doesn't
touch the Groq tool-calling failure mode the prior spec worked around).

What this mechanism does **not** do: make the model interpret or act on the data
correctly just because it's present. `addContext` only guarantees the JSON blob is
part of the request; it doesn't tell the model what the blob means or what to do with
it. That's why the `instructions.ts` change below is still required — for meaning and
behavior, not for data freshness.

`AgentContextInput` has no `agentId` field (confirmed in the package's `.d.mts`) — it's
global to the CopilotKit client, not scoped per agent. Fine here: this app talks to
exactly one agent (`RELEASE_COPILOT_AGENT_ID`).

## Data shape

`DashboardPage` currently discards the raw `ReleaseEntry[]` after mapping to
`Commit[]` in `toCommit` — it only keeps the converted shape. The context payload needs
the original entry data (`type`, `breaking`, `description`), which `Commit` doesn't
carry, so `DashboardPage` gains one more piece of state:

```ts
const [entries, setEntries] = useState<ReleaseEntry[]>([]);
```

set alongside `commits`/`selectedHashes` inside `onEntryListShown` (all three derive
from the same `entries` array the tool handed back).

**Revised (2026-08-14, review feedback):** no per-entry `selected` flag at all. The
context payload only ever contains the entries currently checked — `handleToggle`
already maintains `selectedHashes` as the source of truth for what's active, so
`DashboardPage` filters down to that subset and hands the hook the finished list. The
hook stays a thin wrapper around `useAgentContext` with no derivation logic of its own,
matching `useShowEntryListTool`'s pattern of the caller owning state and the hook just
wiring a CopilotKit primitive to it. This also means the agent no longer needs a
per-entry filtering rule — see Instructions changes below.

`src/hooks/use-entry-selection-context.ts`:

```ts
interface UseEntrySelectionContextOptions {
  entries: ReleaseEntry[];
}

export const useEntrySelectionContext = ({
  entries,
}: UseEntrySelectionContextOptions): void => {
  useAgentContext({
    description: 'The entries currently checked in the commit list panel.',
    value: { entries },
  });
};
```

`DashboardPage` filters its existing state, no new derived shape:

```ts
const activeEntries = entries.filter((entry) => selectedHashes.has(entry.id));

useEntrySelectionContext({ entries: activeEntries });
```

`entry.id` is reused as the selection key — `Commit.hash` is already `entry.id` (see
`toCommit`), so `selectedHashes` doubles as the active-id set with no new id scheme, and
no new type is introduced (`ReleaseEntry` is sent as-is).

## Instructions changes

Per the principle already established in the 2026-08-12 spec ("tool-calling mechanics
belong on the tool, not in `instructions`") extended to context: the context's own
`description` above carries what the data *is*. `instructions.ts` needs to carry the
cross-cutting behavior rule for what to *do* with it — this is a rendering-condition
rule (condition 2 in `intro.ts`), not something the context's own description can
express since it doesn't know about rendering at all.

**`src/mastra/instructions/intro.ts`, condition 2** — add:

> Before rendering, use the entries in the current entry-selection context — not the
> full list from condition 1 — since it reflects exactly what the user has checked
> right now. If that context is empty, don't render — tell the user to select at least
> one entry first.

**`src/mastra/instructions/app-usage-faq.ts`, "Commit selection" section** — the
existing line "Only checked entries are used for drafting" currently describes intended
behavior with no mechanism behind it (the gap this spec closes). Add one clause so the
FAQ also covers the new edge case the user will actually hit:

> Asking to draft with nothing selected: the agent will ask you to pick at least one
> entry first rather than generating an empty draft.

No change needed to `commit-classification.ts` or `release-note-formatting.ts` — both
are already channel-agnostic domain rules unrelated to selection.

## Edge cases

| Case | Handling |
| --- | --- |
| Draft requested with zero entries selected | Per instructions change above: agent asks the user to select at least one, does not render |
| Selection changes after a draft already exists | Unchanged from 2026-08-12 spec: draft marked stale, no auto-redraft — the context updates live, but nothing about *this* spec triggers a re-render on its own |
| `entries` empty (nothing classified yet) | Context value is `{ entries: [] }`; no behavior change needed beyond the existing "ask user to paste something" flow, since condition 1 hasn't fired yet |
| Context payload grows large (big git log pasted) | Same token-budget concern already flagged in the 2026-08-12 spec's residual risks — not solved here; full entry data is sent every turn once registered, not just on classification |

## Verification

No test runner configured in this repo. Bar for this pass:

- `pnpm lint` and `pnpm build` (`tsc -b`) clean
- Manual verification on the dev server: paste a git log, uncheck one or more entries
  in the commit list, ask the agent to draft, confirm the rendered output excludes the
  unchecked entries; uncheck everything and ask to draft, confirm the agent asks to
  select something instead of rendering

## Residual risk (accepted, not solved by this design)

- Sending the active entry list as live context on every turn adds to the same tight
  Groq TPM budget (8–12K/model) already flagged in the 2026-08-12 spec — smaller than
  sending the full list (only checked entries), but still sent every turn once
  registered, not just once at classification time, unlike sending everything.
- The empty-selection refusal and "use this context instead of the condition-1 list"
  rule are still prose the model must follow correctly every time — not mechanically
  enforced the way schema shape is for tool calls.
