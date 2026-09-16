# Dashboard UI v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Dashboard as sidebar (threads) + chat + conditional live preview, and delete the entry-list / export / suggestions chains entirely.

**Architecture:** Four sequential tasks, each leaving the repo compiling. Task 1 is pure deletion (entry list, export, suggestions) with the old `SplitPane` still in place. Task 2 adds preview open/close state. Task 3 swaps the layout in (`DashboardLayout` + `ThreadSidebar`) and deletes the dropdown. Task 4 adjusts the agent (chat-summary instruction + `lastMessages`).

**Tech Stack:** React 19, TypeScript (strict, `noUnusedLocals`), Vite, Tailwind v4, Zustand, TanStack Query, CopilotKit `@copilotkit/react-core/v2`, Mastra, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-16-dashboard-ui-v2-design.md`

## Global Constraints

- **No unit tests, no Storybook stories** for this work. Verification is `pnpm lint` + `pnpm build` clean plus the manual checks each task lists. Do not add `*.stories.tsx` for new components; delete the stories of deleted components.
- **`pnpm lint` and `pnpm build` must both pass clean before a task is done.** `tsc -b` runs with `noUnusedLocals` / `noUnusedParameters` / `verbatimModuleSyntax` — never weaken `tsconfig.app.json` to silence an error.
- **No git commits, pushes, or PRs** at any point in this plan. Checkpoint steps mean "stop and let the user review", not `git commit`. The user commits themselves when they ask for it.
- ES6 style: arrow functions only (including components), `const` by default, template literals, destructure 2+ fields from one object.
- `import type` for type-only imports. Explicit `.ts` / `.tsx` extensions on relative and `@/` imports.
- No `any`. `const enum` for fixed value sets used as both type and runtime value.
- Files kebab-case, except `.tsx` files that default-export a React component → PascalCase matching the component identifier. Folders always kebab-case.
- Components/Types/Interfaces PascalCase; variables/functions camelCase.
- Every Mastra agent/tool/workflow/scorer stays registered in `src/mastra/index.ts` — this plan removes no server-side registration, so that file is untouched.

---

### Task 1: Delete the entry-list, export, and suggestion chains

`showEntryList` is a frontend-only tool (`useFrontendTool` in `use-commit-entries.tsx`); it is not in `src/mastra/index.ts` or on the agent's `tools` map, so deleting the client file removes it from the agent's tool set with no server change.

**Files:**
- Delete: `src/components/commit-list/` (entire folder: `CommitListPanel.tsx`, `CommitListItem.tsx`, `.gitkeep`, `stories/CommitListPanel.stories.tsx`, `stories/CommitListItem.stories.tsx`)
- Delete: `src/hooks/use-commit-entries.tsx`
- Delete: `src/hooks/use-commit-entries-view.ts`
- Delete: `src/hooks/use-flow-suggestions.ts`
- Delete: `src/hooks/use-release-export.ts`
- Delete: `src/lib/export/` (entire folder: `build-export-file.ts`, `strip-markdown.ts`, `.gitkeep`)
- Delete: `src/types/export-format.ts`
- Delete: `src/store/entries-slice.ts`
- Modify: `src/store/release-workspace-store.ts`
- Modify: `src/store/draft-slice.ts:21-26`
- Modify: `src/constants/agent-tools/tools-name.ts:4`
- Modify: `src/types/release-entry.ts:78-89`
- Modify: `src/routes/DashboardPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/chat/CopilotAssistantPanel.tsx:11,42`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `ReleaseWorkspaceStore = DraftSlice` (entries gone from the store);
  `DashboardPage` still rendering `SplitPane` with `LivePreviewPanel` on the left and
  `CopilotAssistantPanel` on the right — Task 3 replaces that.

- [ ] **Step 1: Delete the files**

Run:

```bash
rm -rf src/components/commit-list src/lib/export
rm src/hooks/use-commit-entries.tsx src/hooks/use-commit-entries-view.ts \
   src/hooks/use-flow-suggestions.ts src/hooks/use-release-export.ts \
   src/types/export-format.ts src/store/entries-slice.ts
