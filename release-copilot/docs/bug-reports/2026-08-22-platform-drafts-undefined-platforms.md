---
date: 2026-08-22
branch: fix/thread-switch-state-replay
commit:
files: [src/lib/release-notes/to-platform-drafts.ts, src/hooks/use-dashboard-store.ts, src/constants/storage.ts]
severity: high
---

# Chat messages stop rendering when the model omits `platforms` from a draft

## Summary

After a release-notes draft rendered, the assistant's message for that turn could
silently fail to appear in the chat, while the Live Preview panel and commit-list
entries kept showing stale data from an earlier, successful turn. The immediate
cause was an unguarded array access; the reason the symptom looked like "old data
stuck on screen" rather than "something broke" was a second, deeper problem — the
dashboard state was persisted to `localStorage` independently of the message history
it was supposed to reflect.

## Root Cause

`src/lib/release-notes/to-platform-drafts.ts:41` (pre-fix) read
`draft.platforms.filter(...)` directly, trusting the TypeScript type
`ReleaseNotesDraft` (`src/types/release-notes-draft.ts`, `platforms` field defined
with `.default([])`). That type is the *Zod output* type — accurate only for data
that has actually been parsed through `ReleaseNotesDraftSchema`. The value this
function actually receives at render time, `props.parameters` from
`useRenderTool` (`src/hooks/use-render-release-notes-preview-tool.tsx`), is never
parsed through that schema on the client: `useRenderTool`'s internal renderer sets
`parameters: props.args` verbatim (`@copilotkit/react-core`
`dist/v2/headless.mjs`, `useRenderTool`), and `props.args` itself comes from
`partialJSONParse` — a plain JSON-repair parser with no schema awareness
(`@copilotkit/shared/src/utils/index.ts:30-40`, confirmed by reading the installed
source, not assumed). So `props.parameters` is exactly the raw JSON object the
model's function call contained, with no Zod defaults ever applied.

