# Spike: Three Foundational Unknowns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Answer the three questions that gate the post-demo improvements
architecture — tool-call replay on thread switch, retry/regenerate API
availability, and whether in-chat tool renders survive the custom
`messageView` — by running small throwaway probes against the real dev
stack and recording the observed behavior in the source design doc.

**Architecture:** Each of the three questions gets its own throwaway
instrumentation added to existing files, verified by hand against the
running app, then reverted. No feature code is merged. The only permanent
output is prose written into `docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md`
§11, plus a same-file update to §6 if any answer forces a schedule change.

**Tech Stack:** Vite dev server (frontend), Mastra dev server (backend),
CopilotKit v2 (`@copilotkit/react-core/v2`), manual browser verification —
no automated test framework is applicable here since the object under test
is third-party runtime behavior, not code this repo owns.

## Global Constraints

- This branch (`docs/spike-results`) merges **zero application code** — every
  instrumentation change added during a task is reverted by the end of that
  task. The only diff that survives to the final commit is the `.md` edit.
- Both dev servers must be running for any manual verification step:
  `pnpm dev` (Vite, default `http://localhost:5173`) and `pnpm dev:mastra`
  (Mastra, `http://localhost:4111` per `.env.example`'s
  `VITE_MASTRA_SERVER_URL`).
- Record what was **observed**, never what was assumed. If a question comes
  back ambiguous, write "inconclusive" and take the defensive branch — do
  not write a guess into §11 as if it were a finding.
- Total time budget: 45 minutes across all three questions. If running long,
  drop Question 2 first (already downgraded to a non-blocker — see Task 2),
  then Question 1. Question 3 is the last to cut — it gates the most
  expensive downstream task (platform draft cards, 2.5h).
- Source spec for this task: `docs/superpowers/specs/2026-08-22-post-demo-improvements/01-spike-design.md`.
  Source design doc being updated: `docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md`.

---

### Task 1: Question 1 — tool-call replay on `threadId` change

**Files:**
- Modify (temporary, reverted at end of task): `src/components/chat/CopilotAssistantPanel.tsx`
- Modify (temporary, reverted at end of task): `src/hooks/use-show-entry-list-tool.tsx`
- Modify (permanent): `docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md` (§11, question 1)

**Interfaces:**
- Consumes: `useThreadStore` (`src/hooks/use-thread-store.ts`) — reads/writes
  `state.threadId: string` via `useThreadStore((state) => state.threadId)`
  and `state.setThreadId(threadId: string)`. This is the pre-existing
  single-thread store; Task 1 does not touch its shape.
- Consumes: `useShowEntryListTool` (`src/hooks/use-show-entry-list-tool.tsx`)
  — the hook already logs nothing about replay; this task adds temporary
  logging inside its existing `render` callback.
- Produces: nothing consumed by later tasks — this task's only durable
  output is the §11 entry written in Step 6.

- [ ] **Step 1: Add two temporary thread-switch buttons**

Open `src/components/chat/CopilotAssistantPanel.tsx`. Add two hard-coded
thread IDs and two buttons that call `setThreadId` directly, so thread
switching doesn't depend on task 03 (which hasn't been built yet). Insert
this block into the header `<div>` that currently only renders the status
dot and title (around line 34-45):

```tsx
const CopilotAssistantPanel = () => {
  const threadId = useThreadStore((state) => state.threadId);
  const setThreadId = useThreadStore((state) => state.setThreadId);

  // SPIKE-ONLY — remove before task completion.
  const SPIKE_THREAD_A = 'spike-thread-a';
  const SPIKE_THREAD_B = 'spike-thread-b';

  useConfigureSuggestions({
    consumerAgentId: RELEASE_COPILOT_AGENT_ID,
    suggestions: QUICK_ACTION_SUGGESTIONS,
    available: 'always',
  });

  return (
    <div className="bg-surface-container-lowest border-outline-variant flex h-full w-full flex-col border-l">
      <div className="border-outline-variant flex shrink-0 items-center justify-between border-b px-4 py-4">
        <span className="flex items-center gap-2">
          <span
            className="bg-success-emerald size-3 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <span className="text-headline-md text-on-surface">
            Copilot Assistant
          </span>
        </span>
        {/* SPIKE-ONLY — remove before task completion. */}
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setThreadId(SPIKE_THREAD_A)}
            className="text-label-sm rounded border px-2 py-1"
          >
            Thread A
          </button>
          <button
            type="button"
            onClick={() => setThreadId(SPIKE_THREAD_B)}
            className="text-label-sm rounded border px-2 py-1"
          >
            Thread B
          </button>
        </span>
      </div>
```

