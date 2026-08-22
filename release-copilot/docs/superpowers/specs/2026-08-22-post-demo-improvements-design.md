# Post-Demo Improvements — Design

Date: 2026-08-22
Status: awaiting review
Source: 7 feedback items from the practice presentation demo

## 1. Context

The demo produced 7 items: 4 UX (unsupported features, welcome screen, error
handling, suggestions) and 3 new features (multiple threads, dynamic platform
rendering via A2UI, export). Budget: 2 days.

This document settles the design for all 7, including one foundational architecture
change that 3 of them depend on.

**Per-task specs:** [`2026-08-22-post-demo-improvements/`](./2026-08-22-post-demo-improvements/00-overview-design.md)
— 10 files, each an independently mergeable branch. This document holds the *why*;
that folder holds the *how*. Read this once for context, then work from the task file
you are on.

## 2. Verified platform constraints

Two common assumptions are **wrong** for this project. Both were checked by reading
type declarations in `node_modules`, not inferred.

**The runtime is a Mastra server, not CopilotKit's `CopilotRuntime`.**
`src/mastra/index.ts:41` registers `registerCopilotKit` from `@ag-ui/mastra`.
`@copilotkit/runtime` appears only in `MASTRA_BUNDLER_EXTERNALS`; no instance is ever
constructed. Consequences:

| API | Status |
| --- | --- |
| `useThreads`, `CopilotThreadsDrawer` | Unusable. The type docs say plainly "managed by the **Intelligence platform**", and `UseThreadsInput.enabled` describes a gate for an "unlicensed `<CopilotThreadsDrawer>`". Requires CopilotKit Cloud. |
| `createA2UIMessageRenderer`, `a2uiDefaultTheme` | Cannot be activated. Docs: the renderer is "activated automatically when the runtime reports that `a2ui` is configured in **`CopilotRuntime`**". Also `@copilotkit/a2ui-renderer` is not installed (`require.resolve` fails). |
| `WildcardToolCallRender`, `useDefaultRenderTool` | Usable. |
| `useSuggestions`, `useConfigureSuggestions` | Usable, already in use. |
| `welcomeScreen` prop on `CopilotChat` | Usable, currently disabled via `welcomeScreen={false}`. |
| `useInterrupt` | Usable. |

**Conclusion:** both the thread list and A2UI have to be built by hand. Not for lack
of a library, but because both features are tied to CopilotKit's cloud product.

## 3. Architecture decision: the Platform model

### 3.1 The problem

Three layers currently hard-code exactly 3 platforms:

1. `Platform` is a 3-member `const enum` — `src/types/platform.ts`
2. `ReleaseNotesDraftSchema` has 3 required fields `github` / `appStore` /
   `googlePlay`, each carrying its own `.max()` character limit and `.describe()` —
   `src/types/release-notes-draft.ts:43-78`
3. `DRAFT_FIELD_BY_PLATFORM` is a `Record<Platform, ...>`, so the compiler forces
   exhaustiveness

**Rejected option:** replace all 3 fields with a `z.record()` or a single dynamic
array. That wipes out the per-platform `.describe()` text currently teaching the model
how to write for each store, and loses `.max()` validation — output quality would drop
on exactly the two platforms that matter most today.

The mistake in that option was **conflating "where it renders" with "what shape the
schema is"**. Moving App Store / Google Play to card rendering in the chat is a
decision about display; it does not require them to leave the schema. §3.2 separates
the two.

### 3.2 Solution: a hybrid schema, not a replacement

The key point: **render location and schema shape are independent decisions.** App
Store and Google Play move to card rendering in the chat, and that does not force them
out of the schema.

```
Left panel (Live Preview)  →  GitHub only, fixed format, PlatformTabs removed
Chat panel                 →  a card per other platform, from two merged sources
```

The schema in `src/types/release-notes-draft.ts`:

```ts
export const PlatformDraftSchema = z.object({
  platformId: z.string().min(1).describe(
    'Kebab-case identifier: slack, discord, email-customer, changelog, ' +
    'x-twitter... NEVER use this for github/app-store/google-play — those ' +
    'three have their own dedicated fields above.',
  ),
  label: z.string().min(1).describe(
    'Display name shown to the user: "Slack", "Customer Email".',
  ),
  body: z.string().min(1).describe(
    'The body for this platform. Never write a title line — the app prepends it.',
  ),
  characterLimit: z.number().int().positive().nullable().optional().describe(
    "This platform's character limit, if it has one. Omit when unlimited.",
  ),
});

export const ReleaseNotesDraftSchema = z.object({
  releaseDate: /* unchanged */,
  titleOverride: /* unchanged */,

  // The three original platforms KEEP 100% of their current .describe() and .max().
  // Only change: appStore/googlePlay go from required to optional, because they
  // are now produced on request rather than always.
  github:     z.string().min(1).describe(/* current text, verbatim */),
  appStore:   z.string().min(1).max(APP_STORE_BODY_LIMIT).optional()
                .describe(/* current text, verbatim */),
  googlePlay: z.string().min(1).max(GOOGLE_PLAY_BODY_LIMIT).optional()
                .describe(/* current text, verbatim */),

  // Only for platforms OTHER than the three above.
  platforms: z.array(PlatformDraftSchema).default([])
    .describe(
      'Variants for platforms other than the three above. An empty array is normal.',
    )
    .superRefine((list, ctx) => {
      list.forEach((p, i) => {
        // Our table beats whatever the model claims — a fabricated limit cannot pass.
        const limit = PLATFORM_CHARACTER_LIMITS[p.platformId] ?? p.characterLimit;
        if (limit && p.body.length > limit - RELEASE_TITLE_CHARACTER_BUDGET) {
          ctx.addIssue({
            code: 'custom',
            path: [i, 'body'],
            message: `Exceeds the ${limit}-character limit for ${p.platformId}.`,
          });
        }
      });
    }),
});
```

The reference table in `src/constants/release-notes.ts`:

```ts
export const PLATFORM_CHARACTER_LIMITS: Record<string, number> = {
  'app-store': APP_STORE_CHARACTER_LIMIT,
  'google-play': GOOGLE_PLAY_CHARACTER_LIMIT,
  'x-twitter': 280,
  slack: 3000,
};
```

### 3.3 The normalizer — where the two sources meet

`src/lib/release-notes/to-platform-drafts.ts`:

```ts
export const toPlatformDrafts = (draft: ReleaseNotesDraft): PlatformDraft[] => {
  const named: PlatformDraft[] = [];
  if (draft.appStore) {
    named.push({ platformId: 'app-store', label: 'App Store',
                 body: draft.appStore, characterLimit: APP_STORE_CHARACTER_LIMIT });
  }
  if (draft.googlePlay) {
    named.push({ platformId: 'google-play', label: 'Google Play',
                 body: draft.googlePlay, characterLimit: GOOGLE_PLAY_CHARACTER_LIMIT });
  }
  const taken = new Set([...named.map((p) => p.platformId), 'github']);
  const extra = draft.platforms.filter((p) => !taken.has(p.platformId));
  return [...named, ...extra];
};
```

Named fields win on a `platformId` collision — if the model slips `app-store` into the
dynamic array, that entry is dropped rather than duplicating the card. Add a dev-only
`console.warn` so the mistake surfaces and the instructions can be fixed.

`PlatformDraftCard` and `PlatformComparisonGrid` consume only `PlatformDraft[]` — they
neither know nor need to know which source it came from.

**What is NO LONGER a trade-off** (compared to the rejected wholesale-replacement
option):

- `.max()` validation: preserved for App Store / Google Play, and `superRefine` covers
  dynamic platforms — net better than today, since it now covers new platforms too
- Per-store `.describe()`: preserved verbatim
- App Store / Google Play output quality: unchanged

**The trade-offs that genuinely remain, much smaller:**

- The schema has two ways to express a platform → needs one explicit sentence in
  `PlatformDraftSchema.platformId.describe()` (present above) plus dedupe in the
  normalizer
- `DRAFT_FIELD_BY_PLATFORM` is deleted, losing the exhaustive `Record<Platform, ...>`
  type. Replaced by `toPlatformDrafts()` returning an array — type safety shifts from
  "every enum branch covered" to "callers must handle an empty array"

