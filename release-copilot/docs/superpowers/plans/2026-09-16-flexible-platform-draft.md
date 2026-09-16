# Flexible Platform Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `ReleaseNotesDraftSchema`'s three hardcoded platform fields
(`github`/`appStore`/`googlePlay`) plus its `platforms[]` escape hatch with a single
flat `{ platform, label, content }` slot, so one `renderReleaseNotesPreview` tool call
always produces exactly one platform's content and any destination name is valid —
no per-platform hardcoding anywhere in the draft/live-UI path.

**Architecture:** `PlatformDraftSchema` keeps its name (so `ReleaseHistoryRecordSchema`
keeps compiling untouched) but its three fields become `platform`/`label`/`content`,
with `characterLimit` and all repo-side length enforcement removed.
`ReleaseNotesDraftSchema` spreads `PlatformDraftSchema.shape` onto its release-metadata
fields instead of nesting an array. Every current-draft consumer (Live Preview, export,
Slack publish) collapses from "pick one of several platform options" to "there is
exactly one," and the title line stops branching on GitHub vs. everything else.
History (storage, `ReleaseHistoryRecordSchema`, `HistoryPage.tsx`, `KnownPlatformId`)
is explicitly untouched — a separate future plan.

**Tech Stack:** TypeScript (strict), Zod, React, Zustand, CopilotKit (`@copilotkit/react-core/v2`), Mastra tools.

**Spec:** `docs/superpowers/specs/2026-09-15-flexible-platform-draft-design.md`

## Global Constraints

- No `any` — use `unknown` + narrowing or a proper type (`.agents/rules/code-style.md`).
- `import type` for type-only imports; explicit `.ts`/`.tsx` extensions on relative
  imports (bundler resolution style already used in this repo).
- Single quotes, semicolons, 2-space indent, trailing commas on multiline.
- Arrow functions only, `const` by default — this repo's ES6 rule for new/touched code.
- `pnpm lint` and `pnpm build` (`tsc -b && vite build`) must both pass clean before any
  task counts as done. This repo has **no unit tests and no Storybook verification
  step** — lint + build (+ the manual checks called out per task) is the full
  verification loop; do not add a test runner or `.stories.tsx` file as part of this
  plan.
