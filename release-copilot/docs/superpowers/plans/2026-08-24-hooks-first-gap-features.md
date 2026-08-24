# Hooks-First Gap Features Implementation Plan

> **SUPERSEDED:** patch-onto-existing-files approach. Replaced by the full domain-hooks rewrite in
> [`2026-08-24-domain-hooks-rewrite.md`](2026-08-24-domain-hooks-rewrite.md), which the user requested
> after reviewing this plan (rebuild from scratch instead of extending `useDashboardStore` /
> `use-confirm-slack-publish-tool.tsx` etc.). Kept for reference only — do not execute.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 3 feature gaps identified in [docs/architecture/app-inventory.md §6](../../architecture/app-inventory.md#6-đối-chiếu-với-yêu-cầu-feature-checklist) — dynamic-platform preview, download/export, and flow-staged suggestions — by building each as a self-contained custom hook first. UI components already exist and are not touched beyond swapping one hardcoded call for a hook call and wiring one existing button's `onClick`.

**Architecture:** "Hooks to components" — each feature is a plain function (`src/lib/`) plus a hook (`src/hooks/`) that reads/writes the existing Zustand stores (`useDashboardStore`, `useThreadStore`). No new UI components, no new Mastra tools, no new agent instructions. `DashboardPage.tsx`, `App.tsx`, and `CopilotAssistantPanel.tsx` each get a 1-2 line call-site change to consume the new hook — existing JSX and existing child components (`LivePreviewPanel`, `Button`, `SlackPublishCard`) are reused as-is.

**Tech Stack:** React 19, Zustand, TypeScript strict (`verbatimModuleSyntax`, `const enum`), CopilotKit `useConfigureSuggestions`. No test runner exists in this repo — verification gate is `pnpm lint` + `pnpm build` (matches `.agents/rules/code-style.md`), plus a manual smoke pass against the running dev servers per task.

## Global Constraints

- Arrow functions only, no `function` declarations (`.agents/rules/code-style.md`).
- `import type` for type-only imports (`verbatimModuleSyntax`).
- Explicit `.ts`/`.tsx` extensions on relative and `@/` alias imports.
- No `any`. Use `unknown` + narrowing where needed.
- `const enum` for a fixed value set used as both type and runtime value.
- Folders kebab-case always; hook files kebab-case (`use-xxx.ts`); `.tsx` only when the file needs JSX.
- `pnpm lint` and `pnpm build` (`tsc -b && vite build`) must both pass clean before any task is considered done.
- No direct commits to `main`; one task-group = one branch = one PR (`.agents/rules/git-rules.md`). Conventional Commits for every commit message.
- Every Mastra agent/tool/workflow/scorer must be registered in `src/mastra/index.ts` — **not applicable to this plan**: all 3 features are 100% client-side, no server changes.
- Do not create git commits or open PRs without the user's explicit go-ahead at each checkpoint — this plan writes commit commands for completeness, but confirm before running them.

---

## Branch 1 — `refactor/platform-preview-hook`

Extracts the duplicated platform-option builder, then builds the dynamic-platform-preview hook on top of it. Task 2 depends on Task 1.

### Task 1: Extract shared `PlatformOption` type + `buildPlatformOptions`

**Files:**
- Create: `src/types/platform-option.ts`
- Create: `src/lib/release-notes/platform-options.ts`
- Modify: `src/components/release-notes/SlackPublishCard.tsx`
- Modify: `src/hooks/use-confirm-slack-publish-tool.tsx`

**Interfaces:**
- Produces: `PlatformOption { platformId: string; label: string; content: string }` (type), `buildPlatformOptions(draft: ReleaseNotesDraft): PlatformOption[]` (function) — both consumed by Task 2's `usePlatformPreview` and by Task 4's `useExportReleaseNotes`.

**Why:** `use-confirm-slack-publish-tool.tsx` already contains a private `buildPublishOptions` function that does exactly what the new `usePlatformPreview` hook needs (GitHub + `toPlatformDrafts`, composed to `{platformId, label, content}`). Duplicating it a second time would violate the repo's own constants/extraction rule (`.agents/rules/conventions.md`: extract when duplicated across ≥2 files). Extract once, use twice.

- [ ] **Step 1: Create the shared type**

`src/types/platform-option.ts`:

```ts
export interface PlatformOption {
  platformId: string;
  label: string;
  content: string;
}
```

- [ ] **Step 2: Create the shared builder function**

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

- [ ] **Step 3: Point `SlackPublishCard` at the shared type**

In `src/components/release-notes/SlackPublishCard.tsx`, replace:

```tsx
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import CopyButton from '@/components/common/CopyButton.tsx';
import type { TabItem } from '@/components/common/Tabs.tsx';
import PlatformTabs from '@/components/platform-selector/PlatformTabs.tsx';

export const enum SlackPublishStatus {
  Idle = 'idle',
  Sending = 'sending',
  Sent = 'sent',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

export interface PublishOption {
  platformId: string;
  label: string;
  content: string;
}

interface SlackPublishCardProps {
  options: PublishOption[];
```

with:

```tsx
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import CopyButton from '@/components/common/CopyButton.tsx';
import type { TabItem } from '@/components/common/Tabs.tsx';
import PlatformTabs from '@/components/platform-selector/PlatformTabs.tsx';
import type { PlatformOption } from '@/types/platform-option.ts';

export const enum SlackPublishStatus {
  Idle = 'idle',
  Sending = 'sending',
  Sent = 'sent',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

interface SlackPublishCardProps {
  options: PlatformOption[];
```

Nothing else in this file changes — `options`, `PublishOption` was only used in the prop type, and the rest of the component destructures props, not the type name.

- [ ] **Step 4: Rewrite `use-confirm-slack-publish-tool.tsx` to use the shared builder**

Replace the entire file content with:

```tsx
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useHumanInTheLoop } from '@copilotkit/react-core/v2';
import SlackPublishCard, {
  SlackPublishStatus,
} from '@/components/release-notes/SlackPublishCard.tsx';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents.ts';
import { CONFIRM_SLACK_PUBLISH_TOOL_NAME } from '@/constants/tools.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { buildPlatformOptions } from '@/lib/release-notes/platform-options.ts';
import { joinLines } from '@/lib/text.ts';
import { ConfirmSlackPublishSchema } from '@/types/confirm-slack-publish.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { PlatformOption } from '@/types/platform-option.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

interface UseConfirmSlackPublishToolOptions {
  draft: ReleaseNotesDraft | null;
}

interface PublishFlowProps {
  draft: ReleaseNotesDraft;
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

const PublishFlow = ({
  draft,
  initialPlatformId,
  respond,
}: PublishFlowProps) => {
  const [confirmedDraft] = useState(draft);
  const options = useMemo<PlatformOption[]>(
    () => buildPlatformOptions(confirmedDraft),
    [confirmedDraft],
  );
  const [platformId, setPlatformId] = useState(
    options.some((option) => option.platformId === initialPlatformId)
      ? (initialPlatformId as string)
      : KnownPlatformId.Github,
  );
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );
  const [error, setError] = useState<string | null>(null);

  const selected =
    options.find((option) => option.platformId === platformId) ?? options[0];

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
      options={options}
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

export const useConfirmSlackPublishTool = ({
  draft,
}: UseConfirmSlackPublishToolOptions) => {
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
            draft={draft}
            initialPlatformId={props.args.platformId}
            respond={props.respond}
          />
        );
      },
    },
    [draft],
  );
};
```

- [ ] **Step 5: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean. If lint flags unused imports, the only legitimate cause is a typo in the rewrite above — diff against this step, not against the pre-refactor file.

- [ ] **Step 6: Manual smoke check**

Run `pnpm dev:mastra` (terminal 1) and `pnpm dev` (terminal 2). In the browser: paste a small git log, let the agent classify it, ask for a draft, then ask to "post it to Slack" or "announce this in Slack". Confirm the Slack card still renders with the same platform tabs and preview as before this refactor (behavior must be byte-for-byte identical — this task only moves code, it changes nothing observable).

- [ ] **Step 7: Commit**

```bash
git checkout -b refactor/platform-preview-hook
git add src/types/platform-option.ts src/lib/release-notes/platform-options.ts src/components/release-notes/SlackPublishCard.tsx src/hooks/use-confirm-slack-publish-tool.tsx
git commit -m "refactor: extract shared buildPlatformOptions from Slack publish hook"
```

---

### Task 2: `usePlatformPreview` hook — dynamic platform viewing

**Files:**
- Modify: `src/hooks/use-dashboard-store.ts`
- Create: `src/hooks/use-platform-preview.ts`
- Modify: `src/routes/DashboardPage.tsx`

**Interfaces:**
- Consumes: `buildPlatformOptions` and `PlatformOption` from Task 1.
- Produces: `usePlatformPreview(): { options: PlatformOption[]; activePlatformId: string; activeContent: string | null; setActivePlatform: (platformId: string) => void }` — `activeContent` is what Task 4's export hook exports and what `DashboardPage` now passes to `LivePreviewPanel`.

**Why:** This is App Inventory §6.2 — the draft schema and `toPlatformDrafts` already support arbitrary platforms, but `DashboardPage` hardcodes `composeGithubContent`, so App Store/Google Play/dynamic-platform drafts are only ever visible inside the Slack confirmation card. This hook makes any rendered platform's content available to whichever UI element wants to display it (today: `LivePreviewPanel` via `markdown` prop, unchanged). `setActivePlatform` is exposed for a future `PlatformTabs` wiring — not built today, per scope.

- [ ] **Step 1: Add `activePlatformId` to the dashboard store**

Replace the full content of `src/hooks/use-dashboard-store.ts` with:

```ts
import { create } from 'zustand';
import type { Commit } from '@/types/commit.ts';
import type { ReleaseEntry } from '@/types/release-entry.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';
import { KnownPlatformId } from '@/types/platform.ts';

export interface DashboardThreadState {
  commits: Commit[];
  selectedHashes: string[];
  entries: ReleaseEntry[];
  draft: ReleaseNotesDraft | null;
  activePlatformId: string;
}

export const EMPTY_DASHBOARD_THREAD_STATE: DashboardThreadState = {
  commits: [],
  selectedHashes: [],
  entries: [],
  draft: null,
  activePlatformId: KnownPlatformId.Github,
};

const toCommit = (entry: ReleaseEntry): Commit => ({
  hash: entry.id,
  type: entry.breaking ? 'breaking' : entry.type,
  message: entry.title,
  author: entry.author,
  timestamp: entry.timestamp,
});

interface DashboardStoreState {
  threads: Record<string, DashboardThreadState>;
  showEntryList: (threadId: string, entries: ReleaseEntry[]) => void;
  showDraft: (threadId: string, draft: ReleaseNotesDraft) => void;
  toggleHash: (threadId: string, hash: string) => void;
  setActivePlatform: (threadId: string, platformId: string) => void;
}

// Not persisted: entries/draft are driven by the tool-call render below, which
// replays from Mastra's own persisted history on reconnect — a second,
// client-side persisted copy of the same data is a source of drift, not safety.
export const useDashboardStore = create<DashboardStoreState>()((set) => ({
  threads: {},
  // Idempotent by data, not by toolCallId history: a tool re-render triggered by
  // switching back to an already-visited thread carries the same entries/draft the
  // thread already has, so this is a no-op instead of a stale reset — and avoids
  // a visible flicker from an unnecessary state change.
  showEntryList: (threadId, entries) =>
    set((state) => {
      const current = state.threads[threadId];
      if (current && JSON.stringify(current.entries) === JSON.stringify(entries)) {
        return state;
      }

      const commits = entries.map(toCommit);
      return {
        threads: {
          ...state.threads,
          [threadId]: {
            commits,
            selectedHashes: commits.map((commit) => commit.hash),
            entries,
            draft: current?.draft ?? null,
            activePlatformId: current?.activePlatformId ?? KnownPlatformId.Github,
          },
        },
      };
    }),
  showDraft: (threadId, draft) =>
    set((state) => {
      const current = state.threads[threadId];
      if (current && JSON.stringify(current.draft) === JSON.stringify(draft)) {
        return state;
      }

      return {
        threads: {
          ...state.threads,
          [threadId]: { ...(current ?? EMPTY_DASHBOARD_THREAD_STATE), draft },
        },
      };
    }),
  toggleHash: (threadId, hash) =>
    set((state) => {
      const current = state.threads[threadId] ?? EMPTY_DASHBOARD_THREAD_STATE;
      const selected = new Set(current.selectedHashes);
      if (selected.has(hash)) {
        selected.delete(hash);
      } else {
        selected.add(hash);
      }
      return {
        threads: {
          ...state.threads,
          [threadId]: { ...current, selectedHashes: [...selected] },
        },
      };
    }),
  setActivePlatform: (threadId, platformId) =>
    set((state) => {
      const current = state.threads[threadId] ?? EMPTY_DASHBOARD_THREAD_STATE;
      if (current.activePlatformId === platformId) {
        return state;
      }
      return {
        threads: {
          ...state.threads,
          [threadId]: { ...current, activePlatformId: platformId },
        },
      };
    }),
}));
```

Note `showEntryList` now explicitly carries `activePlatformId` forward (`current?.activePlatformId ?? KnownPlatformId.Github`) — without this line, a re-paste of commits would silently reset which platform the user was viewing, because `showEntryList` replaces the whole thread object rather than spreading `current`.

- [ ] **Step 2: Create the hook**

`src/hooks/use-platform-preview.ts`:

```ts
import { EMPTY_DASHBOARD_THREAD_STATE, useDashboardStore } from '@/hooks/use-dashboard-store.ts';
import { useThreadStore } from '@/hooks/use-thread-store.ts';
import { buildPlatformOptions } from '@/lib/release-notes/platform-options.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type { PlatformOption } from '@/types/platform-option.ts';

interface UsePlatformPreviewResult {
  options: PlatformOption[];
  activePlatformId: string;
  activeContent: string | null;
  setActivePlatform: (platformId: string) => void;
}

// Falls back to GitHub when the thread's stored activePlatformId no longer
// matches any option in the current draft (e.g. a redraft dropped a dynamic
// platform the user had been viewing).
export const usePlatformPreview = (): UsePlatformPreviewResult => {
  const threadId = useThreadStore((state) => state.threadId);
  const threadState = useDashboardStore(
    (state) => state.threads[threadId] ?? EMPTY_DASHBOARD_THREAD_STATE,
  );
  const setActivePlatformAction = useDashboardStore(
    (state) => state.setActivePlatform,
  );

  const options = threadState.draft ? buildPlatformOptions(threadState.draft) : [];
  const activePlatformId = options.some(
    (option) => option.platformId === threadState.activePlatformId,
  )
    ? threadState.activePlatformId
    : KnownPlatformId.Github;
  const activeContent =
    options.find((option) => option.platformId === activePlatformId)?.content ??
    null;

  const setActivePlatform = (platformId: string) =>
    setActivePlatformAction(threadId, platformId);

  return { options, activePlatformId, activeContent, setActivePlatform };
};
```

- [ ] **Step 3: Wire `DashboardPage` to the hook**

Replace the full content of `src/routes/DashboardPage.tsx` with:

```tsx
import { useEffect, useRef } from 'react';
import CommitListPanel from '@/components/commit-list/CommitListPanel.tsx';
import LivePreviewPanel from '@/components/release-notes/LivePreviewPanel.tsx';
import CopilotAssistantPanel from '@/components/chat/CopilotAssistantPanel.tsx';
import SplitPane from '@/layouts/SplitPane.tsx';
import { useShowEntryListTool } from '@/hooks/use-show-entry-list-tool.tsx';
import { useEntrySelectionContext } from '@/hooks/use-entry-selection-context.ts';
import { useRenderReleaseNotesPreviewTool } from '@/hooks/use-render-release-notes-preview-tool.tsx';
import { useConfirmSlackPublishTool } from '@/hooks/use-confirm-slack-publish-tool.tsx';
import { useCurrentDraftContext } from '@/hooks/use-current-draft-context.ts';
import {
  EMPTY_DASHBOARD_THREAD_STATE,
  useDashboardStore,
} from '@/hooks/use-dashboard-store.ts';
import { useThreadStore } from '@/hooks/use-thread-store.ts';
import { usePlatformPreview } from '@/hooks/use-platform-preview.ts';

const DashboardPage = () => {
  const threadId = useThreadStore((state) => state.threadId);

  // useFrontendTool/useRenderTool register their `render` closure once (see
  // use-show-entry-list-tool.tsx / use-render-release-notes-preview-tool.tsx) — a
  // callback that closed over `threadId` directly would keep reporting the thread
  // that was active at mount. Read the current thread through a ref instead.
  const threadIdRef = useRef(threadId);
  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const threadState = useDashboardStore(
    (state) => state.threads[threadId] ?? EMPTY_DASHBOARD_THREAD_STATE,
  );
  const showEntryList = useDashboardStore((state) => state.showEntryList);
  const showDraft = useDashboardStore((state) => state.showDraft);
  const toggleHash = useDashboardStore((state) => state.toggleHash);

  useShowEntryListTool({
    onEntryListShown: (entries) => showEntryList(threadIdRef.current, entries),
  });

  useRenderReleaseNotesPreviewTool({
    onDraftRendered: (draft) => showDraft(threadIdRef.current, draft),
  });

  useConfirmSlackPublishTool({ draft: threadState.draft });

  const selectedHashes = new Set(threadState.selectedHashes);
  const activeEntries = threadState.entries.filter((entry) =>
    selectedHashes.has(entry.id),
  );

  useEntrySelectionContext({ entries: activeEntries });
  useCurrentDraftContext({ draft: threadState.draft });

  const handleToggle = (hash: string) => toggleHash(threadId, hash);

  const { activeContent } = usePlatformPreview();

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
            commits={threadState.commits}
            selectedHashes={selectedHashes}
            onToggle={handleToggle}
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

The only functional change from the original: `activeContent` (defaults to the GitHub draft, exactly matching prior behavior) replaces the hardcoded `composeGithubContent(threadState.draft)` call. When `setActivePlatform` is wired into a UI control later, `LivePreviewPanel` will show whichever platform the user picked with zero further changes to this file.

- [ ] **Step 4: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean. `composeGithubContent` should no longer show as an unused import anywhere (it's still used inside `platform-options.ts` and `release-title.ts`, just not directly in `DashboardPage.tsx`).

- [ ] **Step 5: Manual smoke check**

With both dev servers running: paste a git log, ask for a draft covering GitHub + App Store + Google Play. Confirm Live Preview still shows the GitHub markdown (default `activePlatformId` is `github`, matching pre-refactor behavior). Open the Slack confirmation card and switch its platform tabs — confirm this does **not** change what Live Preview shows (the two are intentionally independent state today; `setActivePlatform` is unused by any component yet). This is expected, not a bug — flagging it here so it isn't mistaken for one during review.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-dashboard-store.ts src/hooks/use-platform-preview.ts src/routes/DashboardPage.tsx
git commit -m "feat: add usePlatformPreview hook for dynamic-platform draft content"
```

Open a PR for `refactor/platform-preview-hook` against `main` once both tasks are committed — do not merge without the user's review.

---

## Branch 2 — `feat/export-release-notes-hook`

Depends on Branch 1 being merged (uses `usePlatformPreview` and `PlatformOption`). Create this branch from `main` **after** Branch 1 lands, or from `refactor/platform-preview-hook` if working ahead of the merge — note which in the PR description.

### Task 3: Export lib — format conversion

**Files:**
- Create: `src/types/export-format.ts`
- Create: `src/lib/export/strip-markdown.ts`
- Create: `src/lib/export/build-export-file.ts`

**Interfaces:**
- Produces: `ExportFormat` const enum, `buildExportFile(platform: PlatformOption, entries: ReleaseEntry[], format: ExportFormat): { filename: string; mimeType: string; content: string }` — consumed by Task 4's `useExportReleaseNotes`.

**Why:** App Inventory §6.4 — no export code exists at all (`src/lib/export/` is empty). This task builds the pure conversion logic per the skill's per-format rules (Markdown as-is, plain text strips Markdown syntax, JSON is structured by classification) with zero DOM/React dependency, so it stays testable in isolation even without a test runner installed today.

- [ ] **Step 1: Create the format enum**

`src/types/export-format.ts`:

```ts
export const enum ExportFormat {
  Markdown = 'markdown',
  PlainText = 'plain-text',
  Json = 'json',
}
```

- [ ] **Step 2: Create the Markdown-stripping helper**

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

- [ ] **Step 3: Create the export-file builder**

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

- [ ] **Step 4: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 5: Manual sanity check (no test runner available)**

Temporarily add this snippet inside any existing file you're already touching in Task 4 (or paste into the browser console after Task 4's UI wiring is live) and confirm the shape by eye — remove it before committing:

```ts
import { buildExportFile } from '@/lib/export/build-export-file.ts';
import { ExportFormat } from '@/types/export-format.ts';

console.log(
  buildExportFile(
    { platformId: 'github', label: 'GitHub', content: '## Features\n- **Add** thing (`abc123`)' },
    [{ source: 'commit', id: 'abc123', author: 'a', timestamp: '2026-01-01T00:00:00Z', title: 'feat: add thing', type: 'feat', breaking: false }],
    ExportFormat.Json,
  ),
);
```

Expected console output: an object with `filename: "release-notes-github.json"`, `mimeType: "application/json"`, and `content` a JSON string containing one `feat`-type section with the one entry.

- [ ] **Step 6: Commit**

```bash
git checkout -b feat/export-release-notes-hook
git add src/types/export-format.ts src/lib/export/strip-markdown.ts src/lib/export/build-export-file.ts
git commit -m "feat: add pure export-format conversion for release notes"
```

---

### Task 4: `useExportReleaseNotes` hook + wire the Export button

**Files:**
- Create: `src/hooks/use-export-release-notes.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `usePlatformPreview` (Task 2), `buildExportFile`/`ExportFormat` (Task 3).
- Produces: `useExportReleaseNotes(): { canExport: boolean; exportDraft: (options: { format: ExportFormat }) => void }`.

**Why:** App Inventory §6.4 — the Export button in the header has no `onClick` at all. This wires a real browser download (Blob + object URL + a transient `<a download>` element — this is a real Vite web app in a real browser, not a sandboxed preview, so this pattern works normally) without adding any new UI component; `App.tsx`'s existing `Button` already supports `disabled` and `onClick` via native prop spreading (confirmed in `src/components/common/Button.tsx`).

- [ ] **Step 1: Create the hook**

`src/hooks/use-export-release-notes.ts`:

```ts
import { EMPTY_DASHBOARD_THREAD_STATE, useDashboardStore } from '@/hooks/use-dashboard-store.ts';
import { useThreadStore } from '@/hooks/use-thread-store.ts';
import { usePlatformPreview } from '@/hooks/use-platform-preview.ts';
import { buildExportFile } from '@/lib/export/build-export-file.ts';
import { ExportFormat } from '@/types/export-format.ts';