### 3.4 Blast radius of the Platform change

Smaller than wholesale replacement, but real. The `const enum Platform` is **not
deleted** — it is renamed to `KnownPlatformId` and narrowed in role: used only in the
normalizer and the limits table, no longer the type of the main data flow.

- `src/types/platform.ts` — `Platform` → `KnownPlatformId`, same 3 members
- `src/types/release-notes-draft.ts` — add `PlatformDraftSchema`, make `appStore` /
  `googlePlay` `.optional()`, add `platforms`, delete `DRAFT_FIELD_BY_PLATFORM`
- `src/lib/release-notes/to-platform-drafts.ts` — **new file**, the §3.3 normalizer
- `src/constants/release-notes.ts` — add `PLATFORM_CHARACTER_LIMITS`
- `src/types/slack-publish-request.ts` — `z.enum([...])` → `platformId: z.string()` +
  `label: z.string()`. Required, because dynamic platforms must be publishable too
- `src/types/confirm-slack-publish.ts` — same
- `src/mastra/api/slack-publish-route.ts` — `PLATFORM_LABELS: Record<Platform,...>`
  deleted, the label arrives with the request
- `src/lib/release-notes/release-title.ts` — `composeDraftContent(draft, platform)`
  splits into `composeGithubContent(draft)` and
  `composePlatformContent(draft, platformDraft)`
- `src/components/platform-selector/PlatformTabs.tsx` — loses its consumer once Live
  Preview drops tabs. Change the API to accept `TabItem[]` from the caller instead of
  hard-coding 3 platforms, so `SlackPublishCard` can reuse it with a dynamic list
- `src/components/release-notes/LivePreviewPanel.tsx` — drop the `platform` /
  `onPlatformChange` props
- `src/hooks/use-confirm-slack-publish-tool.tsx` — pick the platform from
  `toPlatformDrafts(draft)`
- `src/routes/DashboardPage.tsx` — drop the `platform` state
- Stories: `PlatformTabs`, `LivePreviewPanel`, `SlackPublishCard`

## 4. Per-item design

### Item 1 — Unsupported features (3 layers) · 1.5h

**Layer A — agent context.** A new hook `src/hooks/use-capabilities-context.ts` using
`useAgentContext` to list the real capabilities: classify git logs / PRs, draft release
notes, edit a draft, produce variants for other platforms, compare them, export,
publish to Slack. And to state outright what it cannot do: no direct repo access, no
git tags, no deploys, no GitHub or App Store Connect API calls, no code edits.

**Layer B — instructions.** A new section `src/mastra/instructions/unsupported.ts`,
registered in `instructions/index.ts`. The rule: when the user asks for something off
the list, say in one sentence what the app cannot do, then suggest the nearest feasible
action. No lengthy apologies, no promises about the future.

**Layer C — wildcard catch.** `useDefaultRenderTool` catches any tool call the agent
invents outside the 3 registered ones and renders a new component
`src/components/chat/UnsupportedActionCard.tsx`: the action name, one line of
explanation, an alternative. This is the safety net for cases nobody anticipated.

**Keeping the 3 layers in sync — never write the prose twice.**
`src/constants/capabilities.ts` holds structured data, not sentences:

```ts
export interface Capability { id: string; summary: string; }
export const CAPABILITIES: Capability[] = [...];
export const NON_CAPABILITIES: Capability[] = [...];  // id + why it is not possible
```

Layer B **generates** its instruction text from these two arrays via a template; layer
A passes the arrays straight through as the context value. Adding or removing a
capability means editing exactly one file, and both layers stay in sync. Layer C needs
no list — it catches by negation (any tool outside the 3 registered ones).

### Item 2 — Welcome screen + empty state · 0.7h

`src/components/chat/ChatWelcomeScreen.tsx`, passed to `CopilotChat`'s `welcomeScreen`
prop in place of the current `false` (`CopilotAssistantPanel.tsx:59`).

Content: a short heading, one line on what the app does, instructions for pasting a
`git log` with a copyable `<code>` command, and 3 clickable sample prompts (which send
a message directly). Reuses the existing `Card`, `Button`, and `MonoTag`.

