# Entry Selection Agent Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Feed the commit list panel's live checkbox selection to the release-copilot
agent via CopilotKit's `useAgentContext`, so a requested draft reflects exactly what
the user currently has checked instead of everything the agent originally classified.

**Architecture:** One new thin hook (`useEntrySelectionContext`) wraps
`useAgentContext` and takes an already-filtered `ReleaseEntry[]`; `DashboardPage`
(which already owns `entries`/`selectedHashes` state) does the filtering itself and
passes the result in — no new state ownership, no per-entry flag. Two prose edits to
`src/mastra/instructions/` teach the agent to use that context when rendering, and to
refuse instead of drafting an empty release when nothing is selected.

**Tech Stack:** React 19, TypeScript, `@copilotkit/react-core/v2` (`useAgentContext`),
Mastra (agent instructions only — no new tool/agent/workflow).

Spec: `docs/superpowers/specs/2026-08-14-entry-selection-agent-context-design.md`

## Global Constraints

- No `any`; `import type` for type-only imports (`verbatimModuleSyntax`); explicit
  `.ts`/`.tsx` extensions on relative imports — `.agents/rules/code-style.md`.
- Arrow functions only, `const` by default, single quotes, semicolons, 2-space indent,
  trailing commas on multiline — `.agents/rules/code-style.md`.
- Hook file name: kebab-case (`use-entry-selection-context.ts`) —
  `.agents/rules/conventions.md`.
- No test runner configured in this repo. Verification per task is `pnpm lint` and
  `pnpm build` (`tsc -b`) clean — same bar as the 2026-08-12/2026-08-13 specs — plus a
  final manual dev-server check (Task 5).
- Type-checked in advance: the exact hook code in Task 1 was verified against this
  project's real `tsconfig.app.json` via `npx tsc -p tsconfig.app.json --noEmit` before
  writing this plan — compiles clean, no cast needed for `ReleaseEntry[]` against
  `useAgentContext`'s `JsonSerializable` value type.
- **No `git commit` or `git push` in any task.** Session rule from the user: only stage
  changes (`git add`); the user commits themselves. This overrides this skill's default
  "every task ends with a commit" step.
- This agent is already registered in `src/mastra/index.ts` — no new agent/tool being
  added here, so no registration step is needed (only editing existing instruction
  string constants that are already wired into that registered agent).

---

### Task 1: `useEntrySelectionContext` hook

Spec: `docs/superpowers/specs/2026-08-14-entry-selection-agent-context-design.md`
("Data shape" section)

**Files:**

- Create: `src/hooks/use-entry-selection-context.ts`

**Interfaces:**

- Consumes: `useAgentContext` from `@copilotkit/react-core/v2`; `ReleaseEntry` type
  from `@/types/release-entry.ts` (already exists, unchanged).
- Produces: `useEntrySelectionContext({ entries: ReleaseEntry[] }): void` — consumed by
  `DashboardPage` in Task 2.

- [ ] **Step 1: Write `src/hooks/use-entry-selection-context.ts`**

