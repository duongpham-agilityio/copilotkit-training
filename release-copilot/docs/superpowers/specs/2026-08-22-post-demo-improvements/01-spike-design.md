# 01 — Spike: three foundational unknowns

Date: 2026-08-22
Estimate: 0.75h · Branch: `docs/spike-results` · Depends on: nothing
Part of: [Overview](./00-overview-design.md) · Source: §5 of the source design

## Goal

Answer the three questions whose **answers change the design**, before any feature
code is written. This is not open-ended exploration — each of the three was picked
because it has a concrete "if the answer is bad, do it differently" branch.

This task **merges no code**. The deliverable is three entries written into §11 of
the source design.

## Question 1 — Does CopilotKit v2 replay tool calls when `threadId` changes?

**Why it matters:** task 03 moves left-panel state into a per-thread store. If
CopilotKit replays a thread's whole tool-call history on switch, the left panel gets
overwritten by stale payloads *after* the store has already restored correctly — two
sources fighting each other.

**How to test:**
1. Temporarily expose two buttons that set a hard-coded `threadId` (`thread-a`,
   `thread-b`) in `CopilotAssistantPanel`
2. Paste a different git log in each thread so the agent calls `showEntryList`
3. Switch back and forth, logging `props.toolCallId` and `props.status` inside the
   `render` of `use-show-entry-list-tool.tsx`

**What must be known precisely:** (a) whether `render` fires again when an old thread
loads, and (b) whether a replayed `toolCallId` **matches** the original.

**Impact:** replay present → task 03 grows by ~2h to distinguish "history replay"
from "new tool call." No replay → the data-based dedupe in task 03 is sufficient.

## Question 2 — Is there a retry/regenerate API for a failed message?

**Why it matters:** task 10 part A needs to resend the user's last message.

**How to test:** read the exports of `@copilotkit/react-core/v2` around `useAgent`
and `CopilotChat`, looking for `regenerate`, `retry`, `reload`, `setMessages`.

```bash
grep -rn "regenerate\|retry\|reload" node_modules/@copilotkit/react-core/dist/*.d.mts | head -40
```

**Impact: already downgraded to a non-blocker.** `use-retry-last-message.ts` (task
10) wraps both possibilities behind one interface, so the call site is unaffected.
This question only decides what goes *inside* the hook.

**If the spike runs long, drop this question first.**

## Question 3 — Do in-chat tool renders survive the custom `messageView`?

**Why it matters:** `CopilotAssistantPanel.tsx:63-70` overrides `assistantMessage`
with `AssistantMessageBubble`. Task 07 renders tall, full-width cards with an action
bar inside the message stream. If the bubble constrains width or padding, the card
breaks.

**How to test:** temporarily return a dummy `<Card>` roughly 200px tall, full width,
with three buttons from `use-render-release-notes-preview-tool.tsx`. Observe it in
the real chat panel.

**What must be known precisely:** whether the tool render sits *inside*
`AssistantMessageBubble` or as a *sibling* of it in the message tree.

**Impact:** if it breaks → task 07 gains work: either render the card at the
`CopilotChat` level instead of inside the bubble, or widen `AssistantMessageBubble`
to allow full-width children. This is why task 07 is estimated at 2.5h rather than
1.5h.

## Deliverable

Fill in §11 of the source design, two to four lines per question: **what was
actually observed** (not inferred), and **what decision follows**.

If any answer comes back bad, update §6 (the schedule) before writing code — do not
let the overrun surface midway through day 2.

## Acceptance criteria

- [ ] §11 of the source design has all three entries filled, no `_(not run)_` left
- [ ] Each entry states what was observed, not "it seems like"
- [ ] If question 1 or 3 came back bad: §6 estimates updated accordingly
- [ ] All scratch test code removed — this branch changes `.md` files only

## Out of scope

- Investigating real A2UI (`@copilotkit/a2ui-renderer`) — settled in §2 of the source
  design, not reopened
- Investigating `useThreads` — same reason

## Risks

| Risk | Mitigation |
| --- | --- |
| Spike runs past 0.75h | Drop question 2 first (no longer a blocker), then question 1 — keep question 3, the cheapest one and the one that gates the most expensive task |
| Result is ambiguous, no conclusion possible | Write "inconclusive" into §11 verbatim and take the defensive branch (assume the bad case). Never record a guess as a finding |
