---
date: 2026-08-19
branch: fix/entry-list-tool-history-replay
commit:
files: [src/hooks/use-show-entry-list-tool.tsx, src/routes/DashboardPage.tsx]
severity: medium
---

# showEntryList synced app state from inside a render body

## Summary

`showEntryList` pushed the classified entry list into `DashboardPage` state by
calling `onEntryListShown` directly inside the tool's `render` body. Because
`render` is a React component body that CopilotKit re-invokes on every argument
chunk and status change, the sync fired repeatedly — including with
partially-streamed args — and mutated a parent component's state during another
component's render.

## Root Cause

`src/hooks/use-show-entry-list-tool.ts:46-55` (pre-fix) used `render` as a
side-effect channel:

```ts
render: ({ args }) => {
  const result = EntryListToolSchema.safeParse(args);
  if (!result.success) { /* ... */ }
  onEntryListShown(result.data.entries);       // side effect during render
  return 'Entry list displayed to the user.';  // string, not JSX
},
```

Three distinct defects:

1. **Side effect during render.** `onEntryListShown` is `DashboardPage`'s
   `setCommits`/`setSelectedHashes`/`setEntries`
   (`src/routes/DashboardPage.tsx:32-38`). Calling it while `ToolCallRenderer`
   renders updates one component from another component's render body — the React
   "Cannot update a component while rendering a different component" case.
2. **No status guard.** `ToolCallRenderer`
   (`node_modules/@copilotkit/react-core/dist/v2/headless.mjs:1453-1476`) re-invokes
   the render component for `inProgress` (partial args from `partialJSONParse`),
   `executing`, and `complete`. Every one of those invocations ran the sync, so a
   single tool call could reset `selectedHashes` several times — and could latch a
   partially-streamed subset of entries, because `partialJSONParse` repairs
   truncated JSON and a prefix ending on an entry boundary (`[{...},{...},`)
   validates cleanly against `EntryListToolSchema` with fewer entries than the model
   actually sent.
3. **Wrong return type.** `render` must return a `ReactElement`; the code returned a
   plain string.

This was already recorded as a known follow-up risk in
`docs/bug-reports/2026-08-19-entry-list-tool-history-replay.md`, whose fix (swapping
`handler` for `render`) solved history replay but left the side effect in the render
body.

## Explanation

The previous fix moved the state sync from `handler` to `render` because
`CopilotKitCore.connectAgent` replays persisted history with
`executeFrontendTools: false` (`@copilotkit/core/dist/index.mjs:1963`, `2065-2100`),
so `handler` never re-runs on reload while renderers always run. That diagnosis was
right, but `render` is not a callback — it is a component. The failure surfaces
during a live run: as the model streams `showEntryList` arguments, each new chunk
re-renders the tool call, and each re-render calls `onEntryListShown`, which rebuilds
`commits` and resets `selectedHashes` to select-all. Any checkbox toggled while the
list was still streaming got wiped, and React logged a cross-component update
warning.

It wasn't caught earlier because verification of the replay bug focused on "do the
entries appear after a reload" (they did), not on streaming behaviour during the live
run.

## Solution

Keep the single `useFrontendTool` registration and keep `render`, but make `render`
do only what a React component may do: return an element. The element is a tiny
`EntryListSync` component that performs the state sync in `useEffect`, so the write
happens after commit instead of during render. The tool call is only synced once its
arguments are final, and each `toolCallId` is applied at most once.

Alternatives considered and rejected:

- **`useComponent`.** Reading the installed source
  (`node_modules/@copilotkit/react-core/dist/v2/headless.mjs:535-548`), it is a thin
  wrapper over `useFrontendTool` whose render is `({ args }) => <Component {...args} />`
  — it forwards **only** `args`, never `status`, `result`, or `toolCallId`, and it
  accepts no `handler`. Without a completion signal there is no way to tell a
  repaired partial-args prefix from the final list (see Root Cause 2), so the panel
  would be written with intermediate subsets during streaming. It also prepends its
  own `"Use this tool to display the ... component in the chat"` sentence to the
  model-facing description. `useComponent` is the right hook when a tool call really
  only needs to draw UI from its args; this one drives app state outside the chat.
- **A separate `useRenderTool` registration.** It works mechanically — renderers live
  in one `Map` keyed by `` `${agentId}:${name}` `` (`copilotkit-nRjRp2_5.mjs:1465-1470`)
  and `useRenderToolCall` resolves them by tool-call name regardless of who executes
  the tool — and it exposes `status` as plain string literals, which sidesteps the
  enum problem described below. But it splits one client-side tool across two
  registration hooks and reads as though a server tool named `showEntryList` exists.
  In this repo `useRenderTool` is used for `renderReleaseNotesPreview`, which _is_ a
  real Mastra server tool (`src/mastra/tools/render-release-notes-preview-tool.ts`);
  reusing it for a frontend tool blurs that distinction for no benefit.

## Solution Details

`src/hooks/use-show-entry-list-tool.ts` renamed to `.tsx` (it now contains JSX); the
import in `src/routes/DashboardPage.tsx:6` updated to match, per the explicit
relative-extension rule in `.agents/rules/code-style.md`.

Sync component and per-tool-call dedupe:

```tsx
const EntryListSync = ({ toolCallId, entries, onSync }: EntryListSyncProps) => {
  useEffect(() => {
    onSync(toolCallId, entries);
  }, [toolCallId, entries, onSync]);
  return null;
};

const appliedToolCallIds = useRef(new Set<string>());

const syncEntries = useCallback(
  (toolCallId: string, entries: ReleaseEntry[]) => {
    if (appliedToolCallIds.current.has(toolCallId)) return;
    appliedToolCallIds.current.add(toolCallId);
    onEntryListShown(entries);
  },
  [onEntryListShown],
);
```

