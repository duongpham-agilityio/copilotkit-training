# 08 — Platform comparison grid

Date: 2026-08-22
Estimate: 1.5h · Branch: `feat/platform-comparison-grid` · Depends on: 07
Part of: [Overview](./00-overview-design.md) · Source: §4 Item 6 part 2 of the source
design

## Goal

Compare N release-note variants side by side in the chat, on a spoken request
("compare the App Store version with the Slack one").

This is idea ③, the chosen "A2UI" direction. **It is also the last thing to cut if
time runs out** — read the honesty note below before deciding to keep it.

## Files

**Create**
- `src/hooks/use-compare-platform-drafts-tool.tsx`
- `src/components/release-notes/PlatformComparisonGrid.tsx`
- `src/components/release-notes/stories/PlatformComparisonGrid.stories.tsx`

**Modify**
- `src/constants/tools.ts` — add `COMPARE_PLATFORM_DRAFTS_TOOL_NAME`
- `src/routes/DashboardPage.tsx` — call the new hook

## Design

### Tool

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

`.min(2)` blocks comparing a platform against itself at the schema level — cheaper
than checking in the component.

A `platformId` that is not in the draft → skip that entry, render the rest, and add a
note. **Do not** return an error card: the user still gets most of what they asked for
and can see what is missing.

### Component

A grid of `columns` columns. **The agent decides the column count** — that is what
makes this genuine generative UI rather than a fixed component. Two platforms → two
columns; four platforms → the agent may choose four columns or 2×2.

Each column reuses task 07's action bar (Copy / Export / Publish). Do not rewrite it —
if a rewrite is necessary, task 07 extracted it at the wrong boundary.

When `columns` is omitted, the app picks: 2→2, 3→3, 4→2 (giving 2×2).

The chat panel is narrow, so four columns will be cramped. The grid uses responsive
`grid-cols-*` and drops to two columns below a breakpoint — the agent's choice is an
*intent*, not a pixel-level command.

### An honest note about "A2UI"

Worth stating explicitly when presenting, instead of calling this A2UI:

This is **not** A2UI in the proper sense — A2UI is the agent emitting an entire UI
tree as data from a registered catalog, with actions returning via `dataContextPath`
pointing into a data branch. This is **generative UI at the tool-render level with a
parameterized layout**.

Two reasons:
1. The "consistent UI, shared actions" requirement (settled during the item 4 feedback
   round) **directly conflicts** with ceding layout control to the agent
2. Proper A2UI requires standing up a `CopilotRuntime` proxy in front of Mastra —
   roughly 8h of infrastructure alone; see §2 of the source design

Naming it accurately keeps the next demo from over-promising.

## Acceptance criteria

- [ ] "Compare the App Store and Google Play versions" → a correct 2-column grid
- [ ] "Compare all four" → the grid renders without overflowing the chat panel
- [ ] Agent passes a non-default `columns` → the grid honors it
- [ ] `platformIds` containing an unknown id → the rest still renders, plus a note
- [ ] Tool registered in `src/constants/tools.ts`, hook called in `DashboardPage`
- [ ] The action bar is **the same component** as task 07's, not a copy
- [ ] Story renders 2 / 3 / 4 columns
- [ ] Lint + build + storybook clean

## Out of scope

- Diff highlighting between variants
- Drag-to-reorder columns
- Proper A2UI (`@copilotkit/a2ui-renderer` + `CopilotRuntime` proxy)

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Agent never calls this tool because nobody knows it exists | Medium | Task 05's third suggestion set contains "Compare the versions" — that set exists precisely for this |
| Four columns are unreadable in a narrow chat panel | High | Responsive fallback to two columns. Accepted: the agent owns intent, the app owns pixels |
| Task gets cut for time | Medium | It is the last cut per §6. Task 07 stands alone, so cutting this leaves nothing half-built |