**Left-panel empty state — pulled back into scope (+0.3h).** Originally out of scope,
but `Card` and `Button` already exist so the real cost is only ~0.3h, while an empty
`CommitListPanel` and `LivePreviewPanel` occupy two-thirds of the screen on open — the
most exposed spot in the demo. The best exchange rate on the entire list.

`CommitListPanel` empty: one line, "No commits yet," plus a prompt to paste a git log
in the chat — this is the real gap; today `visibleCommits.map()` over an empty array
yields a bare div. `LivePreviewPanel`: `MarkdownPreview` **already has** an empty
state, so this is a copy edit to match the flow (prompt selecting commits first), not
new work.

### Item 3 — Error handling · 2.5h

Four surfaces, plus message retry.

**A. Chat turn failure.** An error bubble in the chat with a "Retry" button.

Decoupled from the spike by a thin layer: `src/hooks/use-retry-last-message.ts`
returns `{ canRetry: boolean; retry: () => void }`. The error bubble only calls
`retry()`. Inside: use the native API if the spike finds one, otherwise resend the
user's last message content. **The call site is identical either way** — item 3A is no
longer spike-dependent.

**B. Invalid tool args.** Today `use-show-entry-list-tool.tsx:68` only calls
`console.warn` and returns `<Fragment />` — the user sees silence and assumes the app
hung. Change it to render an error card in the chat stating plainly that the agent
returned invalid data, with a button asking the agent to retry. Applies to
`use-render-release-notes-preview-tool` as well.

**C. Slack publish failure.** `SlackPublishCard` already has
`SlackPublishStatus.Failed` + `error`. Review three paths: missing `SLACK_WEBHOOK_URL`
(handled), 4xx from Slack, and timeout — add an `AbortController` timeout to
`publish-to-slack.ts`.

**D. Runtime disconnect banner.** A banner in `AppHeader` when the Mastra server is
unreachable.

No polling — costly and prone to CORS trouble. Check at exactly two moments: on mount,
and when a chat turn fails. The check does not depend on a health path existing (Mastra
may not have one): `fetch(VITE_MASTRA_SERVER_URL)` — a caught `TypeError` means
disconnected; **any HTTP response, whatever the status, means the server is alive**.

**Message retry — standardized on what chatbots normally do:** the failed message keeps
the text the user typed, the error state appears directly under their bubble, and one
"Retry" button resends that exact message. No automatic retry — the user must opt in,
so a configuration failure does not burn tokens.

### Item 4 — Staged suggestions · 0.5h (plus the 1h Platform refactor in §3.4)

`src/constants/suggestions.ts` holds 3 sets, chosen by state in
`CopilotAssistantPanel` via `useConfigureSuggestions` with deps:

| Condition | Suggestions |
| --- | --- |
| `commits.length === 0` | "Paste my git log", "How do I get a git log?", "What can this app do?" |
| commits present, `draft === null` | "Draft the release notes", "Drop the chore commits", "Explain how you classify" |
| `draft` present | "Make an App Store version", "Compare the versions", "Make it shorter" |

The third set leads straight into item 6's new feature — that is the reason for
staged-static over keeping the current fixed three.

### Item 5 — Multiple threads · 2.5h

**Data.** Expand `src/hooks/use-thread-store.ts` from a single `threadId` into:

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

Persisted to localStorage with `version: 2` + `migrate()` — **mandatory, not
optional**: existing users have a single `{ threadId }` under
`COPILOTKIT_THREAD_ID_STORAGE_KEY`. Without a migration, the first deploy loses the
thread they are working in.

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

No backend changes — chat history still lives in Mastra Memory keyed by `threadId`;
only the list is client-side. `ThreadSummary` is shaped so a future server sync can
fill it without a shape change.

**Per-thread left-panel state.** This is the expensive part. The four `useState` calls
in `DashboardPage.tsx:26-30` move into a new store
`src/hooks/use-dashboard-store.ts`:

```ts
interface DashboardThreadState {
  commits: Commit[];
  selectedHashes: string[];   // Set is not serializable — array + convert
  entries: ReleaseEntry[];
  draft: ReleaseNotesDraft | null;
}

// Record<threadId, DashboardThreadState>, persisted to localStorage
```

`DashboardPage` reads the slice for `activeThreadId`. Switching threads restores the
left panel correctly.

**A known trap and how it is handled:** `appliedToolCallIds` is a `useRef<Set>` in
`use-show-entry-list-tool.tsx:31` and
`use-render-release-notes-preview-tool.tsx:28`. The ref never resets on thread change,
so a new thread's replayed tool call can be skipped if its `toolCallId` is already in
the Set.

**Fix: delete the `useRef` entirely, do not key it by `threadId`.** Keying by threadId
still lets the Set grow without bound across a session, and it is still dedupe by
*history*. Once `use-dashboard-store` exists, the source of truth is the per-thread
persisted state — so change the dedupe condition from "have I processed this
toolCallId?" to **"does this thread's current state already match the payload?"**
Idempotent by data instead of by history: the replay bug goes away, the memory leak
goes away, and a `useRef` disappears from both hooks.

**UI.** `src/components/chat/ThreadDrawer.tsx` plus a "New chat" icon in the
`CopilotAssistantPanel` header. The drawer: threads sorted by `createdAt` descending,
active thread highlighted, each row with a rename / delete menu. Built from the
existing `Card`, `IconButton`, and `Input`.

### Item 6 — Dynamic platform rendering · 4h

Settled: **idea ③ — comparing N platforms side by side**, built on the platform cards
that §3.2 already requires.

**Part 1 — Platform cards (~2.5h).**
`src/components/release-notes/PlatformDraftCard.tsx`, rendering one
`PlatformDraftSchema`: label, body, a `1234 / 4000` counter that turns red when
exceeded, and a shared action bar (Copy, Export, Publish to Slack). Rendered in the
chat via an extended `useRenderTool` in
`use-render-release-notes-preview-tool.tsx` — when `draft.platforms.length > 0`,
render one card per entry.

**Part 2 — Comparison view (~1.5h).**
A new frontend tool `comparePlatformDrafts` in
`src/hooks/use-compare-platform-drafts-tool.tsx`:

```ts
parameters: z.object({
  platformIds: z.array(z.string().min(1)).min(2).max(4).describe(
    'The platformIds to show side by side. Take them from the current ' +
    'draft.platforms, plus "github" if the user wants the GitHub version ' +
    'in the comparison.',
  ),
  columns: z.number().int().min(1).max(4).optional().describe(
    'Number of columns. Omit to let the app choose based on how many ' +
    'platforms were requested.',
  ),
})
```

`src/components/release-notes/PlatformComparisonGrid.tsx` renders a `columns`-wide
grid — **the agent decides the column count**, which is what makes this genuine
generative UI rather than a fixed component. Two platforms → two columns; four
platforms → the agent may choose four columns or 2×2.

**An honest note about "A2UI":** this is **not** A2UI in the proper sense (the agent
emitting an entire UI tree as data from a catalog, with actions returning via
`dataContextPath`). This is generative UI at the tool-render level with a parameterized
layout. The reasons: the "consistent UI, shared actions" requirement from item 4
directly conflicts with ceding layout control to the agent; and proper A2UI requires
standing up a `CopilotRuntime` proxy in front of Mastra (~8h of infrastructure alone).
This should be stated plainly when presenting, rather than calling it A2UI.

### Item 7 — Export · 0.8h

`src/lib/export/download-text-file.ts` — a pure function taking `filename` +
`content`, creating a Blob, calling `URL.createObjectURL`, clicking a hidden anchor,
then revoking. No new dependency.

`src/lib/export/release-notes-filename.ts` — naming:
`release-notes-<platformId>-<releaseDate>.md` for GitHub (markdown), `.txt` for other
platforms (plain text).

Button placement:
- `LivePreviewPanel` — an Export button beside the existing `CopyButton`, downloading
  the GitHub version
- `PlatformDraftCard` — Export in the shared action bar
- `PlatformComparisonGrid` — one per column, reusing the same action bar

