# 10 — Error handling (four surfaces + retry)

Date: 2026-08-22
Estimate: 2.5h · Branch: `feat/error-handling` · Depends on: nothing hard
(part B touches the two hooks task 03 also touches — do it after task 03 to avoid
conflicts)
Part of: [Overview](./00-overview-design.md) · Source: §4 Item 3 of the source design

## Goal

Every failure today is **silent**. The clearest case:
`use-show-entry-list-tool.tsx:68` catches invalid args, calls `console.warn`, and
returns `<Fragment />` — the user sees an unresponsive chat and assumes the app hung.

Four surfaces, one branch, because they share a single decision — "what does an error
look like." Splitting them means reviewing that decision four times.

## Files

**Create**
- `src/hooks/use-retry-last-message.ts`
- `src/components/chat/ChatErrorBubble.tsx`
- `src/components/chat/ToolErrorCard.tsx`
- `src/components/common/DisconnectBanner.tsx`
- `src/services/check-runtime-health.ts`

**Modify**
- `src/components/chat/CopilotAssistantPanel.tsx` — error bubble
- `src/hooks/use-show-entry-list-tool.tsx` — replace warn-then-silence
- `src/hooks/use-render-release-notes-preview-tool.tsx` — same
- `src/services/publish-to-slack.ts` — add an `AbortController` timeout
- `src/layouts/AppShell.tsx` — banner mounting point

## A. Chat turn failure (~0.8h)

An error bubble in the chat with a "Retry" button.

**Decoupled from the spike by a thin layer:**

```ts
// use-retry-last-message.ts
export const useRetryLastMessage = (): { canRetry: boolean; retry: () => void }
```

The error bubble only calls `retry()`. Inside: use the native API if spike question 2
found one, otherwise resend the user's last message content.

**The call site is identical either way** — which is why this task is no longer
spike-dependent, and why spike question 2 is safe to drop.

**Standardized on what chatbots normally do:** the failed message keeps the text the
user typed, the error state appears directly under their bubble, and one "Retry"
button resends that exact message.

**No automatic retry.** The user must opt in — if the failure is configuration
(missing API key, wrong model id), auto-retry only burns tokens and delays diagnosis.

## B. Invalid tool args (~0.5h)

Change the `!result.success` branch from `console.warn` + `<Fragment />` to rendering
a `ToolErrorCard`: state plainly that the agent returned invalid data for which tool,
with a button asking the agent to try again.

Applies to **both** hooks. `use-render-release-notes-preview-tool` is currently worse:
it does not `safeParse` at all, using `props.parameters` directly. After task 02 adds
`superRefine`, the chance of a parse failure goes up — adding `safeParse` here is
mandatory, not optional.

Keep `console.warn` **alongside** the card; do not drop it — developers still need the
stack trace.

## C. Slack publish failure (~0.4h)

`SlackPublishCard` already has `SlackPublishStatus.Failed` + `error`. Review three
paths:

1. Missing `VITE_MASTRA_SERVER_URL` — **already handled**, `publish-to-slack.ts:14-19`
2. 4xx/5xx from Slack — already handled, reads `body.error` when the response is JSON
3. **Timeout — not handled.** Add an `AbortController` with a timeout to
   `publish-to-slack.ts`. Without it, a hanging webhook leaves the card stuck on
   `Sending` forever

Distinguish `AbortError` from other network failures in the message — "timed out" and
"could not connect" send the user down two different fixes.

## D. Runtime disconnect banner (~0.5h)

A banner when the Mastra server is unreachable.

**No polling** — costly and prone to CORS trouble. Check at exactly two moments: on
mount, and when a chat turn fails (reusing the signal from part A).

**A check that does not depend on a health path** (Mastra may not expose one):

```ts
fetch(import.meta.env.VITE_MASTRA_SERVER_URL)
```

- A caught `TypeError` → disconnected
- **Any HTTP response, whatever the status → the server is alive**

A 404 is still proof a server is there. Checking `response.ok` here would falsely
report a disconnect every time the root path does not exist.

The banner belongs in `AppShell`, **above** `AppHeader` — it is app-wide state, not a
header action (`AppHeader`'s `actions` slot is for buttons, not a full-width banner).

## Estimate

0.8 + 0.5 + 0.4 + 0.5 = 2.2h, plus 0.3h to assemble and hand-test = **2.5h**.

## Acceptance criteria

- [ ] Stop the Mastra server → send a message → an error bubble appears, not silence
- [ ] Click "Retry" → the same message is resent
- [ ] No automatic retry happens
- [ ] Force invalid agent args (temporarily tighten the schema) → `ToolErrorCard`
      names the right tool
- [ ] `use-render-release-notes-preview-tool` uses `safeParse` rather than raw
      `props.parameters`
- [ ] A hanging Slack webhook → the card moves to `Failed` with a timeout message
      instead of sticking on `Sending`
- [ ] Timeout and network loss produce different messages
- [ ] Stop the server and reload → banner shows; restart and reload → banner clears
- [ ] Server returns 404 at root → **no** banner
- [ ] `console.warn` is still there for developers
- [ ] Lint + build clean

## Out of scope

- An app-wide error boundary for React crashes
- Shipping errors to an observability backend (Mastra `Observability` is configured;
  this task does not extend it)
- Automatic reconnection

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| No native retry API exists | Low | No longer a schedule risk — `use-retry-last-message` wraps both possibilities |
| Conflicts with task 03 in the two tool hooks | Medium | Do this after task 03. If they must run in parallel, task 03 goes first in those two files |
| CORS blocks the root `fetch` before any response arrives | Medium | A CORS error also throws `TypeError`, producing a false disconnect. If it happens: switch the probe to `COPILOTKIT_ROUTE_PATH`, which already has CORS for the app's origin |
| Part D gets cut for time | Medium | It is the **first** cut per §6. The other three parts do not depend on it |