Since `platforms` is defined with `.default([])`, it is optional in the *input*
schema the model sees — the model is not required to emit the key at all when there
is nothing to put there, and per this repo's own instructions
(`src/mastra/instructions/release-note-formatting.ts`: "Only produced when the user
explicitly asked for a destination... leave it empty otherwise") a model that
interprets "leave it empty" as "omit the key" produces perfectly schema-valid JSON
that is missing `platforms` entirely.

A second, independent problem compounded the symptom: `src/hooks/use-dashboard-store.ts`
(pre-fix) wrapped its Zustand store in `zustand/middleware`'s `persist`, writing
`commits`/`selectedHashes`/`entries`/`draft` to `localStorage` per thread. This data
is a *derived side effect* of tool calls the assistant's messages already contain —
Mastra persists the real conversation history server-side
(`src/mastra/index.ts`'s `LibSQLStore`). Keeping an independent, persisted client-side
copy of the same information created a second source of truth that could silently
drift from the first: when the render above threw, the store simply never got a
newer write for that turn, and the last successful write kept sitting in
`localStorage` indefinitely, with no way to tell it apart from a real, current sync.

## Explanation

1. User asks for a draft without naming any platform beyond GitHub/App
   Store/Google Play.
2. The model calls `renderReleaseNotesPreview` with a JSON object that omits
   `platforms` (schema-valid, since the field defaults to `[]` server-side).
3. The browser receives this raw JSON via the AG-UI tool-call stream and hands it to
   `use-render-release-notes-preview-tool.tsx`'s `render` as `props.parameters`,
   with `platforms` simply absent (`undefined`), not `[]`.
4. `render` calls `toPlatformDrafts(props.parameters)`, which executes
   `draft.platforms.filter(...)` on `undefined` — `TypeError: Cannot read
   properties of undefined (reading 'filter')` — before the function can return,
   so the enclosing `render` callback never reaches its JSX return. The tool
   call's sync component never mounts, so the current turn's draft never reaches
   `useDashboardStore`.
5. Because `useDashboardStore` persisted to `localStorage`, the Live Preview panel
   and commit-list entries kept showing whatever was synced on the *previous*
   successful turn — reading as "Live Preview and entries still work" while the
   actual new message for this turn failed to render, exactly the reported symptom.

This was introduced in the task 02 platform-model refactor (`toPlatformDrafts`) and
the task 03/spike follow-up (`useDashboardStore`'s `persist`), and was not caught by
task 02's model smoke test, because that test inspected Mastra's server-side
`POST /api/agents/.../generate` response, a different code path from what the
browser's AG-UI tool-call stream actually delivers to `useRenderTool`.

## Solution

Two independent fixes, addressing each layer:

1. Make `toPlatformDrafts` defensive against `platforms` being absent at runtime,
   since the type system cannot be trusted for this specific data path.
2. Stop persisting `useDashboardStore` to `localStorage`. The dashboard panels are
   driven by CopilotKit's tool-call render — that trigger is not something this app
   should work around or duplicate. Removing the second, independent copy of the
   same data removes the class of bug where a missed sync leaves invisible stale
   state with no way to detect it: without persistence, a failed sync simply means
   the panel is empty until a later successful tool call populates it (or, on
   reload, until the thread reconnects and the render fires again from replayed
   history) — never a silent, indistinguishable-from-fresh copy of old data.

## Solution Details

`src/lib/release-notes/to-platform-drafts.ts`:

```diff
-  const extra = draft.platforms.filter((platformDraft) => {
+  // `props.parameters` on the client is the model's raw JSON, parsed via
+  // CopilotKit's partialJSONParse (no Zod re-validation, no `.default([])`
+  // applied) — the model can legally omit `platforms` entirely, so this can be
+  // `undefined` at runtime despite the schema-derived type saying otherwise.
+  const extra = (draft.platforms ?? []).filter((platformDraft) => {
```

`src/hooks/use-dashboard-store.ts`: dropped the `persist(...)` wrapper and its
`{ name: DASHBOARD_STATE_STORAGE_KEY }` config; the store is now a plain in-memory
Zustand store, same shape and same per-thread, data-based-idempotent update logic
(`showEntryList`/`showDraft` still no-op on an unchanged value, which is what keeps
the tool-call-driven render from flickering on redundant syncs) — only the
persistence layer was removed.

`src/constants/storage.ts`: removed the now-unused `DASHBOARD_STATE_STORAGE_KEY`.

This is a real fix rather than a workaround on both counts: the guard makes the
function's runtime behavior match what the schema's own semantics already promise
("an empty array is normal"); dropping persistence removes a second source of truth
that had no reason to exist once the render pipeline is trusted to be the trigger,
not something to be defended against with a client-side cache.

## Verification

- `NODE_OPTIONS="--max-old-space-size=4096" pnpm build` — `tsc -b && vite build`
  succeeded (`✓ built in 1.51s`).
- `NODE_OPTIONS="--max-old-space-size=4096" pnpm lint` — same single pre-existing,
  unrelated finding as before the fix (`src/services/publish-to-slack.ts:44`, empty
  catch block, not touched by this change); no new findings.
- Root cause was confirmed by reading the installed `@copilotkit/react-core`
  (`dist/v2/headless.mjs`, `useRenderTool`) and `@copilotkit/shared`
  (`src/utils/index.ts`, `partialJSONParse`) source directly, not from
  documentation or memory — consistent with this project's rule to never trust
  cached knowledge of Mastra/CopilotKit APIs.
- Not verified against a live browser session: no browser-automation tool is
  available in this environment. The fix is a one-line null-safety change plus a
  middleware removal, both with an obvious before/after behavior, so this gap is
  low-risk, but a manual pass — asking for a draft without naming any extra
  platform, then reloading the page — is still worth doing before merging.

## Prevention

- General lesson for this codebase: **never trust a Zod-inferred type for data
  crossing a CopilotKit `render`/`useRenderTool`/`useFrontendTool` boundary.**
  `props.args`/`props.parameters` is always raw, unvalidated model JSON on the
  client — only server-side Mastra tool execution (`execute()`) sees a
  schema-parsed, defaulted object. Any field with `.optional()` or `.default()` in
  a schema used this way needs an explicit runtime guard at every point it's read
  from a `render` callback's props.
- Broader lesson: **don't add client-side persistence for state that is already a
  derived side effect of a CopilotKit tool-call render.** The render pipeline is
  the trigger CopilotKit provides; the fix here is to make that trigger robust
  (guard against malformed/partial args) rather than to build a second,
  independently-persisted cache meant to survive the trigger failing — that cache
  is exactly what turned a crash into "stale data displayed as if current."
- No automated test currently covers `toPlatformDrafts` in isolation. A unit test
  asserting `toPlatformDrafts({ ...validDraft, platforms: undefined } as
  ReleaseNotesDraft)` returns `[]` instead of throwing would have caught the
  first issue directly, without needing a browser at all.