## 5. Mandatory spike — 45 minutes, start of day 1

Three unknowns that determine architecture, to be answered before writing features:

1. **Does CopilotKit v2 replay tool calls when `threadId` changes?** Test: create 2
   threads, paste a different git log in each, switch back and forth, and observe
   whether tool calls fire again and whether `toolCallId` matches. → decides whether
   item 5 grows by 2h.
2. **Is there a retry/regenerate API for a failed message?** Read the exports of
   `@copilotkit/react-core/v2` around `useAgent` and `CopilotChat`. → **no longer a
   blocker**: `use-retry-last-message.ts` (item 3A) already wraps both possibilities
   behind one interface. This only decides what goes *inside* the hook and can wait.
   If the spike runs long, drop this question first.
3. **Do in-chat tool renders survive the custom `messageView`?**
   `CopilotAssistantPanel` overrides `assistantMessage` with
   `AssistantMessageBubble`. Test a tool render returning a multi-line card. → decides
   whether item 6 has to modify `AssistantMessageBubble`.

Record the spike results at the end of this document before starting day 1.

## 6. Two-day schedule

**Day 1 (~7.75h)**

| Duration | Work |
| --- | --- |
| 0.75h | Spike, three unknowns |
| 1h | §3.2–3.4 — hybrid schema + the `toPlatformDrafts` normalizer. First, because 3 other items depend on it |
| 0.3h | **Model smoke test immediately after the refactor** — 3 real git logs, verifying the agent fills `appStore`/`googlePlay` versus `platforms` correctly. Tuning instructions is the one cost that cannot be compressed, so it has to surface on day 1, not day 2 |
| 2.5h → 0.7h remaining | Item 5 — thread store + dashboard store + ThreadDrawer. Built ahead of this schedule with a different design than originally spec'd (server-fetched thread list + Mastra `generateTitle`, not a client-side migrated list); the dashboard-store half (the expensive, "actively harmful if skipped" half) is done as of the spike wrap-up. See `03-multiple-threads-design.md` for the reconciled spec and remaining work (rename/delete) |
| 0.7h | Item 2 — welcome screen + empty state on both panels |
| 0.5h | Item 4 — staged suggestions |
| 1.5h | Item 1 — unsupported, three layers |
| 0.5h | lint + build + commit |

**Day 2 (~8.8h)**

| Duration | Work |
| --- | --- |
| 2.5h | Item 6 part 1 — PlatformDraftCard + in-chat rendering |
| 1.5h | Item 6 part 2 — comparison grid + tool |
| 0.8h | Item 7 — export, wired into 3 places |
| 2.5h | Item 3 — error handling, 4 surfaces + retry |
| 1h | End-to-end testing, lint, build |
| 0.5h | Final read of the whole diff |

**Total ~16.55h** (13.5h features + 0.75h spike + 0.3h smoke test + 1h end-to-end
testing + 0.5h lint/build + 0.5h diff read).

**Overrun defense — merge item by item, never one large branch.** Running out of time
should mean fewer features merged, not one half-finished branch that cannot ship. If
cuts are still needed, in order: item 3D (runtime banner) → item 1 layer C (wildcard) →
item 6 part 2 (comparison grid).

## 7. Risks and fallbacks

This table was updated after §3.2 moved to the hybrid schema — three output-quality
risks disappeared at once.

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| ~~Non-GitHub draft quality drops after removing per-store `.describe()`~~ | — | **Eliminated.** §3.2 keeps `appStore`/`googlePlay` with their full `.describe()` and `.max()` |
| ~~Loss of `.max()` validation~~ | — | **Eliminated.** Named fields keep `.max()`; dynamic platforms are covered by `superRefine` against `PLATFORM_CHARACTER_LIMITS` |
| Model puts `app-store` in the `platforms` array instead of the named field | Medium | The normalizer dedupes and the named field wins → no duplicate cards. Dev `console.warn` surfaces it so `platformId.describe()` can be tuned |
| Model skips `platforms` and writes the content as chat text | Medium | Reuse the formula that already works in this repo: the tool description states outright that this is the only way content reaches the UI (see `render-release-notes-preview-tool.ts:8`). The day-1 smoke test catches it immediately |
| `appliedToolCallIds` ref conflicts on thread switch | Low | Solved outright in item 5: delete the ref, dedupe by data |
| No native retry API | Low | No longer a schedule risk — `use-retry-last-message` wraps both possibilities |
| Tool render breaks layout inside the custom `messageView` | Medium | Spike question 3. If it breaks: render the card at the `CopilotChat` level instead of inside `AssistantMessageBubble`, or widen `AssistantMessageBubble` to allow full-width children |
| Thread list lost when switching browsers | High | Accepted (out of scope). `ThreadSummary`'s shape is already forward-compatible with a future server sync |
| Schedule overrun | High | Merge item by item; cut order in §6 |

