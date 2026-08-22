# 04 — Welcome screen + empty state

Date: 2026-08-22
Estimate: 0.7h (0.4h welcome + 0.3h empty state) · Branch: `feat/welcome-screen`
Depends on: nothing
Part of: [Overview](./00-overview-design.md) · Source: §4 Item 2 of the source design

## Goal

On open, all three panels are blank and say nothing. The user has no idea where to
start — the most exposed moment in a demo.

This is the best return per hour on the whole list: every primitive (`Card`,
`Button`, `MonoTag`) already exists, there is no new logic, and nothing touches the
agent.

## Files

**Create**
- `src/components/chat/ChatWelcomeScreen.tsx`

**Modify**
- `src/components/chat/CopilotAssistantPanel.tsx` — `welcomeScreen={false}` →
  `welcomeScreen={ChatWelcomeScreen}`
- `src/components/commit-list/CommitListPanel.tsx` — empty state
- `src/components/release-notes/MarkdownPreview.tsx` — empty-state copy edit

## Design

### Welcome screen (chat)

Pass it to `CopilotChat`'s `welcomeScreen` prop in place of the current `false`
(`CopilotAssistantPanel.tsx:59`). The prop **already exists** in CopilotKit v2 and is
being actively disabled — no need to build a mounting point.

Content, in order:
1. Short heading plus one line on what the app does
2. Instructions for pasting a `git log`, with a copyable `<code>` command — reuse the
   existing `MonoTag` + `CopyButton`
3. Three clickable sample prompts that send a message directly

The three sample prompts are **the same as set one in task 05**
(`commits.length === 0`). Do not declare them twice: import from
`src/constants/suggestions.ts`. If task 05 has not merged yet, this task creates that
file with set one and task 05 adds the other two.

### Left-panel empty states

**Checked against the source — the two panels are not in the same state; do not treat
them alike:**

- `MarkdownPreview.tsx` **already has** an empty state: *"No content yet — ask Copilot
  to draft release notes from the selected commits."* It only needs a copy edit to
  match the real flow (prompt selecting commits first). ~5 minutes.
- `CommitListPanel.tsx` **has nothing** — `visibleCommits.map()` over an empty array
  yields a bare `<div>` under the header. This is the real gap: one line, "No commits
  yet," plus a prompt to paste a git log in the chat.

When `commits.length === 0`, also hide the filter `Tabs` row — an empty filter over an
empty list is noise.

## Acceptance criteria

- [ ] Open the app with an empty chat → the welcome screen appears, not whitespace
- [ ] Click a sample prompt → the message sends and the welcome screen disappears
- [ ] The `git log` copy button copies the right command
- [ ] Empty `CommitListPanel` → guidance shows, no empty filter tabs
- [ ] With commits present → both the welcome screen and empty states are gone
- [ ] Sample prompts are not declared in two places
- [ ] Lint + build + storybook clean

## Out of scope

- Illustrations — text and a `Card` are enough
- Multi-step onboarding or a product tour

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| `welcomeScreen` expects a different shape (element vs component type) | Low | Read the prop's type before writing; this is a 5-minute check, not a schedule risk |
| Welcome screen still shows on a thread with existing history | Low | CopilotKit hides it once messages exist. Verify by reloading on a thread that already has chat |
