# Skill doc sync — Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Last unit in this pass. The `release-notes-copilot` skill's "Where new code goes" map
(`.claude/skills/release-notes-copilot/SKILL.md:91-116`) currently documents
`src/components/chat/`, `commit-list/`, `release-notes/`, `platform-selector/` but has
no entry for `src/components/common/`, `src/layouts/`, or `src/components/history/` —
all three are introduced by this pass (units 2-13, 20-22). Once every other unit has
landed, this syncs the doc so future work (this skill is loaded before any
release-notes-copilot work per `AGENTS.md`) has an accurate folder map.

## Files

- Modify: `.claude/skills/release-notes-copilot/SKILL.md:104-110`

## Change

Insert two new bullets before the existing `src/components/chat/` line, and one new
bullet after the existing `src/components/platform-selector/` line:

```diff
+- `src/components/common/` — base, reusable UI primitives with no feature knowledge
+  (`Button`, `Badge`, `Card`, `Tabs`, `Checkbox`, `Input`, `Avatar`, `MonoTag`)
+- `src/layouts/` — app structural chrome, route-agnostic (`AppHeader`, `AppShell`,
+  `SplitPane`)
 - `src/components/chat/` — CopilotKit chat panel UI
 - `src/components/commit-list/` — commit list: badges, filter tabs (All/Feat/Fix),
   per-entry select checkboxes (the pre-filter step above)
 - `src/components/release-notes/` — live preview/editor for the generated output, plus
   Copy button and export-format trigger
 - `src/components/platform-selector/` — UI to pick GitHub / App Store-TestFlight / Google Play
+- `src/components/history/` — release history list + per-version detail view (search,
+  status badge, per-platform notes)
 - `src/hooks/` — hooks wrapping CopilotKit chat/agent state and commit-selection state for
   the release-notes flow
```

## Composes

Nothing — documentation-only change, no code.

## Verification

- No `pnpm lint`/`pnpm build` check applies (Markdown, not source). Verify by re-reading
  the edited section and confirming every folder created in units 1-22 of this plan now
  has a corresponding bullet, and no existing bullet's wording was altered beyond the
  insertions above.