This is a manual verification aid, not a test — there is no automated
assertion possible here because the behavior under investigation lives
inside `@copilotkit/react-core/v2`, a third-party runtime.

- [ ] **Step 2: Add temporary replay logging to the tool render**

Open `src/hooks/use-show-entry-list-tool.tsx`. Inside the `render` callback
(currently starting at line 60), add a `console.log` immediately before the
existing `EntryListToolSchema.safeParse(props.args)` call, at line 65:

```tsx
    render: (props) => {
      if (props.result === undefined) {
        return <Fragment />;
      }

      // SPIKE-ONLY — remove before task completion.
      console.log('[spike-q1] render fired', {
        toolCallId: props.toolCallId,
        status: props.status,
      });

      const result = EntryListToolSchema.safeParse(props.args);
```

- [ ] **Step 3: Start both dev servers**

Run in two separate terminals:

```bash
pnpm dev:mastra
```

```bash
pnpm dev
```

Expected: Vite prints a local URL (default `http://localhost:5173`); Mastra
prints it is listening on `http://localhost:4111`. Open the Vite URL in a
browser with devtools console open.

- [ ] **Step 4: Run the two-thread replay test**

1. Click "Thread A". Paste a short synthetic git log into the chat, e.g.:
   ```
   feat: add dark mode toggle
   fix: correct off-by-one in pagination
   ```
   Wait for the agent to call `showEntryList` and for the commit list to
   render. Note the `toolCallId` logged in the console.
2. Click "Thread B". Paste a **different** synthetic git log, e.g.:
   ```
   feat: add CSV export
   fix: null pointer on empty response
   ```
   Wait for the same tool call to complete. Note this `toolCallId`.
3. Click "Thread A" again (switching back).
4. Click "Thread B" again.

While doing this, watch the console for `[spike-q1] render fired` entries
that appear **without** a new message being sent — i.e. entries that fire
purely because of the thread switch itself.

Expected: either (a) no new `[spike-q1]` log appears on switch — the render
only fires in direct response to a new tool call — or (b) a log appears on
switch, in which case note whether its `toolCallId` matches an id already
seen in step 4.1/4.2 or is new.

- [ ] **Step 5: Revert the temporary instrumentation**

Remove every block added in Steps 1 and 2. Confirm with:

```bash
git diff --stat src/components/chat/CopilotAssistantPanel.tsx src/hooks/use-show-entry-list-tool.tsx
```

Expected: empty output (no diff) for both files.

- [ ] **Step 6: Write the finding into §11**

Open `docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md`
and replace the line:

```
**1. Tool-call replay on `threadId` change:** _(not run)_
```

with 2-4 sentences stating what was observed in Step 4 (did `render` fire on
switch; did `toolCallId` repeat) and the resulting decision: either "no
replay observed — task 03's data-based dedupe is sufficient as designed" or
"replay observed — task 03's estimate grows by ~2h to distinguish replay
from a new call; flagged for §6 update in Task 4 of this plan."

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md
git commit -m "docs: record spike finding for tool-call replay on thread switch"
```

---

### Task 2: Question 2 — retry/regenerate API availability

**Files:**
- Read-only investigation: `node_modules/@copilotkit/react-core/dist/index.d.mts`
- Read-only investigation: `node_modules/@copilotkit/react-core/dist/copilotkit-D0aAnD3i.d.mts`
- Modify (permanent): `docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md` (§11, question 2)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: nothing consumed by later tasks in this plan. Downstream, task
  10 of the post-demo work (`use-retry-last-message.ts`) reads this finding
  to decide its internal implementation — but per the source design, its
  call site (`{ canRetry: boolean; retry: () => void }`) does not change
  regardless of the answer, so this task cannot block that one.

This question is already downgraded to a **non-blocker** in the source
design (§5, item 2) — `use-retry-last-message.ts`'s public interface is
fixed either way. Two concrete leads were found ahead of time so this task
is a confirm-or-rule-out check, not a blind search:

**Lead A — `useCopilotChat().reloadMessages(messageId)`.** Found in
`node_modules/@copilotkit/react-core/dist/index.d.mts:200-213`:

```ts
/**
 * Regenerate the response for a specific message
 *
 * ```tsx
 * reloadMessages("123");
 * ```
 */