```

- [ ] **Step 2: Narrow the store to the draft slice**

Replace the whole of `src/store/release-workspace-store.ts` with:

```ts
import { create } from 'zustand';
import { createDraftSlice, type DraftSlice } from '@/store/draft-slice.ts';

export type ReleaseWorkspaceStore = DraftSlice;

// Not persisted: the draft is driven by the tool-call render in
// use-release-draft.tsx, which replays from Mastra's own persisted history on
// reconnect — a second, client-side persisted copy of the same data is a source
// of drift, not safety.
export const useReleaseWorkspaceStore = create<ReleaseWorkspaceStore>()(
  (...args) => ({
    ...createDraftSlice(...args),
  }),
);
```

- [ ] **Step 3: Drop the `EntriesSlice` generic from the draft slice**

In `src/store/draft-slice.ts`, delete the line
`import type { EntriesSlice } from '@/store/entries-slice.ts';` and change the
`StateCreator` generic:

```ts
export const createDraftSlice: StateCreator<
  DraftSlice,
  [],
  [],
  DraftSlice
> = (set) => ({
```

Everything below that line is unchanged.

- [ ] **Step 4: Remove the dead tool name and schema**

In `src/constants/agent-tools/tools-name.ts`, delete:

```ts
export const SHOW_ENTRY_LIST_TOOL_NAME = 'showEntryList';
```

In `src/types/release-entry.ts`, delete the whole `EntryListToolSchema` export
(lines 78-89). Keep `ReleaseEntrySchema` and `ReleaseEntry` — they are still
imported by `release-history-record.ts`, `save-release-history-request.ts`, and
`src/mastra/storage/releases-repository.ts`. The `joinLines` import at the top
stays (still used by `ReleaseEntrySchema`'s field descriptions).

- [ ] **Step 5: Drop the commit list from the Dashboard**

Replace the whole of `src/routes/DashboardPage.tsx` with (this is the interim
shape — Task 3 rewrites it again):

```tsx
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import SplitPane from '@/layouts/SplitPane.tsx';
import { useReleaseDraft } from '@/hooks/use-release-draft.tsx';
import { useSlackPublish } from '@/hooks/use-slack-publish.tsx';
import { copyText } from '@/lib/clipboard.ts';
import { saveReleaseToHistory } from '@/lib/release-notes/save-release-to-history.ts';

const DashboardPage = () => {
  const { content } = useReleaseDraft();
  useSlackPublish();

  const handleCopy = async (): Promise<boolean> => {
    if (!content) return false;
    return copyText(content);
  };

  return (
    <SplitPane
      leftWidthPercent={65}
      left={
        <ErrorBoundary title="Preview unavailable">
          <LivePreviewPanel
            markdown={content}
            onCopy={handleCopy}
            onArchive={() => saveReleaseToHistory().then((result) => result.ok)}
          />
        </ErrorBoundary>
      }
      right={
        <ErrorBoundary title="Copilot panel unavailable">
          <CopilotAssistantPanel />
        </ErrorBoundary>
      }
    />
  );
};

export default DashboardPage;
```

- [ ] **Step 6: Remove the Export button from the header**

In `src/App.tsx`: delete the `HeaderActions` component's export logic and the now-unused
imports (`Download`, `useReleaseExport`, `ExportFormat`, `Button`, `ButtonVariant`,
`ErrorBoundary`, `ErrorBoundaryVariant`). The file becomes:

```tsx
import { Outlet } from 'react-router';
import { HelpCircle, Settings } from 'lucide-react';
import AppShell from '@/layouts/AppShell.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import Avatar from '@/components/common/Avatar.tsx';
import DisconnectBanner from '@/components/common/DisconnectBanner.tsx';
import AppProviders from './providers/AppProviders';

const HeaderActions = () => (
  <div className="flex items-center gap-3">
    <IconButton icon={<Settings className="size-5" />} aria-label="Settings" />
    <IconButton icon={<HelpCircle className="size-5" />} aria-label="Help" />
    <Avatar name="You" />
  </div>
);

const App = () => (
  <AppProviders>
    <AppShell banner={<DisconnectBanner />} headerActions={<HeaderActions />}>
      <Outlet />
    </AppShell>
  </AppProviders>
);

export default App;
```

- [ ] **Step 7: Unregister suggestions in the chat panel**

In `src/components/chat/CopilotAssistantPanel.tsx`, delete the import
`import { useFlowSuggestions } from '@/hooks/use-flow-suggestions.ts';` and the
`useFlowSuggestions();` call (line 42). Nothing else in this file changes yet.

- [ ] **Step 8: Verify the deletion list is complete**

Run: `pnpm build`
Expected: PASS. `tsc -b` with `noUnusedLocals` is what proves no dangling import or
unused symbol was left behind. If it fails with `Cannot find module` pointing at a
deleted file, that import is one the plan missed — remove the usage, do not restore
the file.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 9: Manual check**

Run: `pnpm dev:all`, open the Dashboard.
Expected: no "Parsed Commits" card, no Export button in the header. Paste a git log —
the agent no longer renders an entry-list card (it may still describe entries as text;
Task 4 fixes the wording). Ask it to draft for GitHub — the Live Preview still fills in.

- [ ] **Step 10: Checkpoint**

Stop and report what changed. Do not commit.

---

### Task 2: Preview open/close state

**Files:**
- Create: `src/hooks/use-preview-panel.ts`
- Modify: `src/components/release-notes/LivePreviewPanel.tsx`
- Modify: `src/components/release-notes/MarkdownPreview.tsx:11-16`
- Modify: `src/components/release-notes/stories/LivePreviewPanel.stories.tsx`

**Interfaces:**
- Consumes: `useReleaseDraftView()` from `src/hooks/use-release-draft-view.ts`, returning
  `{ draft: ReleaseNotesDraft | null; content: string | null }`.
- Produces:
  - `usePreviewPanel(): { isOpen: boolean; close: () => void }`
  - `LivePreviewPanel` props become
    `{ markdown: string | null; onCopy: CopyHandler; onArchive: CopyHandler; onClose: () => void }`

- [ ] **Step 1: Write the preview-panel hook**

Create `src/hooks/use-preview-panel.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import { useReleaseDraftView } from '@/hooks/use-release-draft-view.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

export interface UsePreviewPanelResult {
  isOpen: boolean;
  close: () => void;
}

// Opens the Live Preview whenever a NEW draft arrives, and keeps it closed after
// the user dismisses it until the next one. Identity is the store object's
// reference: draft-slice.ts no-ops a setDraft whose serialized value is
// unchanged, so a re-rendered tool call for the same draft does not produce a new
// reference and cannot re-open a panel the user just closed. Switching threads
// swaps in that thread's own draft — non-null opens, null closes.
//
// Reads the draft through useReleaseDraftView(), the read-only projection. It
// must NEVER call useReleaseDraft(), which registers the render tool; a second
// registration would double-handle every tool call.
export const usePreviewPanel = (): UsePreviewPanelResult => {
  const { draft } = useReleaseDraftView();
  const [isOpen, setIsOpen] = useState(false);
  const lastDraftRef = useRef<ReleaseNotesDraft | null>(null);

  useEffect(() => {
    if (draft === lastDraftRef.current) return;
    lastDraftRef.current = draft;
    setIsOpen(draft !== null);
  }, [draft]);

  return { isOpen, close: () => setIsOpen(false) };
};
```

- [ ] **Step 2: Add the close button to the preview panel**

In `src/components/release-notes/LivePreviewPanel.tsx`:

Add to the imports:

```tsx
import { Archive, X } from 'lucide-react';
import IconButton from '@/components/common/IconButton.tsx';
```

(the existing `import { Archive } from 'lucide-react';` line is replaced by the one above)

Extend the props interface:

```tsx
interface LivePreviewPanelProps {
  markdown: string | null;
  onCopy: CopyHandler;
  onArchive: CopyHandler;
  onClose: () => void;
}
```

Destructure `onClose` alongside the others, and add the button as the last child of the
`<div className="flex gap-2">` block that already holds Archive and Copy:

```tsx
<IconButton
  icon={<X className="size-4" />}
  aria-label="Close live preview"
  onClick={onClose}
/>
```

- [ ] **Step 3: Fix the empty-state wording**

`MarkdownPreview`'s empty state still references selected commits, which no longer
exist. In `src/components/release-notes/MarkdownPreview.tsx`, replace the `if (!markdown)`
return with:

```tsx
  if (!markdown) {
    return (
      <p className="text-body-md text-on-surface-variant">
        No content yet — paste a git log or PR text in the chat and ask Copilot to
        draft release notes.
      </p>
    );
  }
```

- [ ] **Step 4: Keep the existing story compiling**

`src/components/release-notes/stories/LivePreviewPanel.stories.tsx` renders
`LivePreviewPanel` and will now fail `tsc -b` on the missing required prop. Add
`onClose={() => {}}` to every `<LivePreviewPanel ... />` usage in that file. Do not add
new stories.

- [ ] **Step 5: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS. In particular `eslint-plugin-react-hooks` must not flag the effect in
`use-preview-panel.ts` — its only dependency is `draft`.

- [ ] **Step 6: Checkpoint**

Stop and report. Do not commit. (The hook is not wired into any page yet — that is
Task 3. Nothing visible changes in the running app except the new X button and the
reworded empty state.)

---

### Task 3: Sidebar, layout, and the Dashboard rewrite

**Files:**
- Create: `src/layouts/DashboardLayout.tsx`
- Create: `src/components/chat/ThreadSidebar.tsx`
- Delete: `src/layouts/SplitPane.tsx`
- Delete: `src/layouts/stories/SplitPane.stories.tsx`
- Delete: `src/components/chat/ThreadListDropdown.tsx`
- Delete: `src/hooks/use-click-outside.ts`
- Modify: `src/components/chat/CopilotAssistantPanel.tsx`
- Modify: `src/components/chat/WelcomeScreen.tsx:11-14`
- Modify: `src/routes/DashboardPage.tsx`
- Modify: `src/layouts/AppShell.tsx:14`

**Interfaces:**
- Consumes: `usePreviewPanel()` from Task 2; `LivePreviewPanel`'s `onClose` prop from
  Task 2; `useThreadSession()` returning
  `{ threadId, threads, isThreadsLoading, isThreadsError, startNewChat, selectThread }`;
  `ThreadListItem` with props `{ thread, isActive, onSelect }`.
- Produces:
  - `DashboardLayout` props `{ sidebar?: ReactNode; chat: ReactNode; preview?: ReactNode }`
  - `ThreadSidebar` props `{ onCollapse: () => void }`
  - `CopilotAssistantPanel` props `{ leading?: ReactNode }`

- [ ] **Step 1: Create the layout**

Create `src/layouts/DashboardLayout.tsx`:

```tsx
import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  sidebar?: ReactNode;
  chat: ReactNode;
  preview?: ReactNode;
}

// Three regions, two of them optional. A collapsed sidebar and a closed preview
// are NOT rendered (no zero-width element), so the chat reflows to the full
// width instead of sitting next to an empty column. Below `sm` the sidebar
// overlays the chat and the preview stacks underneath it.
const DashboardLayout = ({ sidebar, chat, preview }: DashboardLayoutProps) => (
  <div className="relative flex h-full min-h-0">
    {sidebar && (
      <div className="bg-surface absolute inset-y-0 left-0 z-20 w-[260px] shrink-0 sm:static sm:z-auto">
        {sidebar}
      </div>
    )}
    <div className="flex min-h-0 min-w-0 flex-1 flex-col sm:flex-row">
      <div className="min-h-0 min-w-0 flex-1">{chat}</div>
      {preview && (
        <div className="border-outline-variant min-h-0 shrink-0 overflow-y-auto border-t p-4 sm:w-[38%] sm:border-t-0 sm:border-l">
          {preview}
        </div>
      )}
    </div>
  </div>
);

export default DashboardLayout;
```

- [ ] **Step 2: Delete SplitPane**

Run:

```bash
rm src/layouts/SplitPane.tsx src/layouts/stories/SplitPane.stories.tsx
```

- [ ] **Step 3: Create the thread sidebar**

Create `src/components/chat/ThreadSidebar.tsx`. The loading / error / empty branches are
lifted verbatim from `ThreadListDropdown.tsx` (deleted in Step 5):

```tsx
import { PanelLeftClose, Plus } from 'lucide-react';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import ThreadListItem from './ThreadListItem.tsx';

interface ThreadSidebarProps {
  onCollapse: () => void;
}

// useThreadSession() registers no CopilotKit primitive (see its own header
// comment), so calling it here AND in CopilotAssistantPanel is safe — no lifted
// state, no props threaded through DashboardPage.
const ThreadSidebar = ({ onCollapse }: ThreadSidebarProps) => {
  const {
    threadId,
    threads,
    isThreadsLoading,
    isThreadsError,
    startNewChat,
    selectThread,
  } = useThreadSession();

  return (
    <aside className="bg-surface-container-lowest border-outline-variant flex h-full w-full flex-col border-r">
      <div className="border-outline-variant flex shrink-0 items-center justify-between gap-2 border-b px-3 py-4">
        <span className="text-headline-md text-on-surface">Chats</span>
        <IconButton
          icon={<PanelLeftClose className="size-5" />}
          aria-label="Collapse thread sidebar"
          onClick={onCollapse}
        />
      </div>
      <div className="shrink-0 px-3 py-3">
        <Button
          variant={ButtonVariant.Secondary}
          onClick={startNewChat}
          className="flex w-full items-center justify-center gap-2"
        >
          <Plus className="size-4" aria-hidden="true" />
          New thread
        </Button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto pb-3">
        {isThreadsLoading && (
          <li className="text-label-sm text-on-surface-variant px-3 py-2">
            Loading...
          </li>
        )}
        {isThreadsError && (
          <li className="text-label-sm text-error px-3 py-2">
            Failed to load threads.
          </li>
        )}
        {!isThreadsLoading && !isThreadsError && threads?.length === 0 && (
          <li className="text-label-sm text-on-surface-variant px-3 py-2">
            No threads yet.
          </li>
        )}
        {threads?.map((thread) => (
          <ThreadListItem
            key={thread.id}
            thread={thread}
            isActive={thread.id === threadId}
            onSelect={selectThread}
          />
        ))}
      </ul>
    </aside>
  );
};

export default ThreadSidebar;
```

- [ ] **Step 4: Strip the thread controls out of the chat panel**

In `src/components/chat/CopilotAssistantPanel.tsx`:

Delete these imports: `useState` (from the `react` import — keep `useEffect`),
`useClickOutside`, `ThreadListDropdown`.

Add to the `react` import: `import { useEffect, type ReactNode } from 'react';`

Replace the component's opening (down to and including the whole header `<div>`) with:

```tsx
interface CopilotAssistantPanelProps {
  leading?: ReactNode;
}

const CopilotAssistantPanel = ({ leading }: CopilotAssistantPanelProps) => {
  const { threadId } = useThreadSession();

  const { agent } = useAgent({ agentId: RELEASE_COPILOT_AGENT_ID });

  useEffect(() => {
    return () => {
      agent.setMessages([]);
    };
  }, [agent]);

  const hasMessages = agent.messages.length > 0;
  const {
    message: chatErrorMessage,
    canRetry,
    retry,
    dismiss: dismissChatError,
  } = useChatError();

  return (
    <div className="bg-surface-container-lowest border-outline-variant flex h-full w-full flex-col border-l">
      <div className="border-outline-variant flex shrink-0 items-center gap-2 border-b px-4 py-4">
        {leading}
        <span
          className="bg-success-emerald size-3 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <span className="text-headline-md text-on-surface">
          Copilot Assistant
        </span>
      </div>
```

Everything from `<CopilotChat` onward is unchanged. Also delete the commented-out
"Re-open in the future" Clear-button block (lines 99-107 of the original) while the file
is open — it is dead code, not a pending feature.

- [ ] **Step 5: Delete the dropdown and its click-outside hook**

Run:

```bash
rm src/components/chat/ThreadListDropdown.tsx src/hooks/use-click-outside.ts
```

`ThreadListItem.tsx` stays — `ThreadSidebar` uses it.

- [ ] **Step 6: Fix the welcome-screen copy**

In `src/components/chat/WelcomeScreen.tsx`, replace the second paragraph's text (it
still tells the user to paste "in the app" and mentions selected commits):

```tsx
    <p className="text-body-md text-on-surface-variant max-w-[320px] leading-relaxed">
      Paste a git log or PR description here, then tell me which platform to draft
      release notes for.
    </p>
```

- [ ] **Step 7: Rewrite the Dashboard**

Replace the whole of `src/routes/DashboardPage.tsx`:

```tsx
import { useState } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import ThreadSidebar from '@/components/chat/ThreadSidebar.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import ErrorBoundary from '@/components/common/ErrorBoundary.tsx';
import IconButton from '@/components/common/IconButton.tsx';
import DashboardLayout from '@/layouts/DashboardLayout.tsx';
import { usePreviewPanel } from '@/hooks/use-preview-panel.ts';
import { useReleaseDraft } from '@/hooks/use-release-draft.tsx';
import { useSlackPublish } from '@/hooks/use-slack-publish.tsx';
import { copyText } from '@/lib/clipboard.ts';
import { saveReleaseToHistory } from '@/lib/release-notes/save-release-to-history.ts';

// Single call site for the two CopilotKit tool registrations this page owns:
// useReleaseDraft (renderReleaseNotesPreview) and useSlackPublish
// (confirmSlackPublish). Anything that only READS the draft uses
// useReleaseDraftView() instead — usePreviewPanel does exactly that.
const DashboardPage = () => {
  const { content } = useReleaseDraft();
  useSlackPublish();
  const { isOpen: isPreviewOpen, close: closePreview } = usePreviewPanel();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleCopy = async (): Promise<boolean> => {
    if (!content) return false;
    return copyText(content);
  };

  return (
    <DashboardLayout
      sidebar={
        isSidebarOpen && (
          <ErrorBoundary title="Threads unavailable">
            <ThreadSidebar onCollapse={() => setIsSidebarOpen(false)} />
          </ErrorBoundary>
        )
      }
      chat={
        <ErrorBoundary title="Copilot panel unavailable">
          <CopilotAssistantPanel
            leading={
              !isSidebarOpen && (
                <IconButton
                  icon={<PanelLeftOpen className="size-5" />}
                  aria-label="Open thread sidebar"
                  onClick={() => setIsSidebarOpen(true)}
                />
              )
            }
          />
        </ErrorBoundary>
      }
      preview={
        isPreviewOpen && (
          <ErrorBoundary title="Preview unavailable">
            <LivePreviewPanel
              markdown={content}
              onCopy={handleCopy}
              onArchive={() => saveReleaseToHistory().then((result) => result.ok)}
              onClose={closePreview}
            />
          </ErrorBoundary>
        )
      }
    />
  );
};

export default DashboardPage;
```

Note: `isSidebarOpen && <.../>` yields `false` when closed, which React renders as
nothing and `DashboardLayout`'s `{sidebar && ...}` guard treats as absent — that is why
the props are `ReactNode` and not required.

- [ ] **Step 8: Let the layout reach the shell edges**

`AppShell`'s `<main>` pads every route with `px-6 py-6`, which would inset the sidebar
and the preview border from the window edges. In `src/layouts/AppShell.tsx`, change the
`<main>` line to:

```tsx
    <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
```

Then restore the padding for the other route that relied on it. In
`src/routes/HistoryPage.tsx:46`, change the outermost element of the returned JSX:

```tsx
    <div className="flex h-full gap-6 px-6 py-6">
```

(`SignInPage` and `RouteErrorPage` render outside `App`/`AppShell`, so they are
unaffected.)

- [ ] **Step 9: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 10: Manual checks**

Run: `pnpm dev:all`.

Expected, in order:
1. Fresh load: sidebar on the left with "Chats" + "New thread", chat filling the rest,
   no preview region, no commit list.
2. Ask the agent to draft release notes for a platform → the preview opens on the right
   by itself.
3. Click X on the preview → it closes, chat takes the full width.
4. Ask for an edit ("make it shorter") → a new draft arrives and the preview re-opens.
5. Click "New thread" → chat clears, preview closes (that thread has no draft).
6. Switch back to the first thread → its draft is still there and the preview opens.
7. Collapse the sidebar via the header button → it disappears and an open-sidebar button
   appears at the left of the chat header; clicking it brings the sidebar back.
8. Narrow the window to ~400px → the sidebar overlays the chat, the preview stacks below
   it, and nothing scrolls horizontally.
9. History page still renders with its normal padding.

- [ ] **Step 11: Checkpoint**

Stop and report. Do not commit.

---

### Task 4: Agent reporting rule and message window

> **SUPERSEDED — do not follow Steps 1-2 as written.** The instruction section this task
> creates was replaced by the `release-reporting` skill after execution. See "Execution
> notes" at the end of this document. Step 3 (`lastMessages: 10`) still stands.

**Deviation from the spec, deliberate:** the spec placed the new "summarize, don't
enumerate" rule in `src/mastra/skills/commit-pr-parsing.ts`. It goes in the always-on
instructions instead (`src/mastra/instructions/v2/release-notes/`). Skills are
domain rulebooks the model pulls in when relevant; this is an output policy that must
hold on every turn, which is what the `v2` instruction sections are for. The old
"never describe entries as chat text" rule lived only in the `showEntryList` tool
description (deleted in Task 1) — no skill file contains it, so no skill needs editing.

**Files:**
- Create: `src/mastra/instructions/v2/release-notes/reporting.ts`
- Modify: `src/mastra/instructions/v2/release-notes/index.ts`
- Modify: `src/mastra/agents/release-copilot-agent.ts:48`

**Interfaces:**
- Consumes: `buildReleaseCopilotInstructionsV2()` composition order in
  `src/mastra/instructions/v2/release-notes/index.ts`.
- Produces: `export const REPORTING: string` — a new instruction section appended after
  `LOOP`.

- [ ] **Step 1: Write the reporting section**

Create `src/mastra/instructions/v2/release-notes/reporting.ts`:

```ts
export const REPORTING = `
# Reporting Parsed Input

When the user pastes a git log, a PR, or any other release-related input, parse and
classify it internally and then report only a short summary in chat.

A summary is:

- How many entries you read.
- Their distribution by classification, e.g. "5 features, 4 fixes, 1 breaking change".
- How many entries were excluded, when any were.
- A question naming what you need next — most often which platform to build for.

Example:

\`Read 12 entries — 5 features, 4 fixes, 1 breaking change, 2 excluded. Which platform
should I build the release notes for?\`

Never do any of the following:

- List the entries one by one, as prose, bullets, a numbered list, or a table.
- Echo the pasted git log or PR text back to the user.
- Quote commit hashes, subjects, or authors in the summary.

The entries only reach the user through finished release-note content, which is
produced by the render-preview tool. There is no entry-list view in the app.

When an entry cannot be classified, name that one entry (by hash or title) and ask
about it — that is the single exception to the rules above, and it applies only to the
entries actually in question, never to the whole batch.
`;
```

- [ ] **Step 2: Append it to the instruction build**

In `src/mastra/instructions/v2/release-notes/index.ts`, add the import and the array
entry:

```ts
import { LOOP } from './loop';
import { REPORTING } from './reporting';
```

```ts
    ...BASE_INSTRUCTIONS,
    LOOP,
    REPORTING,
  ].join('\n\n---\n\n');
```

- [ ] **Step 3: Widen the message window**

In `src/mastra/agents/release-copilot-agent.ts`, inside `new Memory({ options: { ... } })`:

```ts
      // Entries are no longer pinned into every request through agent context
      // (the showEntryList tool and its useAgentContext are gone), so a pasted
      // git log survives only as long as it stays in this window. 10 covers
      // paste -> summary -> platform question -> answer -> build plus a couple
      // of detour turns. Working memory deliberately does NOT hold the entries:
      // it is injected into every request forever, and a 30-commit array there
      // costs ~600 tokens per turn against a Groq TPM budget.
      lastMessages: 10,
```

- [ ] **Step 4: Verify**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 5: Manual check**

Run: `pnpm dev:all`. In a fresh thread, paste a git log of ~10 commits.

Expected: the reply is a one- or two-line summary with counts and a platform question —
no per-entry list, no hashes, no echoed log. Answer with a platform; the draft builds and
the preview opens. Then send 3-4 unrelated chat turns and ask it to rebuild for another
platform: it should still have the entries (inside the 10-message window) rather than
asking for the log again.

- [ ] **Step 6: Final verification**

Run: `pnpm lint && pnpm build`
Expected: both PASS, clean.

Re-run the Task 3 Step 10 manual list end to end — the agent change must not have broken
the preview-open behavior.

- [ ] **Step 7: Checkpoint**

Stop and report. Do not commit; the user commits when they ask for it.

---

## Execution notes (2026-09-16)

All four tasks were executed. `pnpm lint` and `pnpm build` passed clean after each one.
Three things diverged from the plan as written — recorded here rather than rewritten
into the tasks above, so the plan stays readable as what was planned and this section
says what actually shipped.

**1. Task 2 broke the build as specified; needed a one-line bridge.**
Task 2 adds `onClose` as a *required* prop on `LivePreviewPanel`, but the interim
`DashboardPage` written in Task 1 Step 5 does not pass it — so `pnpm build` failed at
Task 2 Step 5. Fixed by adding `onClose={() => {}}` to the interim `DashboardPage`,
which Task 3 Step 7 then overwrote with the real `closePreview`. A future plan that
introduces a required prop must either add it to every existing call site in the same
task, or introduce it as optional and tighten it later.

**2. `usePreviewPanel` gained `open()`, and the chat header gained a `trailing` slot.**
Found during manual verification: once the user closed the preview, nothing could
reopen it until the agent produced a *new* draft — the panel holding the draft they
were still working on was simply unreachable. The hook now returns
`{ isOpen, open, close }`, and `CopilotAssistantPanel` takes a second optional header
slot, `trailing`, alongside `leading`:

```tsx
interface CopilotAssistantPanelProps {
  leading?: ReactNode;
  trailing?: ReactNode;
}
```

`DashboardPage` passes an `IconButton` (`PanelRightOpen`, aria-label "Open live
preview") into `trailing`, gated on `Boolean(content) && !isPreviewOpen` so it never
offers to open an empty panel. It sits at the right edge of the chat header, mirroring
the sidebar expand button on the left.

**3. The reporting rule shipped as a skill, not an instruction section.**
Task 4 created `src/mastra/instructions/v2/release-notes/reporting.ts` and appended
`REPORTING` to the always-on instructions. That file was subsequently deleted and its
content moved into a new skill, `src/mastra/skills/release-reporting.ts`, exported from
`skills/index.ts` and added to the agent's `skills` array — the always-on instructions
are back to `intro + BASE_INSTRUCTIONS + LOOP`.

Reason: the rule only applies while handling pasted release input, roughly one turn per
conversation, and an always-on section costs ~250 tokens on every request for it. The
skill version also gained two rules the instruction version lacked, since a
just-in-time skill has to carry its own context: do not re-summarize the input once a
draft exists, and refuse an explicit "list every commit" request by offering the
release notes instead.

Known risk, accepted: this rule suppresses a *default* model behavior, so on any turn
the skill is not loaded, nothing enforces it. Cheap fix if it shows up in practice —
one sentence in the always-on instructions, detail left in the skill.

Nothing in this work was committed; the user commits on their own ask.
