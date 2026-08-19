---
date: 2026-08-19
branch: fix/entry-list-tool-history-replay
commit:
files: [src/hooks/use-show-entry-list-tool.ts]
severity: medium
---

# Entry list not shown when resuming a thread from persisted memory

## Summary

After resuming a chat thread from persisted message history (page reload, or
opening an older thread), the classified entry list never appeared in the UI —
even though the assistant message history clearly contained a `showEntryList`
tool_call. The equivalent `renderReleaseNotesPreview` tool worked fine in the
same scenario.

## Root Cause

`src/hooks/use-show-entry-list-tool.ts:17-45` registered `showEntryList` via
`useFrontendTool` with a `handler` option. In the installed
`@copilotkit/core` package
(`node_modules/.pnpm/@copilotkit+core@1.66.4.../dist/index.mjs`):

- `CopilotKitCore.connectAgent` (index.mjs:1934-1964) is the path used to
  hydrate/resume a thread from persisted history. It explicitly calls
  `processAgentResult({ ..., executeFrontendTools: false })` (index.mjs:1960-1964).
- `processAgentResult` (index.mjs:2065-2100) only walks `newMessages` and
  invokes each tool's `handler` (via `executeSpecificTool`) when
  `executeFrontendTools` is `true` (index.mjs:2069, 2093-2094). The default of
  `true` only applies to the *live* `runAgent()` path
  (used for messages produced during the current session).

So a `showEntryList` tool_call that was already recorded in a prior session's
history never re-runs its `handler` on resume — by design, CopilotKit avoids
re-executing business-logic side effects for tool calls that already happened.

By contrast, `renderReleaseNotesPreview`
(`src/mastra/tools/render-release-notes-preview-tool.ts`, registered in
`src/mastra/agents/release-copilot-agent.ts:28` and `src/mastra/index.ts:36`)
is a real Mastra server tool, so its result is persisted for real (not a
`"Forwarded to client"` placeholder — see `isFrontendPlaceholderResult`,
index.mjs:2115-2118). Its frontend counterpart,
`src/hooks/use-render-release-notes-preview-tool.tsx`, uses `useRenderTool`,
whose `render` callback is driven purely by the tool_call/tool-result already
present in `agent.messages` — populated by `connectAgent` regardless of
`executeFrontendTools` — so it works identically on a live run or on replay.

## Explanation

1. User pastes git-log/PR text → agent calls `showEntryList` live →
   `executeFrontendTools` defaults to `true` → `handler` runs →
   `onEntryListShown` fires → UI updates. Works.
2. User reloads the page (or opens a previously-saved thread) →
   `CopilotKitCore.connectAgent` hydrates the persisted message history,
   which still contains the `showEntryList` tool_call and its (placeholder)
   tool-result → but calls `processAgentResult` with
   `executeFrontendTools: false` → the `handler` never re-runs →
   `onEntryListShown` never fires → the entry list panel stays empty, even
   though `message.toolCalls` for that assistant message is non-empty (visible
   in devtools / component logs), because that raw array is populated
   independently of whether any handler ran.

This wasn't caught earlier because manual testing typically exercises the
live-run path (paste text, see result immediately) and doesn't reload mid-session
or resume an older thread.

## Solution

Stop relying on a `handler` (execute-once-per-live-run) for a UI-only side
effect, and instead have `showEntryList` update the UI via the tool's `render`
callback, mirroring the same, already-correct pattern used by
`renderReleaseNotesPreview`/`useRenderTool`: rendering is driven by the
tool_call's message state, which CopilotKit always hydrates on replay,
independent of `executeFrontendTools`.

Concretely: `useFrontendTool` also supports a `render` option (in addition to
`handler`) that receives `{ args, status, toolCallId, result }` and is invoked
from the same `renderToolCalls` registry/pipeline `useRenderTool` uses
(`copilotkit.addHookRenderToolCall`, only registered `if (tool.render)` —
`copilotkit-nRjRp2_5.mjs:3963`). Swapping `handler` for `render` was the
minimal change that fixes the replay path without introducing a parallel
Mastra server tool.

## Solution Details

`src/hooks/use-show-entry-list-tool.ts`:

```diff
-    handler: async (args) => {
+    render: ({ args }) => {
       const result = EntryListToolSchema.safeParse(args);
+
       if (!result.success) {
         console.warn('[showEntryList] received invalid args', result.error);
         return 'Invalid entry list — state left unchanged.';
       }
       onEntryListShown(result.data.entries);
       return 'Entry list displayed to the user.';
     },
```

The rest of the hook (schema validation, `onEntryListShown` call, tool
name/description/parameters/agentId) is unchanged — only the registration
hook (`handler` → `render`) changed, so the tool call now resolves the same
way on both a live run and a history replay.

Known follow-up risk (not addressed in this change): unlike
`use-render-release-notes-preview-tool.tsx`'s `DraftSync` component, this
`render` callback has no `status === 'inProgress'` guard and no
per-`toolCallId` dedup via `useEffect`, so `onEntryListShown` (which resets
`selectedHashes` to select-all) can fire more than once per tool call —
including with partially-streamed args — as `ToolCallRenderer` re-invokes
`render` on each `arguments`/`toolMessage` change. This didn't block
verifying the reported bug (entries now display after replay) but should be
tightened in a follow-up if flicker or selection resets are observed during
live streaming.

## Verification

- `NODE_OPTIONS="--max-old-space-size=6144" pnpm lint` — 1 pre-existing error
  (`src/services/publish-to-slack.ts:43`, empty block statement, unrelated to
  this change and not touched by it) and 2 pre-existing warnings in
  `.mastra/output/index.mjs` (build artifact). No new lint issues in
  `src/hooks/use-show-entry-list-tool.ts`.
- `NODE_OPTIONS="--max-old-space-size=6144" pnpm build` — completed
  successfully (`✓ built in 2.48s`), confirming `tsc -b` type-checks the new
  `render` callback signature against `useFrontendTool`'s types.
- Root cause confirmed by reading the installed
  `@copilotkit/core` source directly (`connectAgent` /
  `processAgentResult` / `isFrontendPlaceholderResult` in
  `node_modules/.pnpm/@copilotkit+core@1.66.4.../dist/index.mjs`) and the
  installed `@copilotkit/react-core` source (`useFrontendTool`,
  `useRenderTool`, `useRenderToolCall`, `ToolCallRenderer` in
  `node_modules/@copilotkit/react-core/dist/copilotkit-nRjRp2_5.mjs`), not
  from documentation or memory.

Note: `pnpm lint`/`pnpm build` require a larger Node heap
(`--max-old-space-size`) in this environment — the default heap OOMs on plain
`pnpm lint`. This is a pre-existing environment characteristic, unrelated to
this fix.

## Prevention

No automated test currently covers either `use-show-entry-list-tool.ts` or
`use-render-release-notes-preview-tool.tsx` (no existing hook-test pattern in
the repo to extend). A regression test would need to simulate CopilotKit's
history-replay path (`connectAgent` with `executeFrontendTools: false`)
against a tool registered via `render`, which requires mocking
`@copilotkit/react-core`'s internal registry — worth adding once a test
harness for these hooks exists, but out of scope for this fix. In the
meantime, manually verify any new frontend tool intended to affect app state
(not just live runs) by reloading the page / resuming a thread after
triggering it, not only checking the live-run path.