reloadMessages: (messageId: string) => Promise<void>;
```

This export lives in the package's **root** entry (`.` → `./dist/index.mjs`
per `node_modules/@copilotkit/react-core/package.json`), not `./v2`
(→ `./dist/v2/index.mjs`). This repo imports exclusively from
`@copilotkit/react-core/v2` (see every existing hook under `src/hooks/`).
**This lead is very likely not directly usable without confirming whether
the v2 entry re-exports it.**

**Lead B — `CopilotChatAssistantMessage`'s `onRegenerate` prop.** Found in
`node_modules/@copilotkit/react-core/dist/copilotkit-D0aAnD3i.d.mts:764-812`
— this **is** the v2 bundle. The component this repo already overrides via
`messageView.assistantMessage`
(`src/components/chat/CopilotAssistantPanel.tsx:63-70`,
`src/components/chat/AssistantMessageBubble.tsx`) accepts:

```ts
onRegenerate?: (message: AssistantMessage) => void;
```

plus a default `RegenerateButton` slot. What the `.d.ts` file **cannot**
show is whether `CopilotChat` internally wires a working regenerate action
into this prop when it renders the slot, or whether it is inert plumbing
the consumer must implement from scratch. That is exactly what this task
determines.

- [ ] **Step 1: Check whether the v2 entry re-exports `reloadMessages` (Lead A)**

```bash
grep -n "reloadMessages\|useCopilotChat\b" node_modules/@copilotkit/react-core/dist/v2/index.d.mts
```

Expected: either the grep returns matches (re-exported, Lead A is viable in
v2) or it returns nothing (Lead A is v1-only, ruled out).

- [ ] **Step 2: Check whether `CopilotChat` passes `onRegenerate` when rendering the assistant message slot (Lead B)**

```bash
grep -n "onRegenerate" node_modules/@copilotkit/react-core/dist/copilotkit-D0aAnD3i.d.mts
```

This was already run once and returned only the two declaration sites
(the prop's own type, and its destructured parameter name) — no evidence in
the `.d.ts` of `CopilotChat`/`CopilotChatView` supplying a real handler.
`.d.ts` files describe shapes, not behavior, so this cannot be settled from
types alone. Confirm behaviorally instead:

1. With both dev servers running (`pnpm dev:mastra`, `pnpm dev`), open the
   app and send one message so an assistant reply renders.
2. In `src/components/chat/AssistantMessageBubble.tsx`, check whether it
   currently passes `regenerateButton` or `onRegenerate` through to
   `CopilotChatAssistantMessage` — if it does not opt in today, no
   regenerate button will be visible in the running app, which is itself a
   finding (the slot exists but isn't wired up in this codebase yet).
3. If a regenerate control **is** visible, click it after intentionally
   causing a failure (stop `pnpm dev:mastra` mid-conversation, send a
   message, then restart the server and click regenerate) and watch the
   Network tab for a new request carrying the same message content.

Expected: one of three outcomes — (a) `AssistantMessageBubble` does not use
the `regenerateButton`/`onRegenerate` slot, so nothing renders and the slot
is confirmed unused in this codebase today, (b) it is wired and a real HTTP
request fires on click, or (c) it is wired but visibly does nothing (dead
plumbing).

- [ ] **Step 3: Write the finding into §11**

Replace:

```
**2. Retry/regenerate message API:** _(not run)_
```

with 2-4 sentences: whether `reloadMessages` is reachable from the `/v2`
entry point (Step 1 result), whether `AssistantMessageBubble` currently
opts into `onRegenerate`/`regenerateButton` (Step 2 result), and which
approach `use-retry-last-message.ts` should use internally — a native
CopilotKit API if one was confirmed working, or a manual resend of the
user's last message content (reading it from `useCopilotChat`'s or the
agent's message list and calling `sendMessage` again) if neither lead
panned out. State explicitly that this does not change task 10's call site.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md
git commit -m "docs: record spike finding for retry/regenerate API"
```