## 8. Knowledge required

**CopilotKit v2 — the actual API surface of the installed version**
- How `useFrontendTool` / `useRenderTool` / `useHumanInTheLoop` /
  `useDefaultRenderTool` differ: a tool that executes client-side, a tool that only
  renders, a tool that waits for human confirmation, and a catch-all tool
- `useAgentContext` — injecting client state into the agent's context every turn,
  which is entirely different from putting it in the system prompt
- `useConfigureSuggestions` with deps — suggestions that change with React state
- The `welcomeScreen` prop and the `messageView` override
- Why `useThreads` / `CopilotThreadsDrawer` are unusable here (§2)

**Mastra**
- Memory scoping: `threadId` vs `resourceId` — where thread history lives and who
  owns it
- `registerCopilotKit` from `@ag-ui/mastra` bridging the AG-UI protocol to CopilotKit
- `registerApiRoute` for adding arbitrary HTTP routes (already used for Slack)
- The repo rule that every agent/tool/workflow must be registered in
  `src/mastra/index.ts`

**Zod in an LLM tool context**
- `.describe()` **is a prompt**, not a comment — the model reads it to know what to
  fill in. This is why §3.1 rejected replacing the whole schema with a dynamic array
- Why `z.array(z.object(...))` is easier for a model than `z.record()`: every element
  has named, describable fields, whereas record keys are free-form and undescribable
- `.max()` at the tool boundary stops bad data before it reaches the UI
- `superRefine` when a constraint depends on data rather than a constant — and the
  principle that **our reference table beats the model's self-declared number** (§3.2)

**Generative UI vs A2UI**
- Generative UI (what we are building): the agent decides content, the developer
  decides shape
- A2UI: the agent emits a UI tree as data, the client renders it from a registered
  catalog, and actions return with a `dataContextPath` pointing into a data branch
- Why "consistent UI" and "agent decides layout" are mutually exclusive goals

**React / TypeScript in this repo**
- `const enum` is compiled by esbuild into a plain object — no cross-file inlining
  (documented in `.agents/rules/code-style.md`)
- Zustand `persist` does not serialize a `Set` — use an array
- `verbatimModuleSyntax` requires `import type`, and relative imports need explicit
  `.ts` / `.tsx` extensions

## 9. Definition of Done

- [ ] `pnpm lint` clean
- [ ] `pnpm build` (`tsc -b && vite build`) clean
- [ ] The full flow works: paste a git log → select entries → draft GitHub → request
      App Store + Google Play versions → compare side by side → export each →
      publish to Slack
- [ ] Create a new thread, switch back and forth, left panel restores correctly per
      thread
- [ ] Ask the agent for something out of scope → a clear answer, nothing invented
- [ ] Stop the Mastra server → a banner appears rather than silence
- [ ] Storybook builds (`pnpm build-storybook`) — affected stories updated
- [ ] The thread-store migration works: opening the app against the old localStorage
      shape (a single `threadId`) does not lose the active thread
- [ ] Model smoke test with 3 git logs: the agent fills `appStore`/`googlePlay` in the
      named fields rather than pushing them into `platforms`
- [ ] One branch per item, merged separately, Conventional Commits (commitlint is
      enabled)

## 10. Out of scope

- Proper A2UI with `@copilotkit/a2ui-renderer` + a `CopilotRuntime` proxy
- A server-side thread list (switching browsers loses the list; history still lives in
  Mastra Memory if the `threadId` is known). `ThreadSummary`'s shape is already
  designed to be filled from a server later without a second migration
