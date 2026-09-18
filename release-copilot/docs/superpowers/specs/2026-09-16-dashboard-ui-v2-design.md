# Dashboard UI v2 — Design

**Date:** 2026-09-16
**Status:** Approved, pending implementation

## Problem

The Dashboard is a two-pane `SplitPane` (65% / 35%): the left column stacks a "Parsed
Commits" list on top of a Live Preview card, the right column holds the chat. Three
things are wrong with it for the direction this app is going:

1. **The entry list is dead weight.** `CommitListPanel` renders every classified
   commit/PR with a checkbox, but selection now drives almost nothing — the draft is
   built by the agent from the conversation, not from the checked subset. It costs an
   entire frontend tool (`showEntryList`), a store slice, two hooks, an `useAgentContext`
   payload on every request, and permanent screen real estate, in exchange for a
   read-only restatement of text the user just pasted.
2. **Live Preview is always mounted, usually empty.** It occupies half the left column
   from the first render, showing an empty-state card until a draft exists. The panel is
   only meaningful after the agent calls `renderReleaseNotesPreview`.
3. **Threads are hidden behind a dropdown.** `ThreadListDropdown` hangs off a "List
   chats" button inside the chat panel header, alongside a "New Chat" button — thread
   navigation is a first-class action buried in a transient popover, and it squeezes the
   chat header.

The result: chat — the actual product surface — gets 35% of the window while two
secondary surfaces get 65%.

## Solution

A three-region Dashboard where chat is the primary surface and everything else is
either persistent-but-narrow (threads) or conditional (preview):

```text
AppShell
├─ AppHeader        logo | Dashboard/History tabs | Settings, Help, Avatar
└─ DashboardPage → DashboardLayout
   ├─ ThreadSidebar        260px, collapsible, hidden < sm
   ├─ CopilotAssistantPanel  flex-1
   └─ LivePreviewPanel     ~38%, rendered ONLY while the preview is open
```

Three independent changes fall out of this:

**The entry-list chain is deleted, not hidden.** `showEntryList` is a frontend-only tool
(registered via `useFrontendTool` in `use-commit-entries.tsx`, never in
`src/mastra/index.ts`), so removing the client registration removes it from the agent's
tool set with no server change. The agent still parses and classifies — that work feeds
`renderReleaseNotesPreview` — it just stops emitting a structured entry list to the UI.

**Live Preview becomes conditional and closable.** It mounts when a draft arrives and
unmounts when the user closes it; the next draft re-opens it.

**Threads move to a persistent left sidebar** with the "New thread" action beside them,
and the chat panel header loses both thread buttons.

## Rejected alternatives

| Rejected | Reason |
| --- | --- |
| Keep `showEntryList` registered but drop the panel from the layout | Leaves a tool the agent still pays tokens to call and whose output nobody sees, plus a dead store slice and two dead hooks. Explicitly rejected — remove the whole chain. |
| Live Preview always visible once a draft exists (no close button) | Simplest state model, but the user cannot reclaim the width for a long chat exchange. Rejected in favor of auto-open + closable. |
| Manual "Preview" toggle in the header, never auto-opens | Makes the most common case (agent just built notes, user wants to read them) a two-step action. Rejected. |
| Move Dashboard/History nav into the sidebar too | Wider blast radius (`AppHeader`, `HistoryPage` layout) for no gain in this pass — History has no threads, so the sidebar would render empty there. Header keeps the nav. |
| Keep Export, drop only the entries attachment from the file | The user chose to remove Export entirely; `buildExportFile`'s JSON format exists mainly to serialize the grouped entries, so without entries the remaining Markdown/plain-text export is just the Copy button with a download step. |
| Put the classified entries in working memory so they survive the message window | ~600 tokens (30 commits) injected into **every** request in the thread, forever, plus a full-array re-emit on each working-memory update — the binding constraint here is Groq TPM. Working memory holds durable preferences (`platform`, `language`, `buildOrdering`, `currentRelease`); entries are one-shot source data. Rejected in favor of raising `lastMessages`. |
| Add a small `pendingSource: { entryCount, byType }` working-memory field | ~20 tokens/turn, lets the agent say "you pasted 12 commits, none built yet" after the paste scrolls out — but it cannot build notes from it, so it only prevents a confabulation that raising `lastMessages` already prevents. Deferred; revisit if drift shows up in practice. |