```ts
import { useAgentContext } from '@copilotkit/react-core/v2';
import type { ReleaseEntry } from '@/types/release-entry.ts';

interface UseEntrySelectionContextOptions {
  entries: ReleaseEntry[];
}

export const useEntrySelectionContext = ({
  entries,
}: UseEntrySelectionContextOptions): void => {
  useAgentContext({
    description: 'The entries currently checked in the commit list panel.',
    value: { entries },
  });
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: clean (`tsc -b` prints nothing, exits 0, then `vite build` runs).

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: clean (no output, exits 0).

- [ ] **Step 4: Stage (do not commit)**

```bash
git add src/hooks/use-entry-selection-context.ts
```

---

### Task 2: Wire the hook into `DashboardPage`

Spec: `docs/superpowers/specs/2026-08-14-entry-selection-agent-context-design.md`
("Data shape" section)

**Files:**

- Modify: `src/routes/DashboardPage.tsx`

**Interfaces:**

- Consumes: `useEntrySelectionContext` from Task 1. `entries: ReleaseEntry[]` already
  arrives as the argument to `useShowEntryListTool`'s `onEntryListShown` callback
  (`src/hooks/use-show-entry-list-tool.ts`, unchanged by this plan).
- Produces: n/a — leaf UI wiring, nothing downstream depends on this task.

- [ ] **Step 1: Add the import**

In `src/routes/DashboardPage.tsx`, after the existing
`useShowEntryListTool` import:

```ts
import { useShowEntryListTool } from '@/hooks/use-show-entry-list-tool.ts';
import { useEntrySelectionContext } from '@/hooks/use-entry-selection-context.ts';
```

- [ ] **Step 2: Add `entries` state and rename the tool callback's parameter**

Current code:

```ts
const DashboardPage = () => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState<Platform>(Platform.AppStore);

  useShowEntryListTool({
    onEntryListShown: (entries) => {
      const nextCommits = entries.map(toCommit);
      setCommits(nextCommits);
      setSelectedHashes(new Set(nextCommits.map((commit) => commit.hash)));
    },
  });
```

Replace with:

```ts
const DashboardPage = () => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<ReleaseEntry[]>([]);
  const [platform, setPlatform] = useState<Platform>(Platform.AppStore);

  useShowEntryListTool({
    onEntryListShown: (nextEntries) => {
      const nextCommits = nextEntries.map(toCommit);
      setCommits(nextCommits);
      setSelectedHashes(new Set(nextCommits.map((commit) => commit.hash)));
      setEntries(nextEntries);
    },
  });

  const activeEntries = entries.filter((entry) => selectedHashes.has(entry.id));

  useEntrySelectionContext({ entries: activeEntries });
```

The callback parameter is renamed from `entries` to `nextEntries` to avoid shadowing
the new `entries` state variable declared in the same component scope. `ReleaseEntry`
is already imported (`import type { ReleaseEntry } from '@/types/release-entry.ts';`,
used by `toCommit`'s signature) — no new type import needed.

`handleToggle` and everything below it (`handleCopy`, the JSX return block) stays
unchanged.

- [ ] **Step 3: Type-check**

Run: `pnpm build`
Expected: clean.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 5: Stage (do not commit)**

```bash
git add src/routes/DashboardPage.tsx
```

---

### Task 3: Teach the agent to use the selection context when rendering

Spec: `docs/superpowers/specs/2026-08-14-entry-selection-agent-context-design.md`
("Instructions changes" section)

**Files:**

- Modify: `src/mastra/instructions/intro.ts`

**Interfaces:**

- Consumes: none (prose-only edit).
- Produces: none — `RELEASE_COPILOT_INSTRUCTIONS`
  (`src/mastra/instructions/index.ts`) already joins this file into
  `releaseCopilotAgent`'s `instructions`; no wiring change needed, the agent picks up
  the new text automatically.

- [ ] **Step 1: Append the selection-context rule to condition 2**

Current text (line 5 of the file, condition 2's paragraph):

```
2. The message asks for rendered release notes and classified entries exist (from condition 1 just now, or from earlier in the conversation) -> render using the Release Note Formatting rules below. Always generate all 3 platforms — GitHub (Markdown), App Store/TestFlight (plain text, max 4000 characters), Google Play (plain text, max 500 characters) — even when the user names only one. If one platform was named, still generate all 3 but lead your chat reply with that platform's content.
```

Replace with:

```
2. The message asks for rendered release notes and classified entries exist (from condition 1 just now, or from earlier in the conversation) -> render using the Release Note Formatting rules below. Always generate all 3 platforms — GitHub (Markdown), App Store/TestFlight (plain text, max 4000 characters), Google Play (plain text, max 500 characters) — even when the user names only one. If one platform was named, still generate all 3 but lead your chat reply with that platform's content. Before rendering, use the entries in the current entry-selection context — not the full list from condition 1 — since it reflects exactly what the user has checked in the commit list panel right now. If that context is empty, don't render — tell the user to select at least one entry first.
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: clean (this file has no type surface beyond a string constant, but keeps the
verification bar consistent with every other task).

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 4: Stage (do not commit)**