- A2UI ideas ①④⑤⑥ discussed but not chosen: an over-limit warning card with
  agent-generated actions, a dynamic platform configuration form, stat tiles
- Agent-generated dynamic suggestions (considered, rejected on token cost)

## 11. Spike results

Methodology note: verification was done by tracing the installed
`@copilotkit/core`/`@copilotkit/react-core` source and this repo's own code, the same
method the two existing bug-fix reports in `docs/bug-reports/` used
(`2026-08-19-entry-list-tool-history-replay.md`,
`2026-08-19-entry-list-render-side-effect.md`) — not a live browser click-through,
since no browser-automation tool was available in this environment. All three findings
trace an exact code path rather than assume a behavior.

**1. Tool-call replay on `threadId` change:** Replay confirmed. `CopilotChat`'s
internal effect (`copilotkit-nRjRp2_5.mjs`, the effect keyed on
`[resolvedThreadId, agent, resolvedAgentId, hasExplicitThreadId]`) calls
`copilotkit.connectAgent({ agent })` every time the `threadId` prop changes and an
explicit thread id is set — the exact same call `docs/bug-reports/2026-08-19-entry-list-tool-history-replay.md`
already traced for page-reload/history-resume
(`processAgentResult({ executeFrontendTools: false })`). So switching back to an
already-visited thread re-fires `render` for that thread's tool calls with the *same*
`toolCallId` it had before. The pre-existing `appliedToolCallIds = useRef(new Set())`
dedupe in both `use-show-entry-list-tool.tsx` and
`use-render-release-notes-preview-tool.tsx` treated "seen once" as "never sync again,"
so revisiting a thread left the left panel showing the previous thread's data — exactly
the failure task 03 warned about. Fixed directly rather than deferred: both hooks
dropped the ref-based dedupe; `src/hooks/use-dashboard-store.ts` (new, per-thread
state) now does the dedupe by comparing incoming data against that thread's stored
data, so a replay of already-current data is a no-op and a replay after switching away
and back correctly resyncs. No schedule change needed — the fix is already merged
alongside this spike, not deferred into task 03's estimate.

**2. Message retry/regenerate API:** `reloadMessages` (Lead A) is not reachable from
the `/v2` entry point — `grep -n "reloadMessages\|useCopilotChat\b"` against
`node_modules/@copilotkit/react-core/dist/v2/index.d.mts` returns nothing; it is a
root-entry (`.`) export only. `onRegenerate`/`regenerateButton` (Lead B) is real
plumbing in `CopilotChatAssistantMessage` (`copilotkit-nRjRp2_5.mjs:5899-5907`: the
button only renders when the caller passes `onRegenerate` or `regenerateButton`), but
this repo's `AssistantMessageBubble.tsx` never renders `CopilotChatAssistantMessage`
at all — it renders a custom bubble plus `CopilotChatToolCallsView` — so the slot is
present in the library but entirely unused here today; nothing regenerate-related is
wired up. Decision for `use-retry-last-message.ts` (item 3A): no native CopilotKit API
is usable as-is, so it should read the user's last message from the agent's message
list and call `sendMessage` again manually. Confirmed this does not change the hook's
call site (`{ canRetry: boolean; retry: () => void }`).

**3. Tool render inside the custom `messageView`:** Constrained. Read directly from
`AssistantMessageBubble.tsx:15` — the component's root wrapper is
`<div className="flex w-full max-w-[420px] flex-col items-start gap-3">`, and
`CopilotChatToolCallsView` (the tool-render host) is a direct child of that div
(line 33), so every tool render — including the future `PlatformDraftCard` — is capped
to 420px wide regardless of content. No height-clipping element was found (the message
list scrolls; nothing wraps the bubble in a fixed-height/`overflow:hidden` container).
Decision for task 07: use fallback option 1 from that task's spec — widen
`AssistantMessageBubble`'s wrapper (drop or override `max-w-[420px]` for tool-call
content) rather than moving rendering to the `CopilotChat` level.
