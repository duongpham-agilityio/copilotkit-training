# 03 — Multiple threads

Date: 2026-08-22
Estimate: 2.5h · Branch: `feat/multiple-threads` · Depends on: 01, 02
Part of: [Overview](./00-overview-design.md) · Source: §4 Item 5 of the source design

## Goal

Create a new conversation and switch between threads. On switch, **the left panel
restores per thread** — not just chat history.

The per-thread left panel is the expensive half and the reason this task is 2.5h
rather than 1h. Skipping it makes the feature actively harmful: the user switches
threads and sees another thread's commit list.

## Files

**Create**
- `src/hooks/use-dashboard-store.ts` — per-thread left-panel state
- `src/components/chat/ThreadDrawer.tsx` — thread list

**Modify**
- `src/hooks/use-thread-store.ts` — single `threadId` → thread list
- `src/components/chat/CopilotAssistantPanel.tsx` — "New chat" icon + drawer
- `src/routes/DashboardPage.tsx` — four `useState` → store
- `src/hooks/use-show-entry-list-tool.tsx` — **delete** the `useRef` dedupe
- `src/hooks/use-render-release-notes-preview-tool.tsx` — same

## Design

### Thread store

```ts
interface ThreadSummary {
  id: string;
  title: string | null;   // from the user's first message, truncated to ~40 chars
  createdAt: string;
}

interface ThreadStoreState {
  threads: ThreadSummary[];
  activeThreadId: string;
  createThread: () => void;
  switchThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
  deleteThread: (id: string) => void;
}
```

No backend changes — chat history still lives in Mastra Memory keyed by `threadId`;
only the *list* is client-side. `ThreadSummary` is shaped so a future server sync can
fill it without changing the shape.

### Migration — mandatory, not optional

Existing users have `{ threadId: "..." }` under
`COPILOTKIT_THREAD_ID_STORAGE_KEY`. Without a migration, **the first deploy loses the
thread they are working in**.

```ts
persist(..., {
  name: COPILOTKIT_THREAD_ID_STORAGE_KEY,
  version: 2,
  migrate: (persisted, version) => {
    if (version < 2) {
      const old = persisted as { threadId?: string };
      const id = old.threadId || crypto.randomUUID();
      return { threads: [{ id, title: null, createdAt: new Date().toISOString() }],
               activeThreadId: id };
    }
    return persisted;
  },
})
```

Keep the existing key rather than introducing a new one — change the key and
`migrate` never runs, because zustand only reads the `version` stored under **that
key**.

The current `onRehydrateStorage` (generating a UUID when empty) is still needed,
reworked to: if `threads` is empty, create a first thread.

### Dashboard store — per-thread left-panel state

The four `useState` calls in `DashboardPage.tsx:26-30` move into a store:

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
use (`CommitListPanel` takes `Set<string>` — keep its prop as is).

The fourth current `useState`, `platform`, does **not** move into the store — task 02
deletes it.

`DashboardPage` reads the slice for `activeThreadId`. A thread with no slice yet gets
a default empty state, never `undefined`.

### The `appliedToolCallIds` trap — delete the `useRef`, do not key it by `threadId`

Both hooks currently hold a `useRef(new Set<string>())` to dedupe by `toolCallId`.
The ref never resets on thread change, so a new thread's replayed tool call can be
skipped if its id is already in the Set.

**The fix is not to key the Set by `threadId`.** That still lets the Set grow without
bound across a session, and it is still dedupe by *history*.

Once `use-dashboard-store` exists, the source of truth is the per-thread persisted
state. Change the dedupe condition from:

> "have I processed this toolCallId?"

to:

> "does this thread's current state already match the payload?"

Idempotent by **data** instead of by **history**: the replay bug goes away, the memory
leak goes away, and a `useRef` disappears from both hooks. The comparison belongs in
`onEntryListShown` / `onDraftRendered` at the store layer (a shallow compare on the
fields that matter), not inside the hook.

### UI

`ThreadDrawer.tsx`: list sorted by `createdAt` descending, active thread highlighted,
each row with a rename / delete menu. Built from the existing `Card`, `IconButton`,
and `Input`.

The "New chat" icon goes in the `CopilotAssistantPanel` header, next to the
commented-out Clear button (`CopilotAssistantPanel.tsx:47-55`). Remove that comment
block while you are there — do not leave dead code beside new code.

**Deleting the active thread** → switch to the most recent remaining thread; deleting
the last one → immediately create an empty thread, never leave `activeThreadId`
dangling. Deleting a thread also deletes its dashboard-store slice.

## Acceptance criteria

- [ ] Open the app with the old localStorage shape (`{ threadId }`) → the old thread
      and its chat history are intact
- [ ] Create a new thread → empty chat, empty left panel
- [ ] Switch between two threads with different commit lists → the left panel is
      correct on both sides
- [ ] Reload the page → active thread and left panel restore correctly
- [ ] Rename and delete work; deleting the last thread does not hang the app
- [ ] No `useRef` remains in either tool hook
- [ ] Lint + build clean

## Out of scope

- Server-side thread list (switching browsers loses the list; history still lives in
  Mastra Memory if the `threadId` is known)
- LLM-generated titles — the title is the user's first message, truncated

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| CopilotKit replays tool calls on thread switch | Pending spike question 1 | If yes: ~2h to distinguish replay from a new call. Data-based dedupe softens it but may not be enough |
| localStorage grows with threads × commits | Low | Accepted. If needed: cap the number of thread slices retained, evicting oldest |
| A faulty migration destroys real threads | Low but painful | Manually test against the old localStorage shape **before** merging — it is in the acceptance criteria |
