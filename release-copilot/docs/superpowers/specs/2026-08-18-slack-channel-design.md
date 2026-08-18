# Publishing Release Notes to Slack from the Web Copilot — Design

**Date:** 2026-08-18
**Status:** Approved, ready for planning

## Problem

Release notes get drafted in the web UI and then copy-pasted into Slack by hand. The
copilot should offer to post them instead — and it must **ask before posting**, every
time. Nothing reaches the Slack channel without an explicit click.

The conversation stays where it already is: the CopilotKit chat panel in the browser.
Slack is only a notification destination.

## Solution

After a draft renders in the Live Preview panel, the agent calls a **frontend
human-in-the-loop tool**. A confirmation card appears inline in the chat with a platform
picker, a preview of what will be sent, and Send / Cancel. Send posts through a Mastra
server route that holds the Slack webhook URL; Cancel resolves the tool with a decline
and nothing is sent.

## Rejected alternatives

These were investigated in depth before this design settled. Recorded so the research is
not repeated.

| Rejected | Reason |
| --- | --- |
| Mastra Channels (`@chat-adapter/slack`) | Turns Slack into a **chat frontend** — users talk to the agent inside Slack. Wrong shape entirely: here the conversation stays in the web UI and Slack only receives a notification. Also requires a public tunnel in local dev. |
| CopilotKit Channels (`@copilotkit/channels-slack`) | Same shape — Slack as a frontend for an AG-UI agent. Additionally pre-1.0 (`0.9.0`) and would require bumping `@copilotkit/core` on a working app. |
| Browser posts to the Slack webhook directly | The webhook URL is a bearer secret. Reaching it from client code means shipping it in the Vite bundle, where anyone can read it and post to the channel. |
| A "Send to Slack" button in the Live Preview panel | More reliable, since it involves no model call at all. But the requirement is that the **bot asks in conversation**, which a button does not do. Kept as the documented fallback if the tool call proves unreliable — see Model reliability below. |

## Architecture

Four pieces, each with one responsibility:

| Piece | Responsibility | Runs |
| --- | --- | --- |
| `confirmSlackPublish` frontend tool | The HITL gate. Registered with `useHumanInTheLoop`; renders the card and blocks until the user responds. | Browser |
| `SlackPublishCard` component | The card UI: platform picker, preview, Send / Cancel. Presentation only. | Browser |
| `publishToSlack` service | POSTs the chosen platform and content to the Mastra server route. | Browser |
| `/slack/publish` API route | Holds the webhook URL, formats the Slack payload, posts it. | Mastra server |

The split matters: the webhook URL never crosses into browser code, and the card stays a
plain presentational component that can be developed in Storybook without a live agent.

### Why the HITL tool rather than a server tool

`useHumanInTheLoop` is already available in the installed `@copilotkit/react-core/v2`.
The tool call and the user's decision resolve in **one LLM turn** — the model calls the
tool, the card waits for a human, and `respond()` returns the outcome. A server-side tool
plus a separate confirmation step would need a second model turn to fire after approval,
which this project's model has documented trouble with.

## Files

### New

- `src/hooks/use-confirm-slack-publish-tool.tsx` — registers the HITL tool.
- `src/components/release-notes/SlackPublishCard.tsx` — the confirmation card.
- `src/components/release-notes/stories/SlackPublishCard.stories.tsx` — Storybook story, matching the pattern every other component here follows.
- `src/services/publish-to-slack.ts` — client call into the Mastra backend.
- `src/mastra/api/slack-publish-route.ts` — the `registerApiRoute` definition.

### Modified

- `src/mastra/index.ts` — register the new API route alongside the CopilotKit one.
- `src/mastra/instructions/intro.ts` — condition 2 gains the follow-up: after rendering a draft, offer to publish. A new condition covers the user asking to publish explicitly.
- `src/mastra/instructions/app-usage-faq.ts` — describe the Slack publish step so the agent can answer questions about it.
- `src/routes/DashboardPage.tsx` — mount the new hook where the other CopilotKit tool hooks are mounted.
- `src/types/release-notes-draft.ts` — export `DRAFT_FIELD_BY_PLATFORM`, currently a local const in `DashboardPage.tsx`, now needed by the hook as well.
- `.env.example` — `SLACK_WEBHOOK_URL` and `VITE_MASTRA_SERVER_URL`.

### Deliberately not added

- **No new dependencies.** An Incoming Webhook is a single `POST` with a JSON body; `@slack/web-api` would be a dependency for one `fetch`.
- **No `src/constants/slack.ts`.** The webhook URL is read in exactly one place. `.agents/rules/conventions.md` forbids extracting a single-use literal with no cross-module coupling risk.
- **No tool-name constant in `src/constants/tools.ts`.** The tool name `confirmSlackPublish` has exactly one reference site, in the hook. This matches `useShowEntryListTool`, which uses the inline literal `'showEntryList'`. `RENDER_RELEASE_NOTES_PREVIEW_TOOL_NAME` is a constant only because the Mastra server registry references it too — that cross-layer contract is what justifies extraction, and it does not exist here.

### A second env var for the server base URL

`VITE_MASTRA_SERVER_URL` duplicates the host already present in
`VITE_COPILOTKIT_RUNTIME_URL` (which carries the same host plus a `/copilotkit` suffix).
The alternative — deriving one from the other by stripping the suffix — is a string
manipulation that breaks silently if the route path ever changes. The duplication is the
lesser problem, and `.env.example` states the two must point at the same host.

## Data flow