---

### Task 3: Question 3 — tool render survival inside the custom `messageView`

**Files:**
- Modify (temporary, reverted at end of task): `src/hooks/use-render-release-notes-preview-tool.tsx`
- Modify (permanent): `docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md` (§11, question 3)

**Interfaces:**
- Consumes: `useRenderReleaseNotesPreviewTool`
  (`src/hooks/use-render-release-notes-preview-tool.tsx`) — the hook's
  existing `render` callback, temporarily modified to return a dummy wide
  card instead of `<DraftSync />`.
- Produces: nothing consumed by later tasks in this plan. Downstream, task
  07 of the post-demo work (`PlatformDraftCard.tsx`) reads this finding to
  decide whether it needs to widen `AssistantMessageBubble` or render at the
  `CopilotChat` level instead.

- [ ] **Step 1: Swap the tool render for a dummy wide card**

Open `src/hooks/use-render-release-notes-preview-tool.tsx`. Temporarily
replace the `render` callback's return value (currently returning
`<DraftSync ... />` starting at line 47) with a dummy card that has real
height, full width, and multiple interactive elements — the shape task 07's
`PlatformDraftCard` will actually have:

```tsx
    render: (props) => {
      if (props.status === 'inProgress') {
        return <Fragment />;
      }

      // SPIKE-ONLY — remove before task completion.
      return (
        <div
          style={{
            width: '100%',
            minHeight: 200,
            border: '2px solid red',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <strong>Spike Q3 dummy card</strong>
          <p>This card is 200px tall and should span the full message width.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button">Copy</button>
            <button type="button">Export</button>
            <button type="button">Publish</button>
          </div>
        </div>
      );

      return (
        <DraftSync
          toolCallId={props.toolCallId}
          draft={props.parameters}
          onSync={syncDraft}
        />
      );
    },
```

(The unreachable second `return` is intentionally left in place so Step 4's
revert is a clean deletion of everything above the original `return
DraftSync` block, rather than a hand-reconstruction.)

- [ ] **Step 2: Trigger the dummy card in the running app**

With both dev servers running, paste a synthetic git log, let the agent
classify it, then ask it to draft release notes (this calls
`renderReleaseNotesPreview`, whose render is now the dummy card). Watch the
card render inside the chat panel.

- [ ] **Step 3: Inspect layout in devtools**

Open browser devtools, inspect the dummy card element, and walk up the DOM
tree toward `AssistantMessageBubble`'s root element
(`src/components/chat/AssistantMessageBubble.tsx`). Check:

1. Is the red-bordered card's rendered width equal to the message column's
   full width, or is it constrained/clipped by a parent with a smaller
   `max-width` or `overflow: hidden`?
2. Is the card a descendant of `AssistantMessageBubble`'s root, or does it
   render as a sibling at the `CopilotChat` message-list level?
3. Does anything clip the 200px height (e.g. a fixed-height scroll
   container)?

Expected: a clear yes/no on whether the card is unconstrained, and which
parent element (name the class or component) is responsible if it is
constrained.

- [ ] **Step 4: Revert the temporary instrumentation**

Remove the dummy-card block and the unreachable duplicate `return`, restoring
the original single `return <DraftSync ... />`. Confirm with:

```bash
git diff --stat src/hooks/use-render-release-notes-preview-tool.tsx
```

Expected: empty output.

- [ ] **Step 5: Write the finding into §11**

Replace:

```
**3. Tool render inside the custom `messageView`:** _(not run)_
```