- Never touch `ReleaseHistoryRecordSchema`, `releases-repository.ts`,
  `save-release-history-request.ts`, `save-release-history-route.ts`,
  `use-release-history.ts`, `HistoryPage.tsx`, `ReleaseDetailHeader.tsx`, or
  `src/types/platform.ts` (`KnownPlatformId`) in this plan — explicitly deferred to a
  future History-specific plan (see spec's "Out of scope").
- Never touch `src/types/confirm-slack-publish.ts` or the `confirmSlackPublish`
  tool/schema itself — only its UI-side consumer (`use-slack-publish.tsx`) changes.
- No direct commits to `main`/`v2-dev`; this work lands on its own feature branch.
- Commits follow Conventional Commits (this repo's own classifier parses them the same
  way — see `.agents/rules/git-rules.md`).

---

## Task 1: Rewrite the draft schema

**Files:**
- Modify: `src/types/release-notes-draft.ts`

**Interfaces:**
- Produces: `PlatformDraftSchema` — Zod object `{ platform: string, label: string,
  content: string }`, all `.min(1)`. `type PlatformDraft = z.infer<typeof
  PlatformDraftSchema>`.
- Produces: `ReleaseNotesDraftSchema` — Zod object with `releaseDate`, `titleOverride`,
  `version`, `title` (all unchanged from today) plus `...PlatformDraftSchema.shape`.
  `type ReleaseNotesDraft = z.infer<typeof ReleaseNotesDraftSchema>` now has
  `platform: string`, `label: string`, `content: string` instead of `github`/
  `appStore`/`googlePlay`/`platforms`.
- Consumes: nothing from other tasks (this is the root of the dependency chain).

- [ ] **Step 1: Replace `PlatformDraftSchema` and remove the now-unused imports**

Open `src/types/release-notes-draft.ts`. Replace the whole file with:

```ts
import { z } from 'zod';
import { joinLines } from '../lib/text';

export const PlatformDraftSchema = z.object({
  platform: z
    .string()
    .min(1)
    .describe(
      joinLines(
        'Kebab-case platform identifier chosen freely based on what the user',
        'asked for (github, app-store, google-play, slack, email-customer,',
        'changelog, ...). No fixed list — any destination the user names is',
        'valid.',
      ),
    ),
  label: z
    .string()
    .min(1)
    .describe(
      'Display name shown to the user, e.g. "GitHub", "Customer Email".',
    ),
  content: z
    .string()
    .min(1)
    .describe(
      joinLines(
        'The rendered body for this one platform. Never write a title',
        "line — the app prepends it. No repo-enforced length limit —",
        "follow the target platform's own constraints from your",
        'instructions.',
      ),
    ),
});

export type PlatformDraft = z.infer<typeof PlatformDraftSchema>;

export const ReleaseNotesDraftSchema = z.object({
  releaseDate: z
    .string()
    .regex(/^\d{8}$/)
    .nullish()
    .describe(
      joinLines(
        'The release date as yyyymmdd (e.g. 20260901), normalized from whatever',
        'the user wrote. Set it ONLY when the user named a release date;',
        'ambiguous slash dates are day-first (1/9/2026 is 1 September 2026).',
        'Omit this field entirely when the user gave no date — the app then',
        "fills in today's date itself. Never guess a date.",
      ),
    ),
  titleOverride: z
    .string()
    .min(1)
    .describe(
      joinLines(
        'A replacement for the whole title line, used verbatim. Set it ONLY when',
        'the user explicitly asked for a different title (e.g. "title it v2.1.0',
        'Release"). Omit it otherwise — the app then builds a default title',
        'itself.',
      ),
    )
    .nullish(),
  version: z
    .string()
    .min(1)
    .nullish()
    .describe(
      joinLines(
        'MAJOR.MINOR.PATCH for this release, decided by you from conversation',
        'context: bump the version last saved for the release currently in',
        'progress, or start over at "1.0.0" when this build is for a clearly',
        'different set of commits/PRs than the one you were just iterating on.',
        'Omit only when you have no basis yet to decide — omitting suppresses',
        'saving this build to History.',
      ),
    ),
  title: z
    .string()
    .min(1)
    .nullish()
    .describe(
      joinLines(
        'A short label distinguishing this release from others built the same',
        'day (e.g. "Payment Gateway Update"). Required alongside `version` for',
        'this build to be saved to History — omit both together, never just one.',
      ),
    ),
  ...PlatformDraftSchema.shape,
});

export type ReleaseNotesDraft = z.infer<typeof ReleaseNotesDraftSchema>;
```

Note the `titleOverride` field: it kept a `.max(RELEASE_TITLE_CHARACTER_BUDGET)` before,
sourced from `lib-config.ts`. That import is dropped from this file along with
`RELEASE_NOTES_TITLE_PREFIX`/`APP_STORE_CHARACTER_LIMIT`/`GOOGLE_PLAY_CHARACTER_LIMIT`/
`PLATFORM_CHARACTER_LIMITS`/`RELEASE_TITLE_CHARACTER_BUDGET` — none of them are read by
this file anymore (the two character-limit constants and the title prefix move to being
read only where they're still needed: `release-title.ts` and `platform-formatting.ts`,
both already importing them independently). Dropping the `.max()` here is intentional,
not an oversight: it enforced the *title's* length, which is a separate concern from
platform content limits, and it's fine to also drop since the model is already told to
keep the title short in its own instructions — carrying it forward is optional, but
this plan drops it for simplicity since it isn't part of the platform-flexibility
problem this plan solves. If you'd rather keep it, that's a one-line addition, not a
blocker.

- [ ] **Step 2: Verify it compiles in isolation**

Run: `pnpm build`
Expected: FAILS — every consumer of `draft.github`/`draft.appStore`/`draft.googlePlay`/
`draft.platforms`/`PlatformDraft.platformId`/`PlatformDraft.body`/
`PlatformDraft.characterLimit` now has a type error. This is expected; each of those
call sites is fixed in a later task. Read the error list once so you know which files
Tasks 2–9 need to touch — it should match: `src/lib/release-notes/to-platform-drafts.ts`,
`src/lib/release-notes/platform-options.ts`, `src/lib/release-notes/release-title.ts`,
`src/store/draft-slice.ts`, `src/hooks/use-release-draft-view.ts`,
`src/routes/DashboardPage.tsx`, `src/hooks/use-release-export.ts`,
`src/lib/export/build-export-file.ts`, `src/hooks/use-slack-publish.tsx`,
`src/components/release-notes/SlackPublishCard.tsx`. If a different file shows up here
that this plan doesn't mention, stop and reconcile against the spec before continuing —
don't guess a fix for an unplanned file.

- [ ] **Step 3: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 2: SUPERSEDED — `PLATFORM_CHARACTER_LIMITS` stays

**Discovered during execution (not in the original spec):** `src/types/save-release-history-request.ts`
(`SaveReleaseHistoryRequestSchema`) turned out to be `ReleaseNotesDraftSchema.extend(...)`
— it inherited `github`/`appStore`/`googlePlay`/`platforms` from the live draft schema
directly, so Task 1 broke it too. Fixed by decoupling it into its own standalone schema
(see the note added to Task 1's Step 2 file list below) that recreates those four fields
itself, including the same save-time character-limit `superRefine` the live draft used
to have. That `superRefine` still needs `PLATFORM_CHARACTER_LIMITS` — so this constant
is **not** removed after all. `src/constants/config/lib-config.ts` is left completely
untouched by this plan.

`src/types/save-release-history-request.ts` is added to the file list this plan
touches, as an extension of Task 1 (same root cause: a hidden dependency on
`ReleaseNotesDraftSchema`'s old shape) rather than a task of its own — it required no
new interface other than what Task 1 already produces (`PlatformDraftSchema`,
`ReleaseNotesDraftSchema.shape.releaseDate`/`.titleOverride`).

- [x] Confirmed via `rg -n "PLATFORM_CHARACTER_LIMITS" src` that it now has exactly two
  references: its own definition in `lib-config.ts`, and the new
  `save-release-history-request.ts` consumer.

**Second discovery, same root cause:** `src/lib/release-notes/save-release-to-history.ts`
(`saveReleaseToHistory`, wired to the Live Preview Archive button and to
`useSlackPublish`'s post-send auto-save) spread the live `draft` directly into the
History save request (`saveReleaseHistory({...draft, version, title, entries})`). With
a single-platform draft there is no correct mapping onto History's required `github` +
optional `appStore`/`googlePlay`/`platforms` shape — inventing one (e.g. always writing
a Slack draft's content into the required `github` field) would silently corrupt saved
data, and building a real mapping means redesigning History's schema now, which is
explicitly out of scope. Per explicit decision: `saveReleaseToHistory()` is replaced
with a stub that always returns `{ ok: false, error: 'Saving to History is temporarily
unavailable while it is redesigned for the new flexible-platform draft model.' }` — no
store reads, no API call. The Archive button and Slack auto-save both already handle a
non-`ok` result (they show a "Save failed" state / log and continue), so no caller
needs a code change for this. Re-enabling this is History's own future plan's job, not
this one's.

---

## Task 3: Collapse the title composers

**Files:**
- Modify: `src/lib/release-notes/release-title.ts`

**Interfaces:**
- Consumes: `ReleaseNotesDraft` from Task 1 (`draft.content`, `draft.platform`,
  `draft.label` — this task only needs `draft.content`).
- Produces: `composeReleaseContent(draft: ReleaseNotesDraft, now?: Date): string` —
  replaces `composeGithubContent` and `composePlatformContent`. Tasks 6, 8, and 9 all
  import this.

- [ ] **Step 1: Replace the two composers with one**

In `src/lib/release-notes/release-title.ts`, delete:

```ts
export const composeGithubContent = (
  draft: ReleaseNotesDraft,
  now?: Date,
): string => `# ${buildReleaseTitle(draft, now)}\n\n${draft.github}`;

export const composePlatformContent = (
  draft: ReleaseNotesDraft,
  platformDraft: PlatformDraft,
  now?: Date,
): string => `${buildReleaseTitle(draft, now)}\n\n${platformDraft.body}`;
```

Replace with:

```ts
export const composeReleaseContent = (
  draft: ReleaseNotesDraft,
  now?: Date,
): string => `${buildReleaseTitle(draft, now)}\n\n${draft.content}`;
```

Per the spec's title-format decision: this is plain text (no `#` prefix) for every
platform, including GitHub — GitHub's own `##` section headers still live inside
`draft.content` itself, only the H1 line above them is gone.

Remove the now-unused `PlatformDraft` import (this file only needs `ReleaseNotesDraft`
after this change) — check the top of the file:

```ts
import type {
  PlatformDraft,
  ReleaseNotesDraft,
} from '../../types/release-notes-draft';
```

becomes:

```ts
import type { ReleaseNotesDraft } from '../../types/release-notes-draft';
```

Leave `formatReleaseDate`, `formatReleaseDateDisplay`, and `buildReleaseTitle`
untouched — none of them reference the removed fields.

- [ ] **Step 2: Confirm no stale references remain**

Run: `rg -n "composeGithubContent|composePlatformContent" src`
Expected: no matches.

- [ ] **Step 3: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 4: Delete the now-dead platform-list files

**Files:**
- Delete: `src/lib/release-notes/to-platform-drafts.ts`
- Delete: `src/lib/release-notes/platform-options.ts`
- Delete: `src/types/platform-option.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing — this task only removes dead code. Tasks 6, 8, and 9 replace every
  remaining import of `toPlatformDrafts`, `buildPlatformOptions`, and `PlatformOption`
  with `PlatformDraft` (from `src/types/release-notes-draft.ts`, already produced by
  Task 1) — do those replacements in this task too, since deleting these files without
  fixing their importers leaves the build broken until Task 6.

- [ ] **Step 1: Delete the three files**

```bash
rm src/lib/release-notes/to-platform-drafts.ts
rm src/lib/release-notes/platform-options.ts
rm src/types/platform-option.ts
```

- [ ] **Step 2: Find every remaining reference**

Run: `rg -n "to-platform-drafts|toPlatformDrafts|platform-options|buildPlatformOptions|platform-option\.ts|PlatformOption\b" src`

Expected matches (all fixed in later tasks, not this one): `src/hooks/use-release-draft-view.ts`,
`src/hooks/use-release-export.ts`, `src/hooks/use-flow-suggestions.ts` (only if it
imports the type — re-check; per Task 6 it shouldn't need to), `src/lib/export/build-export-file.ts`.
Do not fix these here — Task 6 (view hook) and Task 8 (export) own them respectively.
This step exists so you know the exact list before moving on.

- [ ] **Step 3: Save a checkpoint**

Save this working increment (the repo will not build again until Task 6 lands — that's
expected for this step; commit anyway so the deletion is its own reviewable change).

---

## Task 5: Simplify the draft store slice

**Files:**
- Modify: `src/store/draft-slice.ts`

**Interfaces:**
- Consumes: `ReleaseNotesDraft` from Task 1.
- Produces: `DraftThreadState` — now just `{ draft: ReleaseNotesDraft | null,
  savedVersion: string | null }` (no `activePlatformId`). `DraftSlice` — drops
  `setActivePlatform`. `EMPTY_DRAFT_THREAD_STATE` — drops `activePlatformId`. Task 6
  consumes this updated shape.

- [ ] **Step 1: Remove `activePlatformId` and `setActivePlatform`**

Replace the full contents of `src/store/draft-slice.ts` with:

```ts
import type { StateCreator } from 'zustand';
import type { EntriesSlice } from '@/store/entries-slice.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

export interface DraftThreadState {
  draft: ReleaseNotesDraft | null;
  savedVersion: string | null;
}

export const EMPTY_DRAFT_THREAD_STATE: DraftThreadState = {
  draft: null,
  savedVersion: null,
};

export interface DraftSlice {
  draftByThread: Record<string, DraftThreadState>;
  setDraft: (threadId: string, draft: ReleaseNotesDraft) => void;
  setSavedVersion: (threadId: string, version: string) => void;
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
  setSavedVersion: (threadId, version) =>
    set((state) => {
      const current = state.draftByThread[threadId] ?? EMPTY_DRAFT_THREAD_STATE;
      if (current.savedVersion === version) {
        return state;
      }
      return {
        draftByThread: {
          ...state.draftByThread,
          [threadId]: { ...current, savedVersion: version },
        },
      };
    }),
});
```

- [ ] **Step 2: Save a checkpoint**

Save this working increment per your project's version control workflow (the build is
still red until Task 6 — that's expected).

---

## Task 6: Simplify `useReleaseDraftView`

**Files:**
- Modify: `src/hooks/use-release-draft-view.ts`

**Interfaces:**
- Consumes: `EMPTY_DRAFT_THREAD_STATE`/`DraftThreadState` from Task 5;
  `composeReleaseContent` from Task 3; `ReleaseNotesDraft` from Task 1.
- Produces: `ReleaseDraftView` — now `{ draft: ReleaseNotesDraft | null, content: string
  | null }`. `useReleaseDraftView(): ReleaseDraftView`. Tasks 7, 8, and 9 all consume
  this new shape (`draft` + `content`, no `options`/`activePlatformId`/
  `setActivePlatform`).

- [ ] **Step 1: Drop the options/active-platform machinery**

Replace the full contents of `src/hooks/use-release-draft-view.ts` with:

```ts
import { useReleaseWorkspaceStore } from '@/store/release-workspace-store.ts';
import { EMPTY_DRAFT_THREAD_STATE } from '@/store/draft-slice.ts';
import { useThreadSession } from '@/hooks/use-thread-session.ts';
import { composeReleaseContent } from '@/lib/release-notes/release-title.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

export interface ReleaseDraftView {
  draft: ReleaseNotesDraft | null;
  content: string | null;
}

// Read-only projection of the draft slice — safe to call from any number of
// components or hooks. Tool registration lives only in useReleaseDraft()
// (use-release-draft.tsx), which must stay a single call site; calling
// useRenderTool from more than one mounted place would register the tool twice.
export const useReleaseDraftView = (): ReleaseDraftView => {
  const { threadId } = useThreadSession();
  const threadState = useReleaseWorkspaceStore(
    (state) => state.draftByThread[threadId] ?? EMPTY_DRAFT_THREAD_STATE,
  );

  return {
    draft: threadState.draft,
    content: threadState.draft
      ? composeReleaseContent(threadState.draft)
      : null,
  };
};
```

- [ ] **Step 2: Confirm the schema/store chain builds**

Run: `pnpm build`
Expected: still FAILS, but the error list should now only cover Tasks 7–9's files
(`src/routes/DashboardPage.tsx`, `src/hooks/use-release-export.ts`,
`src/lib/export/build-export-file.ts`, `src/hooks/use-slack-publish.tsx`,
`src/components/release-notes/SlackPublishCard.tsx`). If `to-platform-drafts.ts` or
`platform-options.ts` still show up, Task 4's deletion or this step missed an import —
fix before continuing.

- [ ] **Step 3: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 7: Update `DashboardPage`'s Live Preview wiring

**Files:**
- Modify: `src/routes/DashboardPage.tsx`

**Interfaces:**
- Consumes: `ReleaseDraftView` (`{ draft, content }`) from Task 6, via
  `useReleaseDraft()` (`src/hooks/use-release-draft.tsx`, itself unchanged — it just
  returns `useReleaseDraftView()`'s result plus tool registration).
- Produces: nothing new — leaf consumer.

- [ ] **Step 1: Switch `activeContent` to `content`**

In `src/routes/DashboardPage.tsx`, change:

```ts
const { activeContent } = useReleaseDraft();
```

to:

```ts
const { content } = useReleaseDraft();
```

and update every use of `activeContent` in the file (the `handleCopy` guard/return and
the `<LivePreviewPanel markdown={activeContent} ...>` prop) to `content`:

```tsx
const handleCopy = async (): Promise<boolean> => {
  if (!content) return false;
  return copyText(content);
};
```

```tsx
<LivePreviewPanel
  markdown={content}
  onCopy={handleCopy}
  onArchive={() => saveReleaseToHistory().then((result) => result.ok)}
/>
```

Nothing else in this file changes.

- [ ] **Step 2: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 8: Update export to work off a single platform

**Files:**
- Modify: `src/hooks/use-release-export.ts`
- Modify: `src/lib/export/build-export-file.ts`

**Interfaces:**
- Consumes: `ReleaseDraftView` from Task 6; `PlatformDraft` from Task 1.
- Produces: `buildExportFile(platform: PlatformDraft, entries: ReleaseEntry[], format:
  ExportFormat): ExportFile` — same name and return shape as before, parameter type
  changed from the now-deleted `PlatformOption` to `PlatformDraft`.

- [ ] **Step 1: Update `useReleaseExport`**

Replace the full contents of `src/hooks/use-release-export.ts` with:

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

// Owns the "Download" domain: reads the current draft and its title-included
// content via the read-only view hook, converts to the requested format, and
// triggers a real browser download. Registers no CopilotKit primitives —
// unlike useCommitEntries/useReleaseDraft/useSlackPublish/useFlowSuggestions,
// this hook is safe to call from more than one component.
export const useReleaseExport = (): UseReleaseExportResult => {
  const { selectedEntries } = useCommitEntriesView();
  const { draft, content } = useReleaseDraftView();

  const exportDraft = ({ format }: ExportOptions): void => {
    if (!draft || !content) return;

    const file = buildExportFile(
      { platform: draft.platform, label: draft.label, content },
      selectedEntries,
      format,
    );
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

  return { canExport: Boolean(draft && content), exportDraft };
};
```

Note `content` here (passed into the `{ platform, label, content }` literal) is the
title-included value from `useReleaseDraftView()`, not `draft.content` — this
preserves today's behavior where the exported file's body already carries the title
line.

- [ ] **Step 2: Update `buildExportFile`'s parameter type**

In `src/lib/export/build-export-file.ts`, change the import:

```ts
import type { PlatformOption } from '@/types/platform-option.ts';
```

to:

```ts
import type { PlatformDraft } from '@/types/release-notes-draft.ts';
```

and every `PlatformOption` type annotation in the file to `PlatformDraft`:

```ts
const buildJsonContent = (
  platform: PlatformDraft,
  entries: ReleaseEntry[],
): string =>
  JSON.stringify(
    { platform: platform.platform, sections: buildSections(entries) },
    null,
    2,
  );

export const buildExportFile = (
  platform: PlatformDraft,
  entries: ReleaseEntry[],
  format: ExportFormat,
): ExportFile => {
  const filename = `release-notes-${platform.platform}.${EXTENSION_BY_FORMAT[format]}`;
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

Note the two renames: `platform.platformId` → `platform.platform` (both in
`buildJsonContent`'s JSON output and the exported filename). `platform.content` stays
`platform.content` — unchanged, since `PlatformDraft` already names it that.

- [ ] **Step 3: Confirm the remaining error list**

Run: `pnpm build`
Expected: FAILS only on `src/hooks/use-slack-publish.tsx` and
`src/components/release-notes/SlackPublishCard.tsx` (Task 9).

- [ ] **Step 4: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 9: Simplify the Slack publish flow to one platform

**Files:**
- Modify: `src/hooks/use-slack-publish.tsx`
- Modify: `src/components/release-notes/SlackPublishCard.tsx`

**Interfaces:**
- Consumes: `ReleaseDraftView` (`{ draft, content }`) from Task 6.
- Produces: `SlackPublishCard` — new props `{ label: string, content: string, status,
  error, onCopy, onSend, onCancel }` (drops `options`, `selectedPlatformId`,
  `onPlatformChange`). Nothing downstream of this task consumes it — it's a leaf.

- [ ] **Step 1: Simplify `SlackPublishCard`**

Replace the full contents of `src/components/release-notes/SlackPublishCard.tsx` with:

```tsx
import Button, { ButtonVariant } from '@/components/common/Button.tsx';
import CopyButton, { type CopyHandler } from '@/components/common/CopyButton.tsx';

export const enum SlackPublishStatus {
  Idle = 'idle',
  Sending = 'sending',
  Sent = 'sent',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

interface SlackPublishCardProps {
  label: string;
  content: string;
  status: SlackPublishStatus;
  error?: string | null;
  onCopy: CopyHandler;
  onSend: () => void;
  onCancel: () => void;
}

const SlackPublishCard = ({
  label,
  content,
  status,
  error = null,
  onCopy,
  onSend,
  onCancel,
}: SlackPublishCardProps) => {
  if (status === SlackPublishStatus.Sent) {
    return (
      <div className="border-outline-variant text-body-md text-on-surface-variant rounded-xl border px-4 py-3">
        Posted to Slack.
      </div>
    );
  }

  if (status === SlackPublishStatus.Cancelled) {
    return (
      <div className="border-outline-variant text-body-md text-on-surface-variant rounded-xl border px-4 py-3">
        Not posted.
      </div>
    );
  }

  const isSending = status === SlackPublishStatus.Sending;

  return (
    <div className="border-outline-variant bg-surface-container-lowest flex flex-col gap-3 rounded-xl border p-4">
      <span className="text-body-lg text-on-surface">
        Announce this {label} release in Slack?
      </span>

      <div className="flex justify-end">
        <CopyButton
          variant={ButtonVariant.Ghost}
          className="border-primary border"
          onCopy={onCopy}
          disabled={isSending}
        />
      </div>

      <pre className="bg-surface-container text-body-md text-on-surface max-h-48 overflow-auto rounded-lg p-3 whitespace-pre-wrap">
        {content}
      </pre>

      {error && (
        <span className="text-body-md text-error" role="alert">
          {error}
        </span>
      )}

      <div className="flex gap-2">
        <Button onClick={onSend} disabled={isSending}>
          {isSending ? 'Sending…' : 'Send to Slack'}
        </Button>
        <Button
          variant={ButtonVariant.Ghost}
          onClick={onCancel}
          disabled={isSending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default SlackPublishCard;
```

(`PublishOption`, the `TabItem`/`PlatformTabs` import, and the `items`-building line are
all dropped — there is nothing left to pick between.)

- [ ] **Step 2: Simplify `useSlackPublish`**

Replace the full contents of `src/hooks/use-slack-publish.tsx` with:

```tsx
import { Fragment, useEffect, useState } from 'react';
import { useHumanInTheLoop } from '@copilotkit/react-core/v2';
import SlackPublishCard, {
  SlackPublishStatus,
} from '@/components/release-notes/SlackPublishCard.tsx';
import { useReleaseDraftView } from '@/hooks/use-release-draft-view.ts';
import { RELEASE_COPILOT_AGENT_ID } from '@/constants/agent-tools/agent-id.ts';
import { CONFIRM_SLACK_PUBLISH_TOOL_NAME } from '@/constants/agent-tools/tools-name.ts';
import { publishToSlack } from '@/services/publish-to-slack.ts';
import { saveReleaseToHistory } from '@/lib/release-notes/save-release-to-history.ts';
import { joinLines } from '@/lib/text.ts';
import { copyText } from '@/lib/clipboard.ts';
import { ConfirmSlackPublishSchema } from '@/types/confirm-slack-publish.ts';
import type { ReleaseNotesDraft } from '@/types/release-notes-draft.ts';

const reportRespondFailure = (error: unknown): void =>
  console.error('[useSlackPublish] respond() failed', error);

const RespondOnMount = ({
  message,
  respond,
}: {
  message: string;
  respond: (result: unknown) => Promise<void>;
}) => {
  useEffect(() => {
    void respond(message).catch(reportRespondFailure);
  }, [message, respond]);
  return <Fragment />;
};

interface PublishFlowProps {
  draft: ReleaseNotesDraft;
  content: string;
  respond: (result: unknown) => Promise<void>;
}

const PublishFlow = ({ draft, content, respond }: PublishFlowProps) => {
  // Freeze what the user reviewed at mount: they must send exactly what the
  // card showed, even if the draft changes again before they click.
  const [frozen] = useState({ label: draft.label, platform: draft.platform, content });
  const [status, setStatus] = useState<SlackPublishStatus>(
    SlackPublishStatus.Idle,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setStatus(SlackPublishStatus.Sending);
    setError(null);

    const result = await publishToSlack({
      platformId: frozen.platform,
      label: frozen.label,
      content: frozen.content,
    });

    if (result.ok) {
      setStatus(SlackPublishStatus.Sent);
      void saveReleaseToHistory().catch((error: unknown) =>
        console.error('[useSlackPublish] saveReleaseToHistory failed', error),
      );
      await respond(`Posted the ${frozen.label} release notes to Slack.`).catch(
        reportRespondFailure,
      );
      return;
    }

    setStatus(SlackPublishStatus.Failed);
    setError(result.error ?? 'Publishing failed.');
  };

  const handleCancel = async () => {
    setStatus(SlackPublishStatus.Cancelled);
    await respond('User declined — nothing was posted to Slack.').catch(
      reportRespondFailure,
    );
  };

  const handleCopy = () => copyText(frozen.content);

  return (
    <SlackPublishCard
      label={frozen.label}
      content={frozen.content}
      status={status}
      error={error}
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
  const { draft, content } = useReleaseDraftView();

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

        if (!draft || !content) {
          return (
            <RespondOnMount
              message="No draft exists yet — nothing was shown and nothing was posted."
              respond={props.respond}
            />
          );
        }

        return (
          <PublishFlow draft={draft} content={content} respond={props.respond} />
        );
      },
    },
    [draft, content],
  );
};
```

`props.args.platformId` (the model's optional hint from `ConfirmSlackPublishSchema`) is
intentionally not read anymore — there is only ever one platform to show, so the hint
has nothing left to disambiguate. `ConfirmSlackPublishSchema` itself is untouched, per
the Global Constraints.

- [ ] **Step 3: Full build and lint**

Run: `pnpm lint`
Expected: PASS, clean.

Run: `pnpm build`
Expected: PASS, clean (`tsc -b && vite build`).

- [ ] **Step 4: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

## Task 10: Manual verification pass

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Start the app**

Run: `pnpm dev:all`
Expected: Vite dev server and `mastra dev` both start without error; open the printed
Vite URL.

- [ ] **Step 2: Draft for a named platform and confirm it renders**

In the chat, paste a small git log (2–3 commits, at least one `feat:`/`fix:` each) and
ask: "Draft release notes for Slack." Confirm:
- Live Preview shows one platform's content, title line present, no leading `#`.
- No console error about `useReleaseDraftView` / `ReleaseNotesDraftSchema` parsing.

- [ ] **Step 3: Draft a second platform and confirm no leftover state**

In the same thread, ask: "Now draft it for GitHub." Confirm:
- Live Preview now shows only the GitHub content (title line still plain, no `#`;
  GitHub's own `##` section headers appear inside the body as usual).
- No trace of the Slack content remains visible — there is no tab to switch back to it.

- [ ] **Step 4: Export and Slack-publish still work**

Trigger a Markdown export (confirm the downloaded file's body starts with the plain
title line, not raw content). Ask to "post it to Slack," confirm the card shows the
current platform's label and content with no picker, click Send, confirm the posted
content matches what was previewed.

- [ ] **Step 5: History untouched**

Open the History page, confirm past releases still list and open correctly (this
exercises `ReleaseHistoryRecordSchema`/`PlatformDraftSchema` compiling together
unaffected by today's field rename, per the spec's "Out of scope" section).

---

## Self-Review Notes

- **Spec coverage:** Schema rewrite (Task 1), `PLATFORM_CHARACTER_LIMITS` removal (Task
  2), title-format decision (Task 3), dead-file deletion (Task 4), store/view
  simplification (Tasks 5–6), every consequence file the spec lists (`DashboardPage.tsx`
  — Task 7; `use-release-export.ts`/`build-export-file.ts` — Task 8;
  `use-slack-publish.tsx`/`SlackPublishCard.tsx` — Task 9) all have a task. History and
  `confirmSlackPublish` are explicitly left alone per the spec's deferred scope.
- **Type consistency:** `PlatformDraft` (`platform`/`label`/`content`) is the one shape
  used end-to-end from Task 1 through Task 9 — `ReleaseDraftView.content` is always the
  title-included string from `composeReleaseContent`, never confused with the raw
  `draft.content` field. `buildExportFile`'s parameter and `publishToSlack`'s call both
  use `platform`/`label`/`content` field names consistently, matching Task 1's schema.
- **No placeholders:** every step above either shows the exact replacement code or an
  exact `rg`/`pnpm` command with its expected output; none defer to "similar to Task N"
  or "handle appropriately."