1. User pastes a git log; the agent classifies and calls `showEntryList` (existing behavior, unchanged).
2. User asks for a draft; the agent calls `renderReleaseNotesPreview` and the Live Preview panel updates (existing behavior, unchanged).
3. The agent then calls `confirmSlackPublish`, passing the three platform variants it just rendered.
4. The card renders inline in the chat: platform radio defaulting to GitHub, a preview of the selected variant, Send and Cancel.
5. **Send** → `publishToSlack` POSTs `{ platform, content }` to `/slack/publish` → the route reads `SLACK_WEBHOOK_URL` and posts to Slack → `respond({ published: true, platform })`.
6. **Cancel** → `respond({ published: false })`. No request is made at all.
7. The agent acknowledges the outcome in chat.

Step 4 is the gate. The card is the only path to a post, and it cannot resolve itself —
`respond` fires on a human click.

## Model reliability

This is the main risk in this design, and it is not hypothetical.

`src/mastra/agents/release-copilot-agent.ts` records measurements on this exact
workload: Groq's validator rejected skill-activation tool calls 3/6 and 1/6 of the time,
while a **single** plain `createTool()` completed 13/13. This change takes the agent from
two tools to three, and asks the model to make two tool calls in sequence (render, then
confirm) where it previously made one.

Mitigations, in order:

1. The instruction for the publish offer is a **separate, explicitly ordered step** after the render call, not a parallel one — the same structure condition 1 → condition 2 already uses successfully.
2. If the model skips the call, the user can still ask "post it to Slack" in plain language, which re-triggers it.
3. If it proves unreliable in practice, the fallback is the rejected-alternative button in the Live Preview panel — no model call at all. That is a change of design, not a patch, and should be a decision rather than a silent drift.

This risk must be evaluated during verification, not assumed away.

## Configuration

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

Created from a Slack app: **Create an app → From scratch → Incoming Webhooks → Activate
→ Add New Webhook to Workspace → pick the channel.** The URL that comes back is bound to
that one channel; changing channels means a new URL.

**The variable must not be prefixed with `VITE_`.** Vite inlines every `VITE_`-prefixed
variable into the client bundle at build time. A `VITE_SLACK_WEBHOOK_URL` would publish
the secret to anyone who opens devtools. This is the single easiest way to get this
feature wrong, and nothing in the toolchain will warn about it.

## Security

- **The webhook URL is a bearer credential.** Anyone holding it can post to the channel as this app, with no further authentication. It stays server-side, in `.env`, which `.agents/rules/git-rules.md` already forbids committing.
- **The `/slack/publish` route is unauthenticated and CORS is wide open.** `src/constants/server.ts` sets `origin: '*'` with the comment "Wide open for local dev; tighten before deploying to a shared environment." That comment now has teeth: this route lets any page that can reach the Mastra server post into the team's Slack channel. Acceptable for local development; **tightening CORS and adding auth is a prerequisite for deploying this**, and is called out again in Out of scope below.
- The route accepts content from the browser and forwards it to Slack. It validates shape and length, but it does not and cannot verify the content came from a real draft — a determined caller can post arbitrary text. Given the route is only reachable by someone who already reached the server, this is consistent with the threat model above rather than an additional exposure.

## Error handling

| Case | Behavior |
| --- | --- |
| `SLACK_WEBHOOK_URL` unset | The route returns 500 with an explicit message naming the variable. The card shows the error and stays open so the user can retry after fixing `.env`. |
| Slack returns non-2xx | The route returns the status and Slack's response body. The card shows it and stays open. No automatic retry — a blind retry risks double-posting an announcement. |
| Network failure from the browser | The service rejects; the card shows a generic failure and stays open. |
| User clicks Cancel | `respond({ published: false })`. No request is made. The draft stays in the Live Preview panel, unchanged. |
| User never responds | The tool stays pending. This is the intended behavior of `useHumanInTheLoop` — there is no timeout, and adding one would risk publishing or discarding on a timer. |

On success the card stops being interactive and shows a confirmation, so the same draft
cannot be posted twice with a second click.

## Verification

`pnpm lint` and `pnpm build` must both pass clean, per `.agents/rules/code-style.md`.

`SlackPublishCard` gets a Storybook story covering the states: default, a long-content
preview, in-flight, error, and posted. Every other component in this repo has one, and it
is the only way to exercise the card's states without a live agent and a live webhook.

Manual end-to-end, since there is no automated coverage:

1. Paste a git log, ask for a draft, confirm the Live Preview panel fills as before.
2. Confirm the publish card then appears in the chat on its own.
3. Click Cancel — confirm nothing arrives in Slack and the agent acknowledges.
4. Click Send with GitHub selected — confirm the message arrives in the Slack channel.
5. Switch the platform to Google Play and send — confirm the shorter variant arrives.
6. Unset `SLACK_WEBHOOK_URL`, restart, and send — confirm the card shows the error and does not claim success.
7. Repeat the full flow twice more and note whether the agent offered to publish each time. This is the model-reliability check from above; record the result rather than assuming it.

The repo has no test framework — `package.json` defines no `test` script. Verification is
lint, build, Storybook, and the sequence above. This spec does not claim unit-test
coverage.

## Out of scope

- No Slack chat surface. The agent is not reachable from Slack, and this design does not move toward that.
- No channel picker. The webhook is bound to one channel by construction.
- No message threading, editing, or unfurling. One post per approved publish.
- No publish history or audit trail.

## Prerequisite for deployment

Before this ships anywhere shared, `MASTRA_CORS_CONFIG` in `src/constants/server.ts` must
be narrowed from `origin: '*'` and the `/slack/publish` route must require
authentication. Deploying as-is would expose a route that posts to the team's Slack
channel to any origin that can reach the server. This is a deployment blocker, not a
nice-to-have.