## Layout

New `src/layouts/DashboardLayout.tsx` replaces `SplitPane.tsx` (whose only non-story
caller is `DashboardPage`):

```tsx
interface DashboardLayoutProps {
  sidebar: ReactNode;
  chat: ReactNode;
  preview?: ReactNode;   // omitted → two regions, chat takes the remaining width
}
```

- Sidebar: fixed `w-[260px]`, `shrink-0`; collapsed → not rendered (not `w-0`), so the
  chat reflows to full width.
- Chat: `flex-1 min-w-0`.
- Preview: `w-[38%] shrink-0` when present, its own `overflow-y-auto`.
- Below `sm`: sidebar is not in flow; its toggle opens it as an overlay above the chat.
  Preview, when open, stacks below the chat instead of beside it.

`SplitPane.tsx` and `src/layouts/stories/SplitPane.stories.tsx` are deleted.

## Thread sidebar

New `src/components/chat/ThreadSidebar.tsx` (default-export component, PascalCase per
`.agents/rules/conventions.md`):

- Header row: "Chats" + a collapse `IconButton`.
- A "New thread" button calling `startNewChat` from `useThreadSession()`.
- The list: existing `ThreadListItem.tsx`, unchanged, plus the loading / error / empty
  branches lifted verbatim out of `ThreadListDropdown`.

`useThreadSession()` registers no CopilotKit primitive (see its own header comment), so
calling it from both `ThreadSidebar` and `CopilotAssistantPanel` is safe — no shared
props, no lifted state.

Deleted: `src/components/chat/ThreadListDropdown.tsx`, and `src/hooks/use-click-outside.ts`
(its only consumer was the dropdown).

`CopilotAssistantPanel.tsx` loses the `isThreadListOpen` state, the `threadListRef`, the
"New Chat" and "List chats" buttons, and the `useFlowSuggestions()` call. Its header
keeps the status dot + "Copilot Assistant" title. The already-commented-out "Clear"
button block is removed while the file is open rather than left as a second dead branch.

Sidebar collapse state is `useState` in `DashboardPage` — not persisted, not in the
store.

## Preview panel visibility

New `src/hooks/use-preview-panel.ts`:

```ts
interface UsePreviewPanelResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}
```

Reads `{ draft }` from `useReleaseDraftView()` (the read-only projection — it must not
call `useReleaseDraft()`, which registers the render tool) and `threadId` from
`useThreadSession()`. Opens on every *new* draft: an effect keyed on the draft identity
sets `isOpen` to `true`. Draft identity is the store object's reference — `draft-slice.ts`
already no-ops a `setDraft` whose serialized value is unchanged, so a re-render of the
same tool call does not produce a new reference and does not re-open a panel the user
closed. Switching threads re-evaluates against that thread's own draft: a thread with no
draft opens nothing; a thread with a draft opens the panel.

`close()` sets `isOpen` to `false` until the next draft reference arrives, and `open()`
sets it back to `true`. Without `open()` a closed panel would be unreachable until the
agent produced a *new* draft — there would be no way back to the draft the user is still
working on. The reopen control is an `IconButton` (`PanelRightOpen`) at the right edge of
the chat panel header, passed in as `CopilotAssistantPanel`'s `trailing` prop and
rendered only while a draft exists and the panel is closed, so it never offers to open an
empty panel. It mirrors the sidebar's expand button on the opposite edge of the same
header.

`LivePreviewPanel.tsx` gains an `onClose: () => void` prop and a close `IconButton` in
its header next to Copy/Archive. `CopilotAssistantPanel` takes two optional
`ReactNode` slots for the header — `leading` (sidebar expand) and `trailing` (preview
reopen) — so `DashboardPage` owns both pieces of visibility state and the chat panel
stays unaware of either. Its `markdown: string | null` prop stays typed as-is
(the component is also used by stories), but on the Dashboard it is only rendered when
a draft exists. Archive keeps its current behavior — `saveReleaseToHistory()` still
returns the "temporarily unavailable" failure; redesigning History is out of scope.

## Entry-list removal

**Deleted:**

