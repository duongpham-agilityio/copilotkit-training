# 07 — Platform draft card

Date: 2026-08-22
Estimate: 2.5h · Branch: `feat/platform-draft-card` · Depends on: 02, spike question 3
Part of: [Overview](./00-overview-design.md) · Source: §4 Item 6 part 1 of the source
design

## Goal

Task 02 makes the data for arbitrary platforms possible but displays none of it. This
is where it surfaces: one card per platform in the chat panel, consistent UI, shared
action bar.

This is the **mandatory** half of item 6 — without it, task 02 is a refactor nobody
sees. The comparison grid (task 08) is the optional half.

## Files

**Create**
- `src/components/release-notes/PlatformDraftCard.tsx`
- `src/components/release-notes/stories/PlatformDraftCard.stories.tsx`

**Modify**
- `src/hooks/use-render-release-notes-preview-tool.tsx` — render cards when
  `draft.platforms.length > 0`

## Design

### Component

Takes exactly one `PlatformDraft` (the type from task 02) — **not** a
`ReleaseNotesDraft`. The card neither knows nor needs to know whether the data came
from a named field or the dynamic array; that is `toPlatformDrafts()`'s job. This
boundary is why task 02 has a normalizer at all.

```
┌─────────────────────────────────────┐
│ App Store            1234 / 4000    │   ← label + counter
├─────────────────────────────────────┤
│ <body, plain text or markdown>      │
├─────────────────────────────────────┤
│ [Copy]  [Export]  [Publish to Slack]│   ← shared action bar
└─────────────────────────────────────┘
```

- **Counter** `1234 / 4000` — turns red when exceeded. The limit resolves in task
  02's order: `PLATFORM_CHARACTER_LIMITS[platformId] ?? platformDraft.characterLimit`.
  No limit → hide the counter entirely; never render `1234 / ∞`.
- **Body**: GitHub uses `MarkdownPreview`; other platforms are plain text (the schema
  forbids markdown for App Store and Google Play) → render preserving line breaks,
  not through ReactMarkdown.
- **Action bar** is extracted as a reusable child component — task 08 renders it per
  column and task 09 wires the Export button into it. Do not inline it into the card.

At this stage the Export button is a **placeholder**: task 09 supplies the handler. If
task 09 has not merged, omit the button rather than shipping a dead one.

### Rendering in the chat

Extend the `render` of `use-render-release-notes-preview-tool.tsx`. That hook
currently returns `<DraftSync />` (a `null` component that only syncs state out to
`DashboardPage`). After this task it returns `DraftSync` plus the card list:

```tsx
const platformDrafts = toPlatformDrafts(props.parameters);
return (
  <>
    <DraftSync ... />
    {platformDrafts.map((p) => (
      <PlatformDraftCard key={p.platformId} platformDraft={p} />
    ))}
  </>
);
```

An empty array renders no cards, behaving exactly as it does today. That is the
condition for this task not breaking the GitHub-only flow.

### Dependency on spike question 3

If the tool render sits **inside** `AssistantMessageBubble` and the bubble constrains
width, the card breaks. Two fallbacks, in order of preference:

1. Widen `AssistantMessageBubble` to allow full-width children (cheaper, no
   architectural change)
2. Render the card at the `CopilotChat` level instead of inside the bubble

**This is why the task is 2.5h rather than 1.5h** — 1h is the budget for that
scenario. If the spike comes back clean, that hour returns to the schedule as slack.

## Acceptance criteria

- [ ] Draft with only `github` → no cards appear, left panel unchanged
- [ ] Ask for "an App Store version" → one App Store card with a correct counter
- [ ] Ask for "a Slack and email version" → two cards with the labels the model chose
- [ ] Body over the limit → counter turns red (verify by temporarily lowering the
      constant)
- [ ] Platform with no limit → no counter shown
- [ ] Card does not break the chat panel layout at real width
- [ ] Copy works
- [ ] Story renders all three states: within limit / over limit / no limit
- [ ] Lint + build + storybook clean

## Out of scope

- Editing content inline on the card — the user edits through the chat
- Comparison grid (task 08)
- Export handler (task 09)

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Tool render breaks layout inside the custom `messageView` | Medium | Spike question 3 answers this first. Two fallbacks above, with the hour already in the estimate |
| Card re-renders on every streamed token | Medium | The existing hook already guards on `props.status === 'inProgress'` — keep that branch |
| Model produces messy `label` values ("appstore", "APP STORE") | Low | Named fields get fixed labels from the normalizer. Only dynamic platforms use the model's label — accepted |
