# 05 — Staged suggestions

Date: 2026-08-22
Estimate: 0.5h · Branch: `feat/staged-suggestions` · Depends on: nothing
Part of: [Overview](./00-overview-design.md) · Source: §4 Item 4 of the source design

## Goal

The three current suggestions (`Make it shorter` / `Translate to VI` / `Add emojis`)
are hard-coded in `CopilotAssistantPanel.tsx:14-18` and **never change** — including
before any commits exist, when all three are meaningless.

Replace them with three sets chosen by app stage.

## Files

**Create**
- `src/constants/suggestions.ts` (if task 04 has not created it already)

**Modify**
- `src/components/chat/CopilotAssistantPanel.tsx` — drop
  `QUICK_ACTION_SUGGESTIONS`, pick a set from state, pass deps to
  `useConfigureSuggestions`

## Design

| Condition | Suggestions |
| --- | --- |
| `commits.length === 0` | "Paste my git log", "How do I get a git log?", "What can this app do?" |
| commits present, `draft === null` | "Draft the release notes", "Drop the chore commits", "Explain how you classify" |
| `draft` present | "Make an App Store version", "Compare the versions", "Make it shorter" |

**The third set leads straight into tasks 07 and 08.** That is the reason for
staged-static over the current fixed three: if nobody learns "compare the versions"
exists, the most expensive feature of the two days goes unused.

`CopilotAssistantPanel` currently **takes no props** — it reads `useThreadStore`
itself. To know about `commits` and `draft`, read directly from `use-dashboard-store`
(task 03) if that has merged; otherwise take two props, `hasCommits: boolean` /
`hasDraft: boolean`, from `DashboardPage`. **Take the latter if task 03 is not
done** — two booleans are the smallest possible interface, and switching to the store
later is a one-line change.

`useConfigureSuggestions` takes deps as its second argument — **verified** in
`node_modules/@copilotkit/react-core/dist/copilotkit-D0aAnD3i.d.mts:2674`:
`useConfigureSuggestions(config, deps?: ReadonlyArray<unknown>)`.

```ts
useConfigureSuggestions({
  consumerAgentId: RELEASE_COPILOT_AGENT_ID,
  suggestions: SUGGESTIONS_BY_STAGE[stage],
  available: 'always',
}, [stage]);
```

`stage` is a `const enum` (`SuggestionStage.NoCommits` / `Drafting` / `HasDraft`) — a
fixed value set that is both a type and a runtime key, per `code-style.md`.

`HideSuggestionView` currently hides the suggestion view ("TODO: Will add custom
suggestion view later"). **This task does not re-enable it** — restoring the default
view is a visual change outside this scope. If suggestions turn out not to render
while the view is hidden, that is this task's finding and must be reported, not
silently fixed by removing `suggestionView`.

## Acceptance criteria

- [ ] No commits → set 1 shows
- [ ] Commits but no draft → set 2 shows
- [ ] Draft present → set 3 shows
- [ ] Clicking a suggestion sends the right message
- [ ] The hard-coded `QUICK_ACTION_SUGGESTIONS` is gone from `CopilotAssistantPanel`
- [ ] Lint + build clean

## Out of scope

- Agent-generated dynamic suggestions — considered and rejected on per-turn token cost
- A custom `suggestionView` (the TODO already in the code is not part of this task)

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Suggestions do not render because `suggestionView` is hidden | Medium | Report it; do not re-enable the view unilaterally. That is someone else's visual decision |
