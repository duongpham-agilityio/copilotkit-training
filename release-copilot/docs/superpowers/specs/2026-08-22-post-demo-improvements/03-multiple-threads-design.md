# 03 — Multiple threads

Date: 2026-08-22 · Reconciled: 2026-08-22
Estimate: 2.5h (0.7h remaining) · Branch: `feat/multiple-threads` (thread list already
merged as `feat/thread-list`; remaining work continues from `practice-one`) ·
Depends on: 01
Part of: [Overview](./00-overview-design.md) · Source: §4 Item 5 of the source design

## Reconciliation note

This task was implemented ahead of this plan's schedule, with a **different design**
than originally specified below. Rather than pretend the original design is still
current, this file is updated to match what actually shipped
(commit `3ba0a72`, merged `dc8b980`) and to define the remaining gap.

**What changed from the original design:**
- **Thread list is server-fetched, not client-side.** The original design had the
  thread list live entirely in a migrated zustand store (`ThreadSummary[]`, title =
  truncated first message). The actual implementation fetches threads from Mastra's
  `/api/memory/threads` REST API via TanStack Query
  (`src/services/list-threads.ts`, `src/hooks/use-threads.ts`) and seeds an optimistic
  placeholder for a thread not yet visible server-side
  (`src/components/chat/CopilotAssistantPanel.tsx`). No client-side migration is
  needed as a result — there is no legacy shape to convert, because the thread list
  was never client-authoritative in the first place.
- **Titles are LLM-generated, not truncated-first-message.** Mastra's `Memory`
  `generateTitle` option is enabled on the release-copilot agent
  (`src/mastra/agents/release-copilot-agent.ts`), so the "LLM-generated titles" line
  in the original Out of Scope section below no longer applies — this is intentionally
  in scope now.
- **No rename/delete UI yet.** `ThreadListDropdown.tsx` / `ThreadListItem.tsx` support
  switching and highlighting the active thread only.

**What is unchanged from the original design and now done:** the per-thread
left-panel restore — the reason this task was estimated at 2.5h rather than 1h, and
the part the original design called "actively harmful" to skip — is implemented as
originally designed, described below.

## Goal

Create a new conversation and switch between threads. On switch, **the left panel
restores per thread** — not just chat history.

## Files

**Already shipped** (`feat/thread-list`, commit `3ba0a72`)
- `src/services/list-threads.ts`, `src/hooks/use-threads.ts` — server-fetched thread
  list
- `src/components/chat/ThreadListDropdown.tsx`, `ThreadListItem.tsx` — thread list UI,
  active-thread highlight
- `src/hooks/use-click-outside.ts` — dropdown dismissal
- `src/components/chat/CopilotAssistantPanel.tsx` — "New Chat" / "List chats" header
  buttons, optimistic placeholder seeding
- `src/mastra/agents/release-copilot-agent.ts` — `generateTitle` enabled

**Shipped in the spike wrap-up** (this pass, alongside task 01's §11 write-up)
- `src/hooks/use-dashboard-store.ts` (new) — per-thread left-panel state
- `src/routes/DashboardPage.tsx` — four `useState` (three of them) → the store;
  `platform` stays local `useState`, per the note below
- `src/hooks/use-show-entry-list-tool.tsx` — deleted the `useRef` history dedupe
- `src/hooks/use-render-release-notes-preview-tool.tsx` — same

**Remaining**
- Rename / delete thread UI (not built)

## Design

### Dashboard store — per-thread left-panel state (done)

The three `commits` / `selectedHashes` / `entries` / `draft` `useState` calls
formerly in `DashboardPage.tsx` now live in `src/hooks/use-dashboard-store.ts`:

```ts
interface DashboardThreadState {
  commits: Commit[];
  selectedHashes: string[];   // Set is not serializable — array + convert
  entries: ReleaseEntry[];
  draft: ReleaseNotesDraft | null;
}

// Record<threadId, DashboardThreadState>, persisted to localStorage
```

`selectedHashes` is a `string[]` in the store, converted to a `Set` at the point of
use (`CommitListPanel` still takes `Set<string>`).

The fourth original `useState`, `platform`, does **not** move into the store — task 02
still deletes it once the platform model refactor lands. Unchanged from the original
design.

`DashboardPage` reads the slice for the active `threadId` via
`state.threads[threadId] ?? EMPTY_DASHBOARD_THREAD_STATE` — a thread with no slice yet
gets a default empty state, never `undefined`.

### The `appliedToolCallIds` trap — resolved (see §11 question 1)

Both hooks previously held a `useRef(new Set<string>())` to dedupe by `toolCallId`.
Confirmed via source-tracing in the spike (§11) that `CopilotChat` calls
`connectAgent` on every `threadId` change — including switching back to an
already-visited thread — which replays that thread's tool calls with the *same*
`toolCallId`. The ref-based Set treated "seen once" as "never sync again," so
revisiting a thread left the panel showing the previous thread's stale data.

Fixed by moving the dedupe from the hook (by *history*) to the store (by *data*):
`useDashboardStore`'s `showEntryList`/`showDraft` actions compare the incoming
payload against that thread's currently stored value and no-op if unchanged. Both
hooks now call `onEntryListShown`/`onDraftRendered` unconditionally on every complete
`render`; the store is what makes repeat calls with the same data idempotent, and a
replay carrying genuinely different data (switching back to a thread) still updates
correctly. No `useRef` remains in either tool hook.

### Thread list (already shipped, described here for completeness)

`ThreadListDropdown`/`ThreadListItem` render the server-fetched list from
`useThreads()`, sorted as the Mastra API returns it, with the active thread
highlighted via `aria-current`. "New Chat" generates a fresh `threadId`
(`createUUID()`) and switches to it immediately; the thread only becomes visible in
Mastra's own list once the agent has processed a first message for it, so
`CopilotAssistantPanel` seeds an optimistic placeholder (`title = threadId`) into the
TanStack Query cache in the meantime.

## Acceptance criteria

- [x] Create a new thread → empty chat, empty left panel
- [x] Switch between two threads with different commit lists → the left panel is
      correct on both sides (fixed by the dashboard-store dedupe change above)
- [x] Reload the page → active thread and left panel restore correctly (both stores
      persist to localStorage)
- [ ] Rename and delete work; deleting the last thread does not hang the app — **not
      built**
- [x] No `useRef` remains in either tool hook
- [x] Lint + build clean

## Out of scope

- Server-side authoritative thread list beyond what Mastra Memory already provides —
  switching browsers still loses the optimistic-placeholder thread until it has a
  first message
- Rename / delete thread UI — tracked as the remaining 0.7h of this task

## Risks

| Risk | Status |
| --- | --- |
| CopilotKit replays tool calls on thread switch | Confirmed (§11 question 1). Resolved via data-based dedupe in `use-dashboard-store.ts`, not the history-based approach originally proposed here |
| localStorage grows with threads × commits | Low, accepted — unchanged from original assessment |