```bash
git add src/mastra/instructions/intro.ts
```

---

### Task 4: Document the empty-selection behavior in the App Usage FAQ

Spec: `docs/superpowers/specs/2026-08-14-entry-selection-agent-context-design.md`
("Instructions changes" section)

**Files:**

- Modify: `src/mastra/instructions/app-usage-faq.ts`

**Interfaces:**

- Consumes: none (prose-only edit).
- Produces: none — same join mechanism as Task 3, no wiring change needed.

- [ ] **Step 1: Append the empty-selection clause to the "Commit selection" section**

Current text:

```
## Commit selection

After classification, every entry appears in a commit list (author, relative
timestamp, hash, Feature/Fix/Breaking badge) with filter tabs (All/Feat/Fix) and a
per-entry checkbox. Only checked entries are used for drafting. Unchecking a commit
removes it from the pipeline entirely, not just from display. Changing the selection
after a draft already exists marks that draft as outdated — it does not redraft
automatically; ask again to regenerate it.
```

Replace with:

```
## Commit selection

After classification, every entry appears in a commit list (author, relative
timestamp, hash, Feature/Fix/Breaking badge) with filter tabs (All/Feat/Fix) and a
per-entry checkbox. Only checked entries are used for drafting. Unchecking a commit
removes it from the pipeline entirely, not just from display. Changing the selection
after a draft already exists marks that draft as outdated — it does not redraft
automatically; ask again to regenerate it. Asking to draft with nothing selected: the
agent will ask you to pick at least one entry first rather than generating an empty
draft.
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 4: Stage (do not commit)**

```bash
git add src/mastra/instructions/app-usage-faq.ts
```

---

### Task 5: Manual end-to-end verification

Spec: `docs/superpowers/specs/2026-08-14-entry-selection-agent-context-design.md`
("Verification" section)

**Files:** none — this task runs the app, no code changes.

**Interfaces:**

- Consumes: everything from Tasks 1–4, running together for the first time.
- Produces: n/a — terminal verification task for this plan.

- [ ] **Step 1: Start the Mastra backend**

Run (separate terminal or background process): `pnpm dev:mastra`
Expected: starts without error, serving the `/copilotkit` route
(`COPILOTKIT_ROUTE_PATH` in `src/constants/copilotkit.ts`).

- [ ] **Step 2: Start the frontend**

Run (separate terminal or background process): `pnpm dev`
Expected: Vite dev server starts; open the printed local URL in a browser.

- [ ] **Step 3: Classify a sample git log**

In the chat sidebar, paste:

```
commit a1b2c3d
Author: Jane Doe <jane@example.com>
Date:   Mon Jan 5 10:00:00 2026 +0000

    feat: add JSON export

commit e4f5g6h
Author: Jane Doe <jane@example.com>
Date:   Mon Jan 5 11:00:00 2026 +0000

    fix: correct sign-in crash
```

Expected: agent calls `showEntryList`; `CommitListPanel` renders 2 entries.

- [ ] **Step 4: Uncheck one entry and draft**

Uncheck the `fix: correct sign-in crash` entry's checkbox, then ask in chat: "Draft
release notes for GitHub."

Expected: the rendered GitHub output only mentions the JSON export entry — the
sign-in-crash fix is absent from all 3 platform outputs.

- [ ] **Step 5: Uncheck everything and ask to draft**

Uncheck the remaining entry, then ask: "Draft release notes."

Expected: the agent does not render any draft; it replies asking the user to select at
least one entry first (per Task 3's instruction change).

- [ ] **Step 6: Re-check an entry and confirm recovery**

Check the JSON export entry again, then ask: "Draft release notes for GitHub."

Expected: normal rendering resumes, including only the checked entry.