- `src/components/commit-list/` — `CommitListPanel.tsx`, `CommitListItem.tsx`, and
  `stories/`.
- `src/hooks/use-commit-entries.tsx` (the `showEntryList` registration, `EntryListSync`,
  and the entries `useAgentContext`).
- `src/hooks/use-commit-entries-view.ts`.
- `src/store/entries-slice.ts` — `release-workspace-store.ts` becomes
  `create<DraftSlice>()(...createDraftSlice(...args))`. The slice pattern is kept for the
  one remaining slice; `draft-slice.ts`'s `StateCreator<EntriesSlice & DraftSlice, ...>`
  generic narrows to `StateCreator<DraftSlice, [], [], DraftSlice>` and its type-only
  import of `EntriesSlice` goes away.
- `SHOW_ENTRY_LIST_TOOL_NAME` in `src/constants/agent-tools/tools-name.ts`.
- `EntryListToolSchema` in `src/types/release-entry.ts` (the file itself stays — see
  below).
- `src/hooks/use-flow-suggestions.ts` — the suggestion stages were gated on
  `entries.length`, and the user chose to drop suggestions rather than re-gate them.
- `src/hooks/use-release-export.ts`, `src/lib/export/` (`build-export-file.ts`,
  `strip-markdown.ts`), `src/types/export-format.ts`, and the `HeaderActions` Export
  button in `src/App.tsx` (Settings / Help / Avatar stay).

**Kept, despite looking orphaned:**

- `src/types/release-entry.ts` — `ReleaseEntrySchema` is still imported by
  `release-history-record.ts`, `save-release-history-request.ts`, and
  `mastra/storage/releases-repository.ts`.
- `src/types/commit.ts` — `CommitType` is still used by `releases-repository.ts` for its
  `feat_count` / `fix_count` columns. The `Commit` interface itself becomes unused once
  `use-commit-entries-view.ts` and the commit-list components are gone; it stays in the
  file alongside `CommitType` rather than being split out.
- `src/hooks/use-is-latest-tool-call.ts` — still used by `use-release-draft.tsx`.

## Agent-side changes

`showEntryList` was never registered in `src/mastra/index.ts` or on the agent's `tools`
map, so no server-side registration is removed. What does change:

- **A new `release-reporting` skill** (`src/mastra/skills/release-reporting.ts`,
  registered in `skills/index.ts` and in the agent's `skills` array). The old rule — "the
  only way the classified entry list reaches the UI is the tool; never describe entries
  as chat text, a table, or a list" — lived in the `showEntryList` tool description and
  dies with it. Its replacement: parse and classify internally, then report a **short**
  chat summary (how many entries, their distribution by classification, what is needed
  next), never an enumeration and never an echo of the pasted input. The one exception is
  an entry that cannot be classified, which may be named so the user can resolve it.

  It is a skill rather than an always-on instruction section because it only applies
  while handling pasted release input — roughly one turn in a conversation — and an
  always-on section pays ~250 tokens on every request for it. The trade-off is real and
  accepted: this rule suppresses a *default* model behavior (enumerating a list it was
  just shown), so on any turn the skill is not loaded, nothing enforces it. If that
  shows up in practice, the cheap fix is one sentence in the always-on instructions with
  the detail left in the skill.
- **`src/mastra/skills/commit-pr-parsing.ts` and `classification-rules.ts` are
  unchanged** — neither ever referenced the entry-list tool.
- **`src/hooks/use-commit-entries.tsx`'s `useAgentContext`** (entries + selectedEntries)
  is removed with the file. The draft `useAgentContext` in `use-release-draft.tsx` stays
  — it is what makes "make it shorter" work without the draft being in the message
  window.
- **`lastMessages: 6 → 10`** in `src/mastra/agents/release-copilot-agent.ts`. With
  entries no longer pinned into every request via agent context, a pasted git log only
  survives in the message window; 10 covers paste → summary → platform question →
  answer → build plus a couple of detour turns. Working memory is deliberately left
  unchanged (see Rejected alternatives).

Once a draft exists, entries stop mattering: edits apply to the draft, which reaches the
agent through its own `useAgentContext` regardless of the message window.

## Data flow

```text
User pastes a git log
        │
        ▼
release-copilot-agent — parses + classifies internally (skills unchanged)
        │  replies in chat: "Read 12 entries — 5 feat, 4 fix, 1 breaking.
        │  Which platform should I build for?"          ← no tool call
        ▼
User names a platform
        │
        ▼
agent calls renderReleaseNotesPreview { platform, label, content, ... }
        │
        ▼
useReleaseDraft — safeParse → setDraft(threadId, draft)   (unchanged)
        │
        ▼
usePreviewPanel sees a new draft reference → isOpen = true
        │
        ▼
DashboardLayout renders the preview region; user reads it, optionally closes it
```

## Files touched

| File | Change |
| --- | --- |
| `src/layouts/DashboardLayout.tsx` | New — three-region layout. |
| `src/layouts/SplitPane.tsx` + its story | Deleted. |
| `src/components/chat/ThreadSidebar.tsx` | New — threads + New thread + collapse. |
| `src/components/chat/ThreadListDropdown.tsx` | Deleted. |
| `src/components/chat/CopilotAssistantPanel.tsx` | Drops thread buttons/dropdown state, `useClickOutside`, `useFlowSuggestions`, commented-out Clear block. Gains `leading` / `trailing` header slots. |
| `src/components/release-notes/LivePreviewPanel.tsx` | Adds `onClose` + close button. |
| `src/hooks/use-preview-panel.ts` | New. |
| `src/hooks/use-click-outside.ts` | Deleted. |
| `src/hooks/use-flow-suggestions.ts` | Deleted. |
| `src/hooks/use-commit-entries.tsx`, `use-commit-entries-view.ts` | Deleted. |
| `src/hooks/use-release-export.ts`, `src/lib/export/*`, `src/types/export-format.ts` | Deleted. |
| `src/components/commit-list/**` | Deleted. |
| `src/store/entries-slice.ts` | Deleted. |
| `src/store/draft-slice.ts` | `StateCreator` generic narrows to `DraftSlice` only. |
| `src/store/release-workspace-store.ts` | Draft slice only. |
| `src/constants/agent-tools/tools-name.ts` | Drops `SHOW_ENTRY_LIST_TOOL_NAME`. |
| `src/types/release-entry.ts` | Drops `EntryListToolSchema`; `ReleaseEntrySchema` stays. |
| `src/routes/DashboardPage.tsx` | Rewritten against `DashboardLayout` + `usePreviewPanel`; keeps `useReleaseDraft()` and `useSlackPublish()` as the single call sites for their tools. |
| `src/App.tsx` | Drops the Export button and its `ErrorBoundary` wrapper. |
| `src/mastra/agents/release-copilot-agent.ts` | `lastMessages: 10`. |
| `src/mastra/skills/release-reporting.ts` | New — the short-summary-not-enumeration rule, as a skill. |
| `src/mastra/skills/index.ts` | Exports `releaseReportingSkill`. |

## Out of scope

- History (`HistoryPage`, `release-history-*`, `releases-repository`) — untouched; it
  keeps consuming `ReleaseEntrySchema` for stored records.
- `saveReleaseToHistory()` staying disabled, and the Archive button that calls it.
- Re-adding suggestions in any form.
- Persisting sidebar collapse or preview visibility across reloads.
- Any working-memory schema change.

## Testing

Per `.agents/rules/code-style.md` and this project's standing "no Storybook, no unit
tests" decision: verification is `pnpm lint` + `pnpm build` (`tsc -b`) clean, plus manual
checks.

- `pnpm lint` and `pnpm build` clean — `tsc -b` with `noUnusedLocals` is the real check
  that the deletion list above is complete and left no dangling import.
- Manual: fresh thread shows sidebar + chat only, no preview region, no commit list.
- Manual: paste a git log → agent replies with a short summary and asks for a platform;
  no entry-by-entry list, no entry-list tool render in the transcript.
- Manual: name a platform → preview opens automatically beside the chat; close it → chat
  takes the full width; ask for an edit → the new draft re-opens it.
- Manual: create a second thread from the sidebar, switch back and forth — each thread
  shows its own draft (or none), and the preview follows.
- Manual: collapse the sidebar, and check the layout at ~400px width (sidebar overlays,
  preview stacks).
- Manual: Slack publish still works from a draft (`confirmSlackPublish` untouched).
