# Domain Hooks Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's entire client-side hook layer with a fresh set of **domain hooks** — one per feature in the product's own feature list (parser, dynamic-platform build, Slack sending, download, suggestions, multiple threads) — instead of the current hooks, which are named and shaped after individual tool-call events and are scattered across one monolithic store plus 6 hook files that only work when wired together by `DashboardPage.tsx`.

**Architecture:** Two layers, brand new, written from scratch (no edits to existing hook/store files):

1. **`src/store/`** — plain Zustand state, split into per-domain slices (`entries-slice.ts`, `draft-slice.ts`) combined into one store (`release-workspace-store.ts`), plus a standalone thread-identity store (`thread-session-store.ts`). No CopilotKit imports here — pure client state.
2. **`src/hooks/`** — domain hooks that each own one feature end-to-end: they read/write the store above, register the relevant CopilotKit primitive (`useFrontendTool` / `useRenderTool` / `useHumanInTheLoop` / `useConfigureSuggestions`), and push `useAgentContext` where the agent needs live state. Four of these hooks register a CopilotKit primitive and **must be called from exactly one place** in the component tree (documented per-hook, enforced by naming convention below); the rest are pure reads safe to call from anywhere.

The 9 existing hooks (`use-dashboard-store.ts`, `use-show-entry-list-tool.tsx`, `use-render-release-notes-preview-tool.tsx`, `use-confirm-slack-publish-tool.tsx`, `use-entry-selection-context.ts`, `use-current-draft-context.ts`, `use-thread-store.ts`, `use-threads.ts`) are **left in place, untouched, and unimported by anything after this plan lands** — the user asked to keep them for now rather than delete immediately. Task 12 lists them explicitly as orphaned so a future cleanup task can remove them once the rewrite is trusted.

**Tech Stack:** React 19, Zustand (slices pattern), TypeScript strict (`verbatimModuleSyntax`, `const enum`), CopilotKit v2 (`useFrontendTool`, `useRenderTool`, `useHumanInTheLoop`, `useAgentContext`, `useConfigureSuggestions`), TanStack Query. No test runner exists in this repo — verification gate is `pnpm lint` + `pnpm build`, plus manual smoke passes once wiring makes a task observable.

## Why this replaces [`2026-08-24-hooks-first-gap-features.md`](2026-08-24-hooks-first-gap-features.md)

That plan patched 3 new hooks onto the existing `useDashboardStore` / `use-confirm-slack-publish-tool.tsx`. The user reviewed it and asked for a full rebuild instead, for 4 concrete reasons, each mapped to a specific fix below:

| Reason given | Concrete flaw in the old design | Fix in this plan |
| --- | --- | --- |
| State organization doesn't match intent | `useDashboardStore`'s `DashboardThreadState` bundles entries, selection, draft, and (in the old plan) platform-preview into one interface — any consumer needing one slice drags in all of them | Two independent slices (`EntriesSlice`, `DraftSlice`) combined via Zustand's slices pattern — a hook that only needs entries never touches draft state |
| Don't want to patch old code | Old plan edited `use-confirm-slack-publish-tool.tsx` and `use-dashboard-store.ts` in place | Every file in this plan is newly created; the 9 old files are not opened for editing at all |
| Suspect the current 9 hooks have design issues | Hooks are named after tool-call events (`showEntryList`, `toggleHash`) instead of domains; `DashboardPage` must mount 6 of them and thread a `threadIdRef` workaround through all of them; `toCommit()` silently drops `description`/`source` | Hooks named and scoped by domain (`useCommitEntries`, `useReleaseDraft`, ...); each domain hook resolves its own current thread internally; the lossy `toCommit` mapping is preserved for UI-compatibility but called out explicitly as a known, unfixed limitation (fixing it needs a `Commit` type change + `CommitListItem` badge change, which is UI work out of scope here) |
| Feature requirements re-checked | Re-confirmed against the original feature list (parser / dynamic-platform build / Slack / download / suggestions / multiple threads) — see the domain-to-hook table below | Every domain hook is named after one line item in that list, 1:1 |

## Domain → hook map