interface ExportOptions {
  format: ExportFormat;
}

interface UseExportReleaseNotesResult {
  canExport: boolean;
  exportDraft: (options: ExportOptions) => void;
}

export const useExportReleaseNotes = (): UseExportReleaseNotesResult => {
  const threadId = useThreadStore((state) => state.threadId);
  const threadState = useDashboardStore(
    (state) => state.threads[threadId] ?? EMPTY_DASHBOARD_THREAD_STATE,
  );
  const { options, activePlatformId } = usePlatformPreview();

  const activeOption = options.find(
    (option) => option.platformId === activePlatformId,
  );

  const exportDraft = ({ format }: ExportOptions): void => {
    if (!activeOption) return;

    const selectedHashes = new Set(threadState.selectedHashes);
    const activeEntries = threadState.entries.filter((entry) =>
      selectedHashes.has(entry.id),
    );

    const file = buildExportFile(activeOption, activeEntries, format);
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

`canExport` is `false` until a draft exists for the currently active platform — this is the signal `App.tsx` uses to disable the button, so there is no need for a separate "no draft yet" click-time check in the UI layer.

- [ ] **Step 2: Wire the Export button**

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
import { useExportReleaseNotes } from '@/hooks/use-export-release-notes.ts';
import { ExportFormat } from '@/types/export-format.ts';

const HeaderActions = () => {
  const { canExport, exportDraft } = useExportReleaseNotes();

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

This defaults the button to a Markdown export of whichever platform is currently active in `usePlatformPreview` (GitHub, until Task 2's `setActivePlatform` is wired into a visible control). A format/platform picker is a UI-layer decision explicitly out of scope for this plan — `exportDraft` already accepts any `ExportFormat`, so a future dropdown just needs to call it with a different value.

- [ ] **Step 3: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 4: Manual smoke check**

With both dev servers running: before any commits are parsed, confirm the Export button renders disabled (greyed out, `disabled:opacity-50` from `Button.tsx`). Paste a git log, ask for a draft. Confirm the button becomes enabled and clicking it downloads a file named `release-notes-github.md` whose content is the GitHub draft body (no title line — matches the app's title-is-prepended-elsewhere convention, so the exported file intentionally has no `# Release Notes - #...` heading; this is consistent with how `LivePreviewPanel` also shows body-only content today).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-export-release-notes.ts src/App.tsx
git commit -m "feat: wire Export button to download the active platform draft"
```

Open a PR for `feat/export-release-notes-hook` — note in the description whether it was branched from `main` or from `refactor/platform-preview-hook`, so the reviewer diffs against the right base.

---

## Branch 3 — `feat/staged-suggestions-hook`

Independent of Branches 1 and 2 — can be done first, last, or in parallel by a second engineer.

### Task 5: `useStagedSuggestions` hook

**Files:**
- Create: `src/hooks/use-staged-suggestions.ts`
- Modify: `src/components/chat/CopilotAssistantPanel.tsx`

**Interfaces:**
- Produces: `useStagedSuggestions(): void` — called once from `CopilotAssistantPanel`, no return value (side-effects via `useConfigureSuggestions`, same pattern the code it replaces already used).

**Why:** App Inventory §6.5 — today's suggestions are 3 static edit-actions (`Make it shorter`, `Translate to VI`, `Add emojis`) shown `available: 'always'`, even before any commit has been parsed. The user's requirement is staged suggestions: nothing parsed → suggest pasting input; parsed but no draft → suggest building; draft exists → suggest edits and publishing. This hook reads the same `useDashboardStore` thread state every other feature in this plan reads, so "stage" is derived from real state, not a separate flag to keep in sync.

- [ ] **Step 1: Create the hook**

`src/hooks/use-staged-suggestions.ts`:

```ts
import { useConfigureSuggestions } from '@copilotkit/react-core/v2';
import { EMPTY_DASHBOARD_THREAD_STATE, useDashboardStore } from '@/hooks/use-dashboard-store.ts';
import { useThreadStore } from '@/hooks/use-thread-store.ts';
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

// Guides the user through the flow one stage at a time: nothing parsed yet ->
// prompt for input; parsed but no draft -> prompt to build; draft exists ->
// offer edits and publishing. Never mixes stages so the suggestion list always
// points at the single next action, not a menu of everything possible.
export const useStagedSuggestions = (): void => {
  const threadId = useThreadStore((state) => state.threadId);
  const threadState = useDashboardStore(
    (state) => state.threads[threadId] ?? EMPTY_DASHBOARD_THREAD_STATE,
  );

  const suggestions =
    threadState.entries.length === 0
      ? PARSE_STAGE_SUGGESTIONS
      : threadState.draft === null
        ? SELECT_STAGE_SUGGESTIONS
        : DRAFT_STAGE_SUGGESTIONS;

  useConfigureSuggestions({
    consumerAgentId: RELEASE_COPILOT_AGENT_ID,
    suggestions,
    available: 'always',
  });
};
```

- [ ] **Step 2: Wire it into `CopilotAssistantPanel`**

In `src/components/chat/CopilotAssistantPanel.tsx`, replace:

```tsx
import { forwardRef, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CopilotChat,
  useConfigureSuggestions,
  type CopilotChatAssistantMessage,
  type CopilotChatUserMessage,
} from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import { COPILOTKIT_RESOURCE_ID } from '@/constants/copilotkit.ts';
import { useClickOutside } from '@/hooks/use-click-outside.ts';
import { THREADS_QUERY_KEY, useThreads } from '@/hooks/use-threads.ts';
import { useThreadStore } from '@/hooks/use-thread-store.ts';
import { createUUID } from '@/lib/uuid.ts';
import type { ThreadSummary } from '@/types/thread.ts';
import AssistantMessageBubble from './AssistantMessageBubble.tsx';
import ThreadListDropdown from './ThreadListDropdown.tsx';
import UserMessageBubble from './UserMessageBubble.tsx';

const QUICK_ACTION_SUGGESTIONS = [
  { title: 'Make it shorter', message: 'Make it shorter' },
  { title: 'Translate to VI', message: 'Translate to VI' },
  { title: 'Add emojis', message: 'Add emojis' },
];
```

with:

```tsx
import { forwardRef, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CopilotChat,
  type CopilotChatAssistantMessage,
  type CopilotChatUserMessage,
} from '@copilotkit/react-core/v2';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agents';
import { COPILOTKIT_RESOURCE_ID } from '@/constants/copilotkit.ts';
import { useClickOutside } from '@/hooks/use-click-outside.ts';
import { useStagedSuggestions } from '@/hooks/use-staged-suggestions.ts';
import { THREADS_QUERY_KEY, useThreads } from '@/hooks/use-threads.ts';
import { useThreadStore } from '@/hooks/use-thread-store.ts';
import { createUUID } from '@/lib/uuid.ts';
import type { ThreadSummary } from '@/types/thread.ts';
import AssistantMessageBubble from './AssistantMessageBubble.tsx';
import ThreadListDropdown from './ThreadListDropdown.tsx';
import UserMessageBubble from './UserMessageBubble.tsx';
```

(`RELEASE_COPILOT_AGENT_ID` stays imported — it's still used by `<CopilotChat agentId={RELEASE_COPILOT_AGENT_ID} .../>` further down in the same file.)

Then replace:

```tsx
  useConfigureSuggestions({
    consumerAgentId: RELEASE_COPILOT_AGENT_ID,
    suggestions: QUICK_ACTION_SUGGESTIONS,
    available: 'always',
  });
```

with:

```tsx
  useStagedSuggestions();
```

- [ ] **Step 3: Verify**

```bash
pnpm lint
pnpm build
```

Expected: both clean.

- [ ] **Step 4: Manual smoke check**

With both dev servers running, open the app fresh (new chat via "New Chat" so `entries.length === 0`): confirm the suggestion chips read "Paste a git log" / "Paste a PR title", not the old edit-action chips. Paste a git log and let it classify: confirm suggestions switch to "Draft for GitHub" / "Draft for all platforms". Ask for a draft: confirm suggestions switch to "Make it shorter" / "Translate to VI" / "Post to Slack".

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/staged-suggestions-hook
git add src/hooks/use-staged-suggestions.ts src/components/chat/CopilotAssistantPanel.tsx
git commit -m "feat: replace static suggestions with flow-staged useStagedSuggestions"
```

Open a PR for `feat/staged-suggestions-hook` against `main`.

---

## Task 6: End-of-day verification

Run once all branches for today are pushed, regardless of how many merged.

**Files:** none — verification only.

- [ ] **Step 1: Full lint + build on each branch**

```bash
pnpm lint && pnpm build
```

Run on every branch above before opening its PR — not just the last one touched.

- [ ] **Step 2: Cross-feature manual pass**

With both dev servers running, walk the full flow once end-to-end on `main` after merging whichever branches the user approved today:

1. New Chat → paste a git log → confirm "Paste" stage suggestions were showing beforehand.
2. Let it classify → confirm "Draft" stage suggestions appear, Export button still disabled.
3. Ask for a draft (all 3 platforms) → confirm Live Preview shows GitHub content, Export button enables, "edit/publish" stage suggestions appear.
4. Click Export → confirm a `release-notes-github.md` file downloads with the GitHub body.
5. Ask to post to Slack → confirm the Slack card still shows all platforms with working tabs (regression check on Task 1's refactor).

- [ ] **Step 3: Update the app inventory doc**

In `docs/architecture/app-inventory.md` §6.7, update the status table for whichever of Dynamic platform / Download / Suggestions moved from ❌/⚠️ to ✅ today, and note in §5.7 that Branch 1/2/3 close out roadmap tasks 07 (partial — data path only, no `PlatformTabs` UI yet), 09, and 05 respectively.

---

## Self-Review Notes

- **Spec coverage:** All 3 required gaps from the feature checklist are covered — dynamic-platform content path (Task 2), download (Tasks 3-4), staged suggestions (Task 5). Multiple threads and Slack sending were already ✅ per the inventory and are untouched. Commits/PRs parsing was already ✅ (prompt-driven) and is untouched.
- **Explicitly out of scope, by the user's own framing ("không quan tâm UI có gì"):** a visible `PlatformTabs` control wired to `setActivePlatform`, a format/platform picker for Export, and any new suggestion-chip styling. Each hook exposes what a future UI needs (`setActivePlatform`, `exportDraft(format)`) without this plan building that UI.
- **Placeholder scan:** no TBD/TODO/"add error handling" left in any step; every code block is complete and copy-pasteable.
- **Type consistency check:** `PlatformOption` (Task 1) flows unchanged into `usePlatformPreview` (Task 2) and `useExportReleaseNotes` (Task 4); `ExportFormat` (Task 3) flows unchanged into `useExportReleaseNotes` (Task 4) and `App.tsx`'s `onClick`; `DashboardThreadState.activePlatformId` (Task 2, Step 1) is read by both `usePlatformPreview` and `useStagedSuggestions` via the same `EMPTY_DASHBOARD_THREAD_STATE` fallback pattern already used everywhere else in the codebase.