`render` now returns JSX only, and gates on completion:

```tsx
render: (props) => {
  if (props.result === undefined) {
    return <Fragment />;
  }
  const result = EntryListToolSchema.safeParse(props.args);
  if (!result.success) { /* warn */ return <Fragment />; }
  return (
    <EntryListSync
      toolCallId={props.toolCallId}
      entries={result.data.entries}
      onSync={syncEntries}
    />
  );
},
```

The guard is written against `props.result` rather than `props.status` for a
concrete reason: `ReactToolCallRenderer` types `status` as the `ToolCallStatus`
string enum from `@copilotkit/core`
(`node_modules/@copilotkit/react-core/dist/v2/headless.d.mts:271-292`), that package
is not a direct dependency and is absent from top-level `node_modules` under pnpm, so
the enum cannot be imported and `status === 'inProgress'` does not type-check against
an enum member. `result` is a valid discriminant of the same union — `undefined` for
`inProgress` and `executing`, `string` for `complete` — so the guard narrows to the
complete branch with no cast and no extra dependency (proof in Verification).

The `handler` is kept, and stays pure — it validates and returns the model-facing
result string, nothing else. Without a handler, `executeSpecificTool`
(`@copilotkit/core/dist/index.mjs:2211-2241`) leaves `handlerResult.result` at `""`
and still inserts a tool message with `content: ""`, so the model would receive an
empty tool result for a tool whose own description tells it to retry once if the call
appears to have failed. (An earlier draft of this report claimed the result would be
the `"Forwarded to client"` placeholder — that was wrong: that string is only ever
_read_ by `isFrontendPlaceholderResult` (`index.mjs:2115-2118`) and is not produced
anywhere in the installed packages; it comes from runtimes that forward tool calls to
the client, which is not this app's Mastra/AG-UI path.)

This is a real fix rather than a workaround: the sync now runs in a committed effect
(never during render), exactly once per `toolCallId`, and only against final,
fully-parsed arguments — while still firing on history replay, because renderers run
on the replayed path regardless of `executeFrontendTools`.

## Verification

- `NODE_OPTIONS="--max-old-space-size=6144" pnpm build` — succeeded, `✓ built in 1.20s`.
  This runs `tsc -b`, so it type-checks the new render signature, the `EntryListSync`
  props, and the renamed `.tsx` import in `DashboardPage`.
- Narrowing proved in both directions with a temporary probe
  (`const probe: ReleaseEntry[] = props.args.entries;`), then reverted:
  placed _after_ the `props.result === undefined` guard the build passes; placed
  _before_ it the build fails with
  `error TS2322: Type '...[] | undefined' is not assignable to type '...[]'`.
  That is the `Partial<T>` (in-progress) branch, so the guard genuinely narrows to
  `complete`.
- `NODE_OPTIONS="--max-old-space-size=6144" pnpm lint` — 1 error and 2 warnings, all
  pre-existing and unrelated: `src/services/publish-to-slack.ts:43` (`no-empty`,
  untouched by this change) and two unused-eslint-disable warnings in the
  `.mastra/output/index.mjs` build artifact. No findings in
  `src/hooks/use-show-entry-list-tool.tsx`. Same baseline as
  `2026-08-19-entry-list-tool-history-replay.md`.
- Behaviour claims were checked against installed sources, not documentation:
  `ToolCallRenderer` / `useFrontendTool` / `useRenderTool` / `useComponent` in
  `node_modules/@copilotkit/react-core/dist/v2/headless.mjs` and
  `dist/copilotkit-nRjRp2_5.mjs`; `executeSpecificTool` / `processAgentResult` /
  `isFrontendPlaceholderResult` in `@copilotkit/core/dist/index.mjs`.
- Not verified by an automated test: no test harness exists for these hooks (see
  Prevention). Live-run streaming behaviour and post-reload replay still need a manual
  pass in the running app.

## Prevention

- Rule of thumb for this codebase, now demonstrated twice by the same tool: a
  CopilotKit v2 `render` is a **React component**, not a completion callback. Any
  app-state sync driven by a tool call belongs in a `useEffect` inside a small child
  component, gated on the tool call being complete and deduped by `toolCallId` — the
  `DraftSync` / `EntryListSync` shape. A `render` that calls a setter or returns a
  non-JSX value should be treated as a review blocker.
- Hook choice for a new frontend tool: `useComponent` only when the tool call is
  purely decorative (draw something from `args`, no app state, no completion
  semantics); `useFrontendTool` with `handler` + `render` when it drives state or
  needs a real tool result; `useRenderTool` only for tools actually executed on the
  server (Mastra), which is what `renderReleaseNotesPreview` is.
- The React 19 dev-mode "Cannot update a component while rendering a different
  component" warning is the cheap detector for this class of bug; it fires in
  `pnpm dev` but not in `pnpm build`, which is why the build-only verification of the
  previous fix missed it. Exercise a live streaming run in the browser — not only a
  reload — when changing any tool renderer.
- Still no automated coverage for `use-show-entry-list-tool.tsx` or
  `use-render-release-notes-preview-tool.tsx`. A regression test would need to render a
  tool call through CopilotKit's renderer pipeline at each status and assert
  `onEntryListShown` fires exactly once, with the complete list. The assertion "called
  once per toolCallId" is the one that would have caught this.