| Feature (user's original list) | Registration hook (call exactly once) | Read-only view hook (safe anywhere) |
| --- | --- | --- |
| Commits/PRs parser | `useCommitEntries()` | `useCommitEntriesView()` |
| Build release notes dynamic platform | `useReleaseDraft()` | `useReleaseDraftView()` |
| Slack sending release | `useSlackPublish()` | — (reads `useReleaseDraftView()` internally) |
| Download | — (registers nothing) | `useReleaseExport()` — safe anywhere |
| Suggestions | `useFlowSuggestions()` | — (reads both view hooks internally) |
| Multiple threads | — (registers nothing; TanStack Query dedupes by query key) | `useThreadSession()` — safe anywhere |

## The single-call-site rule — read this before writing any task

CopilotKit's `useFrontendTool`, `useRenderTool`, `useHumanInTheLoop`, and `useConfigureSuggestions` each register one logical thing with the agent runtime. Calling the *same* one from two different mounted components at once double-registers it — this is exactly why the old code's tool-registration hooks were only ever called from `DashboardPage`, and why this rewrite keeps that same discipline, just documented explicitly instead of accidentally:

- **`useCommitEntries`, `useReleaseDraft`, `useSlackPublish`, `useFlowSuggestions`** each call exactly one of those four CopilotKit primitives. **Call each of these exactly once**, from the single call site named in its task below.
- **`useCommitEntriesView`, `useReleaseDraftView`, `useReleaseExport`, `useThreadSession`** call none of those primitives — they only read a Zustand store (or, for `useThreadSession`, a TanStack Query that dedupes by query key automatically). **These four are safe to call from as many components as needed.**
- A registration hook internally calls its own view hook to get data (e.g. `useCommitEntries` calls `useCommitEntriesView` inside itself) — that's fine, because the *view* hook registers nothing. What must never happen is a registration hook being called from two different components, or one registration hook calling *another* registration hook (which would move a second primitive to an unexpected mount point).

## Global Constraints

- Arrow functions only, no `function` declarations (`.agents/rules/code-style.md`).
- `import type` for type-only imports (`verbatimModuleSyntax`).
- Explicit `.ts`/`.tsx` extensions on relative and `@/` alias imports.
- No `any`. Use `unknown` + narrowing where needed.
- `const enum` for a fixed value set used as both type and runtime value.
- Folders kebab-case always; hook files kebab-case; `.tsx` only when the file needs JSX (tool-registration hooks that render a sync/HITL component), `.ts` otherwise.
- `pnpm lint` and `pnpm build` (`tsc -b && vite build`) must both pass clean before any task is considered done.
- No direct commits to `main`; one branch = one PR (`.agents/rules/git-rules.md`). Conventional Commits for every commit message.
- Every Mastra agent/tool/workflow/scorer must be registered in `src/mastra/index.ts` — **not applicable**: this plan is 100% client-side, no server changes.
- Tool `description` strings and `useAgentContext` description strings are copied **verbatim** from the existing hooks they replace — this rewrite changes hook architecture, not agent-facing behavior or instructions.
- Do not delete `use-dashboard-store.ts`, `use-show-entry-list-tool.tsx`, `use-render-release-notes-preview-tool.tsx`, `use-confirm-slack-publish-tool.tsx`, `use-entry-selection-context.ts`, `use-current-draft-context.ts`, `use-thread-store.ts`, or `use-threads.ts` as part of this plan — the user wants them kept for now.
- Do not create git commits or open PRs without the user's explicit go-ahead at each checkpoint — this plan writes commit commands for completeness, but confirm before running them.

---

## Branch — `refactor/domain-hooks-rewrite`

One branch: the pieces are too interdependent to ship as separate mergeable units (a store slice with no consumer isn't independently useful), but the old hooks stay functional and in place throughout, so the app is never broken mid-rewrite even across multiple commits.

### Task 1: Store layer — `src/store/`

**Files:**
- Create: `src/store/entries-slice.ts`
- Create: `src/store/draft-slice.ts`
- Create: `src/store/release-workspace-store.ts`
- Create: `src/store/thread-session-store.ts`

**Interfaces:**
- Produces: `EntriesSlice`, `EntriesThreadState`, `EMPTY_ENTRIES_THREAD_STATE`, `createEntriesSlice` (Task 4 depends on these); `DraftSlice`, `DraftThreadState`, `EMPTY_DRAFT_THREAD_STATE`, `createDraftSlice` (Task 5 depends on these); `useReleaseWorkspaceStore` (Tasks 4-5 depend on this); `useThreadSessionStore` (Task 3 depends on this).

**Why:** This is the fix for "state organization doesn't match intent" — two independent slices instead of one bundled `DashboardThreadState`, combined via Zustand's official slices pattern (each slice creator typed against the *combined* store type so the spread-composition in `release-workspace-store.ts` type-checks).

- [ ] **Step 1: Entries slice**

`src/store/entries-slice.ts`:

```ts
import type { StateCreator } from 'zustand';
import type { DraftSlice } from '@/store/draft-slice.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';

export interface EntriesThreadState {
  entries: ReleaseEntry[];
  selectedIds: string[];
}

export const EMPTY_ENTRIES_THREAD_STATE: EntriesThreadState = {
  entries: [],
  selectedIds: [],
};

export interface EntriesSlice {
  entriesByThread: Record<string, EntriesThreadState>;
  setEntries: (threadId: string, entries: ReleaseEntry[]) => void;
  toggleEntrySelection: (threadId: string, entryId: string) => void;
}

// Typed against the combined store (EntriesSlice & DraftSlice) rather than just
// EntriesSlice, per Zustand's documented slices pattern — this is what lets
// release-workspace-store.ts spread this slice and draft-slice.ts together
// with a single `set`/`get` pair. The circular type-only import with
// draft-slice.ts is expected and resolves fine at compile time.
export const createEntriesSlice: StateCreator<
  EntriesSlice & DraftSlice,
  [],
  [],
  EntriesSlice
> = (set) => ({
  entriesByThread: {},
  // Idempotent by data: a tool re-render triggered by switching back to an
  // already-visited thread carries the same entries the thread already has,
  // so this is a no-op instead of a stale reset — avoids a visible flicker.
  setEntries: (threadId, entries) =>
    set((state) => {
      const current = state.entriesByThread[threadId];
      if (current && JSON.stringify(current.entries) === JSON.stringify(entries)) {
        return state;
      }

      return {
        entriesByThread: {
          ...state.entriesByThread,
          [threadId]: {
            entries,
            selectedIds: entries.map((entry) => entry.id),
          },
        },
      };
    }),
  toggleEntrySelection: (threadId, entryId) =>
    set((state) => {
      const current = state.entriesByThread[threadId] ?? EMPTY_ENTRIES_THREAD_STATE;
      const selected = new Set(current.selectedIds);
      if (selected.has(entryId)) {
        selected.delete(entryId);
      } else {
        selected.add(entryId);
      }
      return {
        entriesByThread: {
          ...state.entriesByThread,
          [threadId]: { ...current, selectedIds: [...selected] },
        },
      };
    }),
});
```

- [ ] **Step 2: Draft slice**

`src/store/draft-slice.ts`:

```ts
import type { StateCreator } from 'zustand';
import type { EntriesSlice } from '@/store/entries-slice.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

export interface DraftThreadState {
  draft: ReleaseNotesDraft | null;
  activePlatformId: string;
}

export const EMPTY_DRAFT_THREAD_STATE: DraftThreadState = {
  draft: null,
  activePlatformId: KnownPlatformId.Github,
};

export interface DraftSlice {
  draftByThread: Record<string, DraftThreadState>;
  setDraft: (threadId: string, draft: ReleaseNotesDraft) => void;
  setActivePlatform: (threadId: string, platformId: string) => void;
}

export const createDraftSlice: StateCreator<
  EntriesSlice & DraftSlice,
  [],
  [],
  DraftSlice
> = (set) => ({
  draftByThread: {},
  setDraft: (threadId, draft) =>
    set((state) => {
      const current = state.draftByThread[threadId];
      if (current && JSON.stringify(current.draft) === JSON.stringify(draft)) {
        return state;
      }
      return {
        draftByThread: {
          ...state.draftByThread,
          [threadId]: { ...(current ?? EMPTY_DRAFT_THREAD_STATE), draft },
        },
      };
    }),
  setActivePlatform: (threadId, platformId) =>
    set((state) => {
      const current = state.draftByThread[threadId] ?? EMPTY_DRAFT_THREAD_STATE;
      if (current.activePlatformId === platformId) {
        return state;
      }
      return {
        draftByThread: {
          ...state.draftByThread,
          [threadId]: { ...current, activePlatformId: platformId },
        },
      };
    }),
});
```

- [ ] **Step 3: Combined store**

`src/store/release-workspace-store.ts`:

```ts
import { create } from 'zustand';
import { createEntriesSlice, type EntriesSlice } from '@/store/entries-slice.ts';
import { createDraftSlice, type DraftSlice } from '@/store/draft-slice.ts';

export type ReleaseWorkspaceStore = EntriesSlice & DraftSlice;

// Not persisted: entries/draft are driven by the tool-call render in
// use-commit-entries.tsx / use-release-draft.tsx, which replays from Mastra's
// own persisted history on reconnect — a second, client-side persisted copy of
// the same data is a source of drift, not safety.
export const useReleaseWorkspaceStore = create<ReleaseWorkspaceStore>()(
  (...args) => ({
    ...createEntriesSlice(...args),
    ...createDraftSlice(...args),
  }),
);
```

- [ ] **Step 4: Thread-session store**

`src/store/thread-session-store.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { COPILOTKIT_THREAD_ID_STORAGE_KEY } from '@/constants/copilotkit.ts';
import { createUUID } from '@/lib/uuid.ts';

interface ThreadSessionStoreState {
  threadId: string;
  setThreadId: (threadId: string) => void;
}

export const useThreadSessionStore = create<ThreadSessionStoreState>()(
  persist(
    (set): ThreadSessionStoreState => ({
      threadId: '',
      setThreadId: (threadId) => set({ threadId }),
    }),
    {
      name: COPILOTKIT_THREAD_ID_STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state && !state.threadId) {
          state.setThreadId(createUUID());
        }
      },
    },
  ),
);
```

- [ ] **Step 5: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean. Nothing imports these 4 files yet, so this only proves they type-check in isolation — the slices-pattern circular type import (Step 1/2) is the part most likely to surface a TS error here if something is off.

- [ ] **Step 6: Commit**

```bash
git checkout -b refactor/domain-hooks-rewrite
git add src/store/entries-slice.ts src/store/draft-slice.ts src/store/release-workspace-store.ts src/store/thread-session-store.ts
git commit -m "feat: add domain-sliced release-workspace and thread-session stores"
```

---

### Task 2: Shared derivation lib

**Files:**
- Create: `src/types/platform-option.ts`
- Create: `src/types/export-format.ts`
- Create: `src/lib/release-notes/platform-options.ts`
- Create: `src/lib/export/strip-markdown.ts`
- Create: `src/lib/export/build-export-file.ts`

**Interfaces:**
- Produces: `PlatformOption` type, `buildPlatformOptions(draft): PlatformOption[]` (Task 5, 6 depend on these); `ExportFormat` const enum, `buildExportFile(platform, entries, format): ExportFile` (Task 7 depends on these).

**Why:** Pure, framework-free functions — no React, no Zustand, no CopilotKit — so every domain hook that needs "the platform-option list for a draft" or "convert a draft to a downloadable file" calls the same function instead of re-deriving it. `PlatformOption` is intentionally the same shape as the existing `PublishOption` interface declared inline in `SlackPublishCard.tsx` (`{platformId, label, content}`) — TypeScript's structural typing means `SlackPublishCard` accepts values typed as `PlatformOption` with zero changes to that component, so this plan never touches any `.tsx` file under `src/components/`.

- [ ] **Step 1: Shared platform-option type**

`src/types/platform-option.ts`:

```ts
export interface PlatformOption {
  platformId: string;
  label: string;
  content: string;
}
```

- [ ] **Step 2: Platform-options builder**

`src/lib/release-notes/platform-options.ts`:

```ts
import { composeGithubContent, composePlatformContent } from '@/lib/release-notes/release-title.ts';
import { toPlatformDrafts } from '@/lib/release-notes/to-platform-drafts.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { PlatformOption } from '@/types/platform-option.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

// GitHub is composed separately because it takes its own path to the Live
// Preview panel; toPlatformDrafts only ever returns non-GitHub platforms.
export const buildPlatformOptions = (draft: ReleaseNotesDraft): PlatformOption[] => [
  {
    platformId: KnownPlatformId.Github,
    label: 'GitHub',
    content: composeGithubContent(draft),
  },
  ...toPlatformDrafts(draft).map((platformDraft) => ({
    platformId: platformDraft.platformId,
    label: platformDraft.label,
    content: composePlatformContent(draft, platformDraft),
  })),
];
```

- [ ] **Step 3: Export format enum**

`src/types/export-format.ts`:

```ts
export const enum ExportFormat {
  Markdown = 'markdown',
  PlainText = 'plain-text',
  Json = 'json',
}
```

- [ ] **Step 4: Markdown-stripping helper**

`src/lib/export/strip-markdown.ts`:

```ts
// Best-effort plain-text conversion for the .txt export path: strips the
// handful of Markdown constructs the agent is instructed to produce (see
// RELEASE_NOTE_FORMATTING) — headings, bold/italic emphasis, and inline code
// fences — without pulling in a full Markdown parser for one export format.
export const stripMarkdown = (markdown: string): string =>
  markdown
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '- ');
```

- [ ] **Step 5: Export-file builder**

`src/lib/export/build-export-file.ts`:

```ts
import { stripMarkdown } from '@/lib/export/strip-markdown.ts';
import { ExportFormat } from '@/types/export-format.ts';
import type { PlatformOption } from '@/types/platform-option.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';

export interface ExportFile {
  filename: string;
  mimeType: string;
  content: string;
}

const EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
  [ExportFormat.Markdown]: 'md',
  [ExportFormat.PlainText]: 'txt',
  [ExportFormat.Json]: 'json',
};

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  [ExportFormat.Markdown]: 'text/markdown',
  [ExportFormat.PlainText]: 'text/plain',
  [ExportFormat.Json]: 'application/json',
};

interface ExportSection {
  type: string;
  entries: ReleaseEntry[];
}

// Structured JSON export groups by the classification the agent already
// assigned each entry (breaking / feat / fix / any custom label) rather than
// by platform wording — the platform-specific prose in `platform.content` is
// what the markdown/plain-text exports use instead.
const buildSections = (entries: ReleaseEntry[]): ExportSection[] => {
  const breaking = entries.filter((entry) => entry.breaking);
  const nonBreaking = entries.filter((entry) => !entry.breaking);
  const typeOrder = Array.from(new Set(nonBreaking.map((entry) => entry.type)));

  return [
    { type: 'breaking', entries: breaking },
    ...typeOrder.map((type) => ({
      type,
      entries: nonBreaking.filter((entry) => entry.type === type),
    })),
  ].filter((section) => section.entries.length > 0);
};

const buildJsonContent = (
  platform: PlatformOption,
  entries: ReleaseEntry[],
): string =>
  JSON.stringify(
    { platform: platform.platformId, sections: buildSections(entries) },
    null,
    2,
  );

export const buildExportFile = (
  platform: PlatformOption,
  entries: ReleaseEntry[],
  format: ExportFormat,
): ExportFile => {
  const filename = `release-notes-${platform.platformId}.${EXTENSION_BY_FORMAT[format]}`;
  const mimeType = MIME_BY_FORMAT[format];

  if (format === ExportFormat.Json) {
    return { filename, mimeType, content: buildJsonContent(platform, entries) };
  }

  const content =
    format === ExportFormat.PlainText
      ? stripMarkdown(platform.content)
      : platform.content;

  return { filename, mimeType, content };
};
```

- [ ] **Step 6: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/types/platform-option.ts src/types/export-format.ts src/lib/release-notes/platform-options.ts src/lib/export/strip-markdown.ts src/lib/export/build-export-file.ts
git commit -m "feat: add pure platform-option and export-format derivation lib"
```

---

### Task 3: `useThreadSession` — multiple-threads domain

**Files:**
- Create: `src/hooks/use-thread-session.ts`

**Interfaces:**
- Consumes: `useThreadSessionStore` (Task 1).
- Produces: `useThreadSession(): { threadId: string; threads: ThreadSummary[] | undefined; isThreadsLoading: boolean; isThreadsError: boolean; startNewChat: () => void; selectThread: (threadId: string) => void }` — consumed by every other domain hook (Tasks 4-8) to resolve the current thread, and by `CopilotAssistantPanel` (Task 11) for the thread-list UI.

**Why:** Registers no CopilotKit primitive (only a Zustand store + a TanStack Query, which dedupes by query key on its own) — so unlike the four registration hooks, **this one is safe to call from as many places as needed**, which is exactly what every other domain hook needs to do to resolve "which thread am I in" on its own. This also absorbs the placeholder-thread cache-seeding effect that used to live inline inside `CopilotAssistantPanel.tsx` — it is thread-session behavior, not chat-panel behavior.

- [ ] **Step 1: Create the hook**

`src/hooks/use-thread-session.ts`:

```ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useThreadSessionStore } from '@/store/thread-session-store.ts';
import { listThreads } from '@/services/list-threads.ts';
import { COPILOTKIT_RESOURCE_ID } from '@/constants/copilotkit.ts';
import { createUUID } from '@/lib/uuid.ts';
import type { ThreadSummary } from '@/types/thread.ts';

const THREADS_QUERY_KEY = ['threads'];
// Threads rarely change; avoid refetching every time the dropdown reopens.
const THREADS_STALE_TIME_MS = 30_000;

interface UseThreadSessionResult {
  threadId: string;
  threads: ThreadSummary[] | undefined;
  isThreadsLoading: boolean;
  isThreadsError: boolean;
  startNewChat: () => void;
  selectThread: (threadId: string) => void;
}

// Registers no CopilotKit primitive — safe to call from any number of
// components. Every other domain hook in this plan calls this one internally
// to resolve the current thread instead of receiving threadId as a prop.
export const useThreadSession = (): UseThreadSessionResult => {
  const threadId = useThreadSessionStore((state) => state.threadId);
  const setThreadId = useThreadSessionStore((state) => state.setThreadId);
  const queryClient = useQueryClient();

  const {
    data: threads,
    isLoading: isThreadsLoading,
    isError: isThreadsError,
  } = useQuery({
    queryKey: THREADS_QUERY_KEY,
    queryFn: listThreads,
    staleTime: THREADS_STALE_TIME_MS,
  });

  // The active thread may not exist server-side yet (no message sent, title
  // not generated) — seed a placeholder so the list never shows nothing for it.
  useEffect(() => {
    if (!threadId) return;

    queryClient.setQueryData<ThreadSummary[]>(THREADS_QUERY_KEY, (current) => {
      if (current?.some((thread) => thread.id === threadId)) return current;

      const now = new Date().toISOString();
      return [
        {
          id: threadId,
          title: threadId,
          resourceId: COPILOTKIT_RESOURCE_ID,
          createdAt: now,
          updatedAt: now,
        },
        ...(current ?? []),
      ];
    });
  }, [threadId, queryClient]);

  return {
    threadId,
    threads,
    isThreadsLoading,
    isThreadsError,
    startNewChat: () => setThreadId(createUUID()),
    selectThread: setThreadId,
  };
};
```

- [ ] **Step 2: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-thread-session.ts
git commit -m "feat: add useThreadSession domain hook for multiple threads"
```

---

### Task 4: Commits/PRs parser domain — `useCommitEntries` + `useCommitEntriesView`

**Files:**
- Create: `src/hooks/use-commit-entries-view.ts`
- Create: `src/hooks/use-commit-entries.tsx`

**Interfaces:**
- Consumes: `useReleaseWorkspaceStore` (Task 1), `useThreadSession` (Task 3).
- Produces: `useCommitEntriesView(): CommitEntriesView { entries, commits, selectedIds, selectedEntries }` (safe anywhere — consumed by Task 7, Task 8); `useCommitEntries(): UseCommitEntriesResult` (`CommitEntriesView & { toggleSelection }` — single call site, Task 9).

**Why:** Splits the old `useShowEntryListTool` + `useEntrySelectionContext` + the entries half of `useDashboardStore` into one domain, matching the "Commits/PRs parser" line item. The view/registration split exists solely to satisfy the single-call-site rule: `useReleaseExport` and `useFlowSuggestions` (Tasks 7-8) need to read selected entries without re-registering the `showEntryList` tool.

- [ ] **Step 1: Read-only view**

`src/hooks/use-commit-entries-view.ts`:

```ts
import { useMemo } from 'react';
import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import { EMPTY_ENTRIES_THREAD_STATE } from '@/store/entries-slice.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import type { Commit } from '@/types/commit.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';

// Mirrors the pre-rewrite mapping in the old dashboard store 1:1, including its
// known limitation: a breaking entry's real type (feat/fix) is not preserved
// because `Commit` has one `type` field, not a separate `breaking` flag, so a
// breaking commit's badge falls back to neutral instead of showing its real
// type. Fixing that needs a `Commit` type change plus a `CommitListItem` badge
// change — UI work explicitly out of scope for this hooks-only rewrite.
const toCommit = (entry: ReleaseEntry): Commit => ({
  hash: entry.id,
  type: entry.breaking ? 'breaking' : entry.type,
  message: entry.title,
  author: entry.author,
  timestamp: entry.timestamp,
});

export interface CommitEntriesView {
  entries: ReleaseEntry[];
  commits: Commit[];
  selectedIds: string[];
  selectedEntries: ReleaseEntry[];
}

// Read-only projection of the entries slice — safe to call from any number of
// components or hooks. Tool registration lives only in useCommitEntries()
// below, which must stay a single call site; calling useFrontendTool from more
// than one mounted place would register the tool twice.
export const useCommitEntriesView = (): CommitEntriesView => {
  const { threadId } = useThreadSession();
  const threadState = useReleaseWorkspaceStore(
    (state) => state.entriesByThread[threadId] ?? EMPTY_ENTRIES_THREAD_STATE,
  );

  const commits = useMemo(
    () => threadState.entries.map(toCommit),
    [threadState.entries],
  );
  const selectedIdSet = new Set(threadState.selectedIds);
  const selectedEntries = threadState.entries.filter((entry) =>
    selectedIdSet.has(entry.id),
  );

  return {
    entries: threadState.entries,
    commits,
    selectedIds: threadState.selectedIds,
    selectedEntries,
  };
};
```

- [ ] **Step 2: Registration hook**

`src/hooks/use-commit-entries.tsx`:

```tsx
import { Fragment, useEffect, useRef } from 'react';
import { useFrontendTool, useAgentContext } from '@copilotkit/react-core/v2';
import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import {
  useCommitEntriesView,
  type CommitEntriesView,
} from '@/hooks/use-commit-entries-view.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { SHOW_ENTRY_LIST_TOOL_NAME } from '@/constants/tools.ts';
import { joinLines } from '@/lib/text.ts';
import { EntryListToolSchema, type ReleaseEntry } from '@/types/release-entry.ts';

interface EntryListSyncProps {
  entries: ReleaseEntry[];
  onSync: (entries: ReleaseEntry[]) => void;
}

const EntryListSync = ({ entries, onSync }: EntryListSyncProps) => {
  useEffect(() => {
    onSync(entries);
  }, [entries, onSync]);
  return null;
};

export interface UseCommitEntriesResult extends CommitEntriesView {
  toggleSelection: (entryId: string) => void;
}

// Owns the "Commits/PRs parser" domain end to end: registers the showEntryList
// frontend tool — SINGLE CALL SITE, see Task 9 — and returns the full
// parsed/selected state via useCommitEntriesView underneath. Any OTHER hook or
// component that only needs to read entries/selection must call
// useCommitEntriesView() instead of this one.
export const useCommitEntries = (): UseCommitEntriesResult => {
  const { threadId } = useThreadSession();
  // useFrontendTool registers its `render` closure once and reuses it across
  // renders — a callback that closed over `threadId` directly would keep
  // reporting the thread that was active when the tool was first registered.
  // Read the current thread through a ref instead. (This is NOT needed for
  // plain event handlers like toggleSelection below, which are recreated fresh
  // every render and always see the current threadId.)
  const threadIdRef = useRef(threadId);
  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const view = useCommitEntriesView();
  const setEntries = useReleaseWorkspaceStore((state) => state.setEntries);
  const toggleEntrySelection = useReleaseWorkspaceStore(
    (state) => state.toggleEntrySelection,
  );

  useFrontendTool({
    name: SHOW_ENTRY_LIST_TOOL_NAME,
    description: joinLines(
      'The only way the classified entry list reaches the UI — call it',
      'once classification is decided (see the system instructions for',
      'when that is); never describe entries as chat text, a table, or a',
      'list instead of calling this tool.',
      'For a "commit"-sourced entry missing a required field, suggest a',
      "corrected `git log` command built from that field's own",
      'description rather than guessing.',
      'Call it exactly once per batch with the complete list of entries —',
      'never split one batch across multiple calls, and never call it again',
      'for the same batch unless the user pastes new or corrected text.',
      'If the call fails, retry it exactly once before telling the user',
      'something went wrong.',
    ),
    parameters: EntryListToolSchema,
    agentId: RELEASE_COPILOT_AGENT_ID,
    render: (props) => {
      if (props.result === undefined) {
        return <Fragment />;
      }

      const result = EntryListToolSchema.safeParse(props.args);

      if (!result.success) {
        console.warn('[useCommitEntries] received invalid args', result.error);
        return <Fragment />;
      }

      return (
        <EntryListSync
          entries={result.data.entries}
          onSync={(entries) => setEntries(threadIdRef.current, entries)}
        />
      );
    },
  });

  useAgentContext({
    description: joinLines(
      'The entries currently checked in the commit list panel — live state the',
      'user can change between turns, not a snapshot of what they pasted.',
      'These, and only these, are the entries a draft may include: an unchecked',
      'entry is out of the pipeline, not merely hidden. An empty array means',
      'the user has selected nothing yet, which is not the same as having no',
      'commits — ask them to pick at least one instead of drafting.',
    ),
    value: { entries: view.selectedEntries },
  });

  return {
    ...view,
    toggleSelection: (entryId: string) => toggleEntrySelection(threadId, entryId),
  };
};
```

- [ ] **Step 3: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-commit-entries-view.ts src/hooks/use-commit-entries.tsx
git commit -m "feat: add useCommitEntries domain hook for the parser feature"
```

---

### Task 5: Build dynamic-platform domain — `useReleaseDraft` + `useReleaseDraftView`

**Files:**
- Create: `src/hooks/use-release-draft-view.ts`
- Create: `src/hooks/use-release-draft.tsx`

**Interfaces:**
- Consumes: `useReleaseWorkspaceStore` (Task 1), `useThreadSession` (Task 3), `buildPlatformOptions`/`PlatformOption` (Task 2).
- Produces: `useReleaseDraftView(): ReleaseDraftView { draft, options, activePlatformId, activeContent, setActivePlatform }` (safe anywhere — consumed by Task 6, 7, 8); `useReleaseDraft(): ReleaseDraftView` (single call site, Task 9 — identical return shape, but registers the render tool).

**Why:** This is App Inventory §6.2's fix — `activeContent` makes any rendered platform's content (not just GitHub) available to whichever UI shows it. `setActivePlatform` is exposed from the *view* hook (not gated behind the single-call-site rule) because it only dispatches a store action — it registers nothing, so it's safe to call from anywhere, including a future `PlatformTabs` wiring that this plan does not build.

- [ ] **Step 1: Read-only view**

`src/hooks/use-release-draft-view.ts`:

```ts
import { useMemo } from 'react';
import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import { EMPTY_DRAFT_THREAD_STATE } from '@/store/draft-slice.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { buildPlatformOptions } from '@/lib/release-notes/platform-options.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { PlatformOption } from '@/types/platform-option.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

export interface ReleaseDraftView {
  draft: ReleaseNotesDraft | null;
  options: PlatformOption[];
  activePlatformId: string;
  activeContent: string | null;
  setActivePlatform: (platformId: string) => void;
}

// Read-only projection of the draft slice — safe to call from any number of
// components or hooks. Tool registration lives only in useReleaseDraft()
// below, which must stay a single call site; calling useRenderTool from more
// than one mounted place would register the tool twice. setActivePlatform is
// exposed here (not gated behind the single-call-site rule) because it only
// dispatches a store action — it registers nothing with CopilotKit.
export const useReleaseDraftView = (): ReleaseDraftView => {
  const { threadId } = useThreadSession();
  const threadState = useReleaseWorkspaceStore(
    (state) => state.draftByThread[threadId] ?? EMPTY_DRAFT_THREAD_STATE,
  );
  const setActivePlatformAction = useReleaseWorkspaceStore(
    (state) => state.setActivePlatform,
  );

  // Falls back to GitHub when the thread's stored activePlatformId no longer
  // matches any option in the current draft (e.g. a redraft dropped a dynamic
  // platform the user had been viewing).
  const options = useMemo(
    () => (threadState.draft ? buildPlatformOptions(threadState.draft) : []),
    [threadState.draft],
  );
  const activePlatformId = options.some(
    (option) => option.platformId === threadState.activePlatformId,
  )
    ? threadState.activePlatformId
    : KnownPlatformId.Github;
  const activeContent =
    options.find((option) => option.platformId === activePlatformId)?.content ??
    null;

  return {
    draft: threadState.draft,
    options,
    activePlatformId,
    activeContent,
    setActivePlatform: (platformId: string) =>
      setActivePlatformAction(threadId, platformId),
  };
};
```

- [ ] **Step 2: Registration hook**

`src/hooks/use-release-draft.tsx`:

```tsx
import { Fragment, useEffect, useRef } from 'react';
import { useRenderTool, useAgentContext } from '@copilotkit/react-core/v2';
import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import {
  useReleaseDraftView,
  type ReleaseDraftView,
} from '@/hooks/use-release-draft-view.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME } from '@/constants/tools.ts';
import { joinLines } from '@/lib/text.ts';
import {
  ReleaseNotesDraftSchema,
  type ReleaseNotesDraft,
} from '@/types/release-notes-draft.ts';

interface DraftSyncProps {
  draft: ReleaseNotesDraft;
  onSync: (draft: ReleaseNotesDraft) => void;
}

const DraftSync = ({ draft, onSync }: DraftSyncProps) => {
  useEffect(() => {
    onSync(draft);
  }, [draft, onSync]);
  return null;
};

// Owns the "Build release notes dynamic platform" domain end to end: registers
// the renderReleaseNotesPreview render tool — SINGLE CALL SITE, see Task 9 —
// and returns the full draft view via useReleaseDraftView underneath. Any
// OTHER hook or component that only needs to read the draft/platform content
// must call useReleaseDraftView() instead of this one.
export const useReleaseDraft = (): ReleaseDraftView => {
  const { threadId } = useThreadSession();
  const threadIdRef = useRef(threadId);
  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const view = useReleaseDraftView();
  const setDraft = useReleaseWorkspaceStore((state) => state.setDraft);

  useRenderTool({
    name: RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME,
    parameters: ReleaseNotesDraftSchema,
    agentId: RELEASE_COPILOT_AGENT_ID,
    render: (props) => {
      if (props.status === 'inProgress') {
        return <Fragment />;
      }

      return (
        <DraftSync
          draft={props.parameters}
          onSync={(draft) => setDraft(threadIdRef.current, draft)}
        />
      );
    },
  });

  useAgentContext({
    description: joinLines(
      'The release-notes draft currently shown in the Live Preview panel — the',
      'exact text an edit request applies to, and the text the Slack card will',
      'post. null means no draft has been generated yet. The title line is not',
      'part of these bodies: the app builds it from releaseDate/titleOverride.',
    ),
    value: { draft: view.draft },
  });

  return view;
};
```

- [ ] **Step 3: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-release-draft-view.ts src/hooks/use-release-draft.tsx
git commit -m "feat: add useReleaseDraft domain hook for dynamic-platform drafting"
```

---

### Task 6: Slack sending domain — `useSlackPublish`

**Files:**
- Create: `src/hooks/use-slack-publish.tsx`

**Interfaces:**
- Consumes: `useReleaseDraftView` (Task 5 — **not** `useReleaseDraft`, see warning below).
- Produces: `useSlackPublish(): void` (single call site, Task 9).

**Why:** Matches the "Slack sending release" line item. This hook must import `useReleaseDraftView`, never `useReleaseDraft` — importing the registration hook here would register the render tool a second time the moment `DashboardPage` also calls `useReleaseDraft()` directly for the Live Preview panel.

- [ ] **Step 1: Create the hook**

`src/hooks/use-slack-publish.tsx`:

```tsx
import { Fragment, useEffect, useState } from 'react';
import { useHumanInTheLoop } from '@copilotkit/react-core/v2';
import SlackPublishCard, {
  SlackPublishStatus,
} from '@/components/release-notes/SlackPublishCard.tsx';
import { useReleaseDraftView } from '@/hooks/use-release-draft-view.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { CONFIRM_SLACK_PUBLISH_TOOL_NAME } from '@/constants/tools.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { joinLines } from '@/lib/text.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { PlatformOption } from '@/types/platform-option.ts';
import { ConfirmSlackPublishSchema } from '@/types/confirm-slack-publish.ts';

interface PublishFlowProps {
  options: PlatformOption[];
  initialPlatformId: string | undefined;
  respond: (result: unknown) => Promise<void>;
}

const RespondOnMount = ({
  message,
  respond,
}: {
  message: string;
  respond: (result: unknown) => Promise<void>;
}) => {
  useEffect(() => {
    void respond(message);
  }, [message, respond]);
  return <Fragment />;
};

const PublishFlow = ({ options, initialPlatformId, respond }: PublishFlowProps) => {
  // Freeze the option list at mount: the user must send exactly what they
  // reviewed in the card, even if the draft changes again before they click.
  const [confirmedOptions] = useState(options);
  const [platformId, setPlatformId] = useState(
    confirmedOptions.some((option) => option.platformId === initialPlatformId)
      ? (initialPlatformId as string)
      : KnownPlatformId.Github,
  );
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );
  const [error, setError] = useState<string | null>(null);

  const selected =
    confirmedOptions.find((option) => option.platformId === platformId) ??
    confirmedOptions[0];

  const handleSend = async () => {
    setStatus(SlackPublishStatus.Sending);
    setError(null);

    const result = await publishToSlack({
      platformId: selected.platformId,
      label: selected.label,
      content: selected.content,
    });

    if (result.ok) {
      setStatus(SlackPublishStatus.Sent);
      await respond(`Posted the ${selected.label} release notes to Slack.`);
      return;
    }

    setStatus(SlackPublishStatus.Failed);
    setError(result.error ?? 'Publishing failed.');
  };

  const handleCancel = async () => {
    setStatus(SlackPublishStatus.Cancelled);
    await respond('User declined — nothing was posted to Slack.');
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(selected.content);
  };

  return (
    <SlackPublishCard
      options={confirmedOptions}
      selectedPlatformId={selected.platformId}
      preview={selected.content}
      status={status}
      error={error}
      onPlatformChange={setPlatformId}
      onCopy={handleCopy}
      onSend={() => void handleSend()}
      onCancel={() => void handleCancel()}
    />
  );
};

// Owns the "Slack sending release" domain end to end: reads the current draft
// via useReleaseDraftView() — the safe read-only projection; this hook must
// NEVER import useReleaseDraft(), which would register the render tool a
// second time — and registers the confirmSlackPublish human-in-the-loop tool.
// SINGLE CALL SITE, see Task 9.
export const useSlackPublish = (): void => {
  const { draft, options } = useReleaseDraftView();

  useHumanInTheLoop(
    {
      name: CONFIRM_SLACK_PUBLISH_TOOL_NAME,
      description: joinLines(
        'Ask the user whether to announce the finished release notes in the',
        'team Slack channel. Never pass the notes themselves — the card reads the',
        'draft the render-preview tool already produced, so it always shows',
        'exactly what the user is looking at. Calling this posts nothing by',
        'itself: it shows a confirmation card and waits for the user to click',
        'Send or Cancel. Call it exactly once per draft or edit, immediately',
        'after the render-preview tool call. Never call it before a draft',
        'exists, never call it twice for the same draft, and never claim',
        'anything was posted — the result this tool returns is the only source of',
        'truth for what happened.',
      ),
      parameters: ConfirmSlackPublishSchema,
      agentId: RELEASE_COPILOT_AGENT_ID,
      render: (props) => {
        if (props.status === 'inProgress') {
          return <Fragment />;
        }

        if (props.status === 'complete') {
          return (
            <span className="text-body-md text-on-surface-variant">
              {props.result}
            </span>
          );
        }

        if (!draft) {
          return (
            <RespondOnMount
              message="No draft exists yet — nothing was shown and nothing was posted."
              respond={props.respond}
            />
          );
        }

        return (
          <PublishFlow
            options={options}
            initialPlatformId={props.args.platformId}
            respond={props.respond}
          />
        );
      },
    },
    [draft, options],
  );
};
```

- [ ] **Step 2: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-slack-publish.tsx
git commit -m "feat: add useSlackPublish domain hook"
```

---

### Task 7: Download domain — `useReleaseExport`

**Files:**
- Create: `src/hooks/use-release-export.ts`

**Interfaces:**
- Consumes: `useCommitEntriesView` (Task 4), `useReleaseDraftView` (Task 5), `buildExportFile`/`ExportFormat` (Task 2).
- Produces: `useReleaseExport(): { canExport: boolean; exportDraft: (options: { format: ExportFormat }) => void }` — consumed by Task 10.

**Why:** App Inventory §6.4 — no export code exists at all today. Registers no CopilotKit primitive, so this hook is safe to call from more than one place if a future UI needs it in two spots. Uses a real Blob + object-URL + transient `<a download>` element — this is a real Vite app in a real browser, not a sandboxed artifact preview, so this download pattern works normally.

- [ ] **Step 1: Create the hook**

`src/hooks/use-release-export.ts`:

```ts
import { useCommitEntriesView } from '@/hooks/use-commit-entries-view.ts';
import { useReleaseDraftView } from '@/hooks/use-release-draft-view.ts';
import { buildExportFile } from '@/lib/export/build-export-file.ts';
import { ExportFormat } from '@/types/export-format.ts';

interface ExportOptions {
  format: ExportFormat;
}

interface UseReleaseExportResult {
  canExport: boolean;
  exportDraft: (options: ExportOptions) => void;
}

// Owns the "Download" domain: reads the active platform content and selected
// entries via the two read-only view hooks, converts to the requested format,
// and triggers a real browser download. Registers no CopilotKit primitives —
// unlike useCommitEntries/useReleaseDraft/useSlackPublish/useFlowSuggestions,
// this hook is safe to call from more than one component.
export const useReleaseExport = (): UseReleaseExportResult => {
  const { selectedEntries } = useCommitEntriesView();
  const { options, activePlatformId } = useReleaseDraftView();

  const activeOption = options.find(
    (option) => option.platformId === activePlatformId,
  );

  const exportDraft = ({ format }: ExportOptions): void => {
    if (!activeOption) return;

    const file = buildExportFile(activeOption, selectedEntries, format);
    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return { canExport: Boolean(activeOption), exportDraft };
};
```

- [ ] **Step 2: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-release-export.ts
git commit -m "feat: add useReleaseExport domain hook"
```

---

### Task 8: Suggestions domain — `useFlowSuggestions`

**Files:**
- Create: `src/hooks/use-flow-suggestions.ts`

**Interfaces:**
- Consumes: `useCommitEntriesView` (Task 4), `useReleaseDraftView` (Task 5).
- Produces: `useFlowSuggestions(): void` (single call site, Task 11).

**Why:** App Inventory §6.5 — the old suggestions were 3 static edit-actions shown `available: 'always'`, even before anything had been parsed. This reads real flow state through the two safe view hooks (no duplicate registration risk) and stages the suggestion list to match the user's original spec: nothing parsed → prompt to paste; parsed but no draft → prompt to build; draft exists → offer edits and publishing.

- [ ] **Step 1: Create the hook**

`src/hooks/use-flow-suggestions.ts`:

```ts
import { useConfigureSuggestions } from '@copilotkit/react-core/v2';
import { useCommitEntriesView } from '@/hooks/use-commit-entries-view.ts';
import { useReleaseDraftView } from '@/hooks/use-release-draft-view.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';

const PARSE_STAGE_SUGGESTIONS = [
  {
    title: 'Paste a git log',
    message: 'Here is my git log, please classify it:',
  },
  {
    title: 'Paste a PR title',
    message: 'Here is a PR to classify:',
  },
];

const SELECT_STAGE_SUGGESTIONS = [
  { title: 'Draft for GitHub', message: 'Draft release notes for GitHub' },
  {
    title: 'Draft for all platforms',
    message: 'Draft release notes for GitHub, App Store, and Google Play',
  },
];

const DRAFT_STAGE_SUGGESTIONS = [
  { title: 'Make it shorter', message: 'Make it shorter' },
  { title: 'Translate to VI', message: 'Translate to VI' },
  { title: 'Post to Slack', message: 'Post the release notes to Slack' },
];

// Owns the "Suggestions" domain: reads entries/draft via the two read-only
// view hooks and registers useConfigureSuggestions — SINGLE CALL SITE, see
// Task 11. Guides the user through the flow one stage at a time: nothing
// parsed yet -> prompt for input; parsed but no draft -> prompt to build;
// draft exists -> offer edits and publishing. Never mixes stages, so the
// suggestion list always points at the single next action.
export const useFlowSuggestions = (): void => {
  const { entries } = useCommitEntriesView();
  const { draft } = useReleaseDraftView();

  const suggestions =
    entries.length === 0
      ? PARSE_STAGE_SUGGESTIONS
      : draft === null
        ? SELECT_STAGE_SUGGESTIONS
        : DRAFT_STAGE_SUGGESTIONS;

  useConfigureSuggestions({
    consumerAgentId: RELEASE_COPILOT_AGENT_ID,
    suggestions,
    available: 'always',
  });
};
```

- [ ] **Step 2: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-flow-suggestions.ts
git commit -m "feat: add useFlowSuggestions domain hook"
```

---

### Task 9: Wire `DashboardPage.tsx`

**Files:**
- Modify: `src/routes/DashboardPage.tsx`

**Interfaces:**
- Consumes: `useCommitEntries` (Task 4), `useReleaseDraft` (Task 5), `useSlackPublish` (Task 6) — **the single call site for all three.**

**Why:** This is where the "`DashboardPage` is a bottleneck" flaw actually gets fixed — not by moving the awkward parts elsewhere, but by encapsulating them inside the domain hooks that need them. `DashboardPage` no longer manages a `threadIdRef`, no longer reads a shared `EMPTY_DASHBOARD_THREAD_STATE`, and no longer threads `draft`/`entries`/`selectedHashes` between 6 separately-wired hooks — it calls 3 domain hooks and passes their already-shaped output straight to the existing components.

- [ ] **Step 1: Replace the file**

Replace the full content of `src/routes/DashboardPage.tsx` with:

```tsx
import CommitListPanel from '@/components/commit-list/CommitListPanel.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import SplitPane from '@/layouts/SplitPane.tsx';
import { useCommitEntries } from '@/hooks/use-commit-entries.tsx';
import { useReleaseDraft } from '@/hooks/use-release-draft.tsx';
import { useSlackPublish } from '@/hooks/use-slack-publish.tsx';

const DashboardPage = () => {
  const { commits, selectedIds, toggleSelection } = useCommitEntries();
  const { activeContent } = useReleaseDraft();
  useSlackPublish();

  const selectedHashes = new Set(selectedIds);

  const handleCopy = () => {
    if (!activeContent) return;
    void navigator.clipboard.writeText(activeContent);
  };

  return (
    <SplitPane
      leftWidthPercent={65}
      left={
        <div className="flex flex-col gap-6">
          <CommitListPanel
            commits={commits}
            selectedHashes={selectedHashes}
            onToggle={toggleSelection}
          />
          <LivePreviewPanel markdown={activeContent} onCopy={handleCopy} />
        </div>
      }
      right={<CopilotAssistantPanel />}
    />
  );
};

export default DashboardPage;
```

- [ ] **Step 2: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean. `CommitListPanel` still receives `Commit[]`/`Set<string>`/`(hash: string) => void` exactly as before — its prop types are unchanged, so this compiles without touching that component.

- [ ] **Step 3: Commit**

```bash
git add src/routes/DashboardPage.tsx
git commit -m "refactor: wire DashboardPage to the new domain hooks"
```

---

### Task 10: Wire `App.tsx` — Export button

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useReleaseExport` (Task 7).

**Why:** App Inventory §6.4 — the Export button has never had an `onClick`. `Button` (`src/components/common/Button.tsx`) already spreads native `ButtonHTMLAttributes`, including `disabled` and `onClick`, and already styles `disabled:opacity-50` — so this is a pure wiring change, zero UI component edits.

- [ ] **Step 1: Replace the file**

Replace the full content of `src/App.tsx` with:

```tsx
import { useState } from 'react';
import { Download, HelpCircle, Settings } from 'lucide-react';
import AppShell from '@/layouts/AppShell.tsx';
import { AppNav } from '@/layouts/AppHeader.tsx';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import Avatar from '@/components/common/Avatar.tsx';
import DashboardPage from '@/routes/DashboardPage.tsx';
import { useReleaseExport } from '@/hooks/use-release-export.ts';
import { ExportFormat } from '@/types/export-format.ts';

const HeaderActions = () => {
  const { canExport, exportDraft } = useReleaseExport();

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={ButtonVariant.Primary}
        className="flex items-center gap-2"
        disabled={!canExport}
        onClick={() => exportDraft({ format: ExportFormat.Markdown })}
      >
        <Download className="size-4" aria-hidden="true" />
        Export
      </Button>
      <IconButton icon={<Settings className="size-5" />} aria-label="Settings" />
      <IconButton icon={<HelpCircle className="size-5" />} aria-label="Help" />
      <Avatar name="You" />
    </div>
  );
};

const App = () => {
  const [activeNav, setActiveNav] = useState<AppNav>(AppNav.Dashboard);

  return (
    <AppShell
      activeNav={activeNav}
      onNavigate={setActiveNav}
      headerActions={<HeaderActions />}
    >
      {activeNav === AppNav.Dashboard ? (
        <DashboardPage />
      ) : (
        <div className="text-body-md text-on-surface-variant">
          History is coming soon.
        </div>
      )}
    </AppShell>
  );
};

export default App;
```

- [ ] **Step 2: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire Export button to useReleaseExport"
```

---

### Task 11: Wire `CopilotAssistantPanel.tsx`

**Files:**
- Modify: `src/components/chat/CopilotAssistantPanel.tsx`

**Interfaces:**
- Consumes: `useThreadSession` (Task 3), `useFlowSuggestions` (Task 8) — **the single call site for `useFlowSuggestions`.**

**Why:** Replaces the old `useThreadStore` + `useThreads` + inline cache-seeding effect with the one `useThreadSession` call, and replaces the static suggestion list with `useFlowSuggestions()`.

- [ ] **Step 1: Replace the file**

Replace the full content of `src/components/chat/CopilotAssistantPanel.tsx` with:

```tsx
import { forwardRef, useState } from 'react';
import {
  CopilotChat,
  type CopilotChatAssistantMessage,
  type CopilotChatUserMessage,
} from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import { useClickOutside } from '@/hooks/use-click-outside.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { useFlowSuggestions } from '@/hooks/use-flow-suggestions.ts';
import AssistantMessageBubble from './AssistantMessageBubble.tsx';
import ThreadListDropdown from './ThreadListDropdown.tsx';
import UserMessageBubble from './UserMessageBubble.tsx';

// TODO: Will add custom suggestion view later
const HideSuggestionView = forwardRef(function Component() {
  return null;
});

const CopilotAssistantPanel = () => {
  const {
    threadId,
    threads,
    isThreadsLoading,
    isThreadsError,
    startNewChat,
    selectThread,
  } = useThreadSession();
  const [isThreadListOpen, setIsThreadListOpen] = useState(false);

  const handleToggleThreadList = () => setIsThreadListOpen((open) => !open);
  const handleCloseThreadList = () => setIsThreadListOpen(false);
  const handleSelectThread = (selectedThreadId: string) => {
    selectThread(selectedThreadId);
    setIsThreadListOpen(false);
  };

  const threadListRef = useClickOutside<HTMLSpanElement>(
    isThreadListOpen,
    handleCloseThreadList,
  );

  useFlowSuggestions();

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
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={startNewChat}
            className="text-label-sm rounded border px-2 py-1"
          >
            New Chat
          </button>
          <span ref={threadListRef} className="relative">
            <button
              type="button"
              onClick={handleToggleThreadList}
              className="text-label-sm rounded border px-2 py-1"
            >
              List chats
            </button>
            {isThreadListOpen && (
              <ThreadListDropdown
                threads={threads}
                activeThreadId={threadId}
                isLoading={isThreadsLoading}
                isError={isThreadsError}
                onSelect={handleSelectThread}
              />
            )}
          </span>
        </span>
        {/* TODO: Re-open in the future */}
        {/* <button
          type="button"
          onClick={() => agent.setMessages([])}
          className="text-label-sm text-on-surface-variant hover:text-on-surface flex cursor-pointer items-center gap-1"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Clear
        </button> */}
      </div>
      <CopilotChat
        agentId={RELEASE_COPILOT_AGENT_ID}
        threadId={threadId}
        className="min-h-0 flex-1"
        welcomeScreen={false}
        labels={{ chatInputPlaceholder: 'Ask Copilot to refine notes...' }}
        messageView={{
          assistantMessage:
            AssistantMessageBubble as typeof CopilotChatAssistantMessage,
          userMessage: UserMessageBubble as typeof CopilotChatUserMessage,
          className: 'flex flex-row gap-4 py-4 h-full',
        }}
        suggestionView={HideSuggestionView}
      />
    </div>
  );
};

export default CopilotAssistantPanel;
```

(The commented-out "Clear" button block and the "custom suggestion view" TODO are pre-existing dead code, preserved verbatim — not part of this rewrite's scope.)

- [ ] **Step 2: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/CopilotAssistantPanel.tsx
git commit -m "refactor: wire CopilotAssistantPanel to useThreadSession and useFlowSuggestions"
```

Open a PR for `refactor/domain-hooks-rewrite` once Task 12 also passes — do not merge without the user's review.

---

## Task 12: End-to-end verification, orphaned files, doc update

**Files:** none created/modified beyond documentation.

- [ ] **Step 1: Full lint + build**

```bash
pnpm lint && pnpm build
```

Expected: clean. This is the first point where every new file is actually exercised together (Tasks 1-8 only proved each file type-checks in isolation).

- [ ] **Step 2: Cross-feature manual pass**

With `pnpm dev:mastra` (terminal 1) and `pnpm dev` (terminal 2) both running:

1. **New Chat** → confirm suggestion chips read "Paste a git log" / "Paste a PR title" (parse stage).
2. Paste a git log, let it classify → confirm `showEntryList` still renders the commit list correctly, and suggestions switch to "Draft for GitHub" / "Draft for all platforms" (select stage).
3. Ask for a draft covering all 3 platforms → confirm Live Preview shows the GitHub body (unchanged from before this rewrite), Export button becomes enabled, and suggestions switch to "Make it shorter" / "Translate to VI" / "Post to Slack" (draft stage).
4. Click **Export** → confirm a `release-notes-github.md` file downloads containing the GitHub draft body.
5. Ask to post to Slack → confirm the confirmation card renders with platform tabs and the correct preview, Send actually posts (if `SLACK_WEBHOOK_URL` is configured) or Cancel correctly dismisses.
6. Uncheck a commit in the list → confirm the selection context sent to the agent updates (ask the agent "what commits are currently selected?" and confirm it excludes the unchecked one).
7. Click **New Chat**, then **List chats** → confirm the previous thread appears and reopening it restores its entries/draft (this exercises `useThreadSession`'s replay-from-history behavior, unchanged from the old `useThreadStore`/`useThreads`).

- [ ] **Step 3: Orphaned files — do not delete without separate confirmation**

The following files are no longer imported by anything after this plan lands. They are **intentionally left in place** per the user's request. `pnpm build`/`pnpm lint` will not flag them (TypeScript type-checks all files in the program regardless of import graph; this repo's ESLint config has no unused-module rule):

```
src/hooks/use-dashboard-store.ts
src/hooks/use-show-entry-list-tool.tsx
src/hooks/use-render-release-notes-preview-tool.tsx
src/hooks/use-confirm-slack-publish-tool.tsx
src/hooks/use-entry-selection-context.ts
src/hooks/use-current-draft-context.ts
src/hooks/use-thread-store.ts
src/hooks/use-threads.ts
```

Propose their removal as a separate, later task once the domain-hook rewrite has run in the app for a while and is trusted — do not fold that deletion into this PR.

- [ ] **Step 4: Update the app inventory doc**

In `docs/architecture/app-inventory.md`:

- Replace §1 ("Custom hooks") with the new domain-hook map from this plan's intro table, noting the single-call-site rule.
- Replace the "Frontend tools" entries in §2 with references to the new hooks that register them (`useCommitEntries` for `showEntryList`, `useReleaseDraft` for `renderReleaseNotesPreview`, `useSlackPublish` for `confirmSlackPublish`).
- Update §6.7's status table: Dynamic platform moves from ⚠️ to ✅ (data path complete; a `PlatformTabs` UI wiring is still future work), Download moves from ❌ to ✅, Suggestions moves from ❌ to ✅.
- Add a note that the 8 files listed in Step 3 are orphaned and pending a future cleanup task.

---

## Self-Review Notes

- **Spec coverage:** all 6 items in the user's original feature list map to exactly one domain hook or hook pair (see the "Domain → hook map" table) — parser (Task 4), dynamic-platform build (Task 5), Slack sending (Task 6), download (Task 7), suggestions (Task 8), multiple threads (Task 3).
- **Reasons for the rebuild, addressed:** state organization (Task 1's slice split), no patching (every task creates new files; the only "modify" tasks are the 3 wiring call-sites, which necessarily change since they must call new hook names), design issues in the old 9 hooks (tool-event naming replaced by domain naming; `threadIdRef` encapsulated inside the one hook that needs it instead of leaking into `DashboardPage`; the `toCommit` limitation is now documented instead of silently present).
- **Placeholder scan:** no TBD/TODO of my own left in any step (the two pre-existing TODOs preserved verbatim in Task 11 are original app code, not placeholders in this plan).
- **Type consistency:** `PlatformOption` (Task 2) flows unchanged through `buildPlatformOptions` → `ReleaseDraftView.options` (Task 5) → `useSlackPublish`'s `PublishFlowProps.options` (Task 6) → `useReleaseExport`'s `activeOption` (Task 7). `ExportFormat` (Task 2) flows unchanged into `useReleaseExport` (Task 7) and `App.tsx`'s `onClick` (Task 10). `CommitEntriesView`/`ReleaseDraftView` return shapes are identical between each pair's registration hook and view hook, confirmed by the registration hooks' return type literally being `CommitEntriesView`/`ReleaseDraftView` extended or returned as-is.
- **Single-call-site rule cross-check:** `useCommitEntries` called only in Task 9 (DashboardPage); `useReleaseDraft` called only in Task 9; `useSlackPublish` called only in Task 9; `useFlowSuggestions` called only in Task 11 (CopilotAssistantPanel). No task calls two of these four from the same component more than once, and no registration hook imports another registration hook.