with 2-4 sentences: whether the card rendered at full width and height
(Step 3 observation), which parent constrained it if any, and the resulting
decision for task 07 — either "renders cleanly, no `AssistantMessageBubble`
change needed" or "constrained by `<name the parent>` — task 07 must either
widen `AssistantMessageBubble` to allow full-width children, or move the
render to the `CopilotChat` level instead of inside the bubble."

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md
git commit -m "docs: record spike finding for tool render inside messageView"
```

---

### Task 4: Consolidate — update §6 if any answer was bad, verify the branch is doc-only

**Files:**
- Modify (conditional — only if Task 1 or Task 3 found a bad answer):
  `docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md` (§6)
- Modify (conditional, same trigger): `docs/superpowers/specs/2026-08-22-post-demo-improvements/03-multiple-threads-design.md`
  (if Task 1 found replay) or `docs/superpowers/specs/2026-08-22-post-demo-improvements/07-platform-draft-card-design.md`
  (if Task 3 found layout breakage)

**Interfaces:**
- Consumes: the three §11 entries written in Tasks 1-3.
- Produces: an updated §6 schedule and, if needed, updated task-file
  estimates that the day-1/day-2 execution plans (written later, per task)
  will read.

- [ ] **Step 1: Re-read all three §11 entries**

```bash
sed -n '/## 11\. Spike results/,$p' docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md
```

Expected: all three entries filled in, no `_(not run)_` remaining.

- [ ] **Step 2: If Question 1 found replay, update the schedule**

Only if Task 1's finding was "replay observed": open
`docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md` §6 and
change the "Item 5 — thread store + dashboard store + ThreadDrawer" row's
duration from `2.5h` to `4.5h`, adjusting the Day 1 total accordingly. Then
open `docs/superpowers/specs/2026-08-22-post-demo-improvements/03-multiple-threads-design.md`
and update its header estimate from `2.5h` to `4.5h`, adding a short new
subsection under "Design" describing how replay is distinguished from a new
call (e.g. comparing the replayed `toolCallId` against a per-thread set
already known to the dashboard store, skipping `onEntryListShown`/
`onDraftRendered` when it is a known id from a prior session rather than a
genuinely new one).

If Task 1's finding was "no replay observed," skip this step — no edit
needed.

- [ ] **Step 3: If Question 3 found layout breakage, update the schedule**

Only if Task 3's finding identified a constraining parent. Open
`docs/superpowers/specs/2026-08-22-post-demo-improvements/07-platform-draft-card-design.md`
and, in its "Dependency on spike question 3" section, replace the two
generic fallback options with the specific fix identified in Step 3 of Task
3 (name the actual constraining element/class and the specific CSS or
component change needed). The task's total estimate (2.5h) already budgets
1h for this scenario — do not increase it unless the specific fix clearly
exceeds that budget, in which case state the new estimate and the reason.

If Task 3's finding was "renders cleanly," skip this step — no edit needed.

- [ ] **Step 4: Verify the branch carries no application-code diff**

```bash
git diff --stat main...docs/spike-results -- src/
```

Expected: empty output. Every file under `src/` must show zero net change
across the whole branch — Tasks 1-3 each reverted their own instrumentation
individually, and this step is the final confirmation across all three
combined.

- [ ] **Step 5: Final commit (only if Step 2 or Step 3 made an edit)**

```bash
git add docs/superpowers/specs/2026-08-22-post-demo-improvements-design.md \
        docs/superpowers/specs/2026-08-22-post-demo-improvements/03-multiple-threads-design.md \
        docs/superpowers/specs/2026-08-22-post-demo-improvements/07-platform-draft-card-design.md
git commit -m "docs: adjust post-demo schedule based on spike findings"
```

If neither Step 2 nor Step 3 made an edit, there is nothing to commit here —
Tasks 1-3 already committed their individual findings.

## Self-Review

**Spec coverage:** All three questions from
`docs/superpowers/specs/2026-08-22-post-demo-improvements/01-spike-design.md`
have a task (1, 2, 3). The spec's "Deliverable" (fill §11, update §6 if
needed) is Task 4. The spec's acceptance criterion "all scratch code
removed" is Task 4 Step 4. The spec's cut-order guidance (drop Q2 first,
then Q1, keep Q3) is stated in Global Constraints.

**Placeholder scan:** No "TBD"/"add appropriate" strings. The §11 entries
themselves are necessarily filled in during execution (that is the nature of
a spike) — the plan gives the exact replacement template and the exact
content categories each entry must cover, which is the most concrete a
plan can be about an empirical result not yet observed.

**Type consistency:** No new types introduced by this plan — all
modifications are to existing hook `render` callbacks and one component's
JSX, using types already declared in the files being touched
(`EntryListToolSchema`, `ReleaseNotesDraft`, `props.toolCallId`,
`props.status`). Task 4's conditional edits reference task-file section
names (`§3.2`, "Dependency on spike question 3") verified present in the
current versions of those files.
