# 06 — Unsupported features (three layers)

Date: 2026-08-22
Estimate: 1.5h · Branch: `feat/unsupported-guardrails` · Depends on: nothing
Part of: [Overview](./00-overview-design.md) · Source: §4 Item 1 of the source design

## Goal

When a user asks for something the app cannot do ("deploy to production", "create a
git tag", "read my repo"), the agent today answers fluently as if it could — or calls
a tool that does not exist and goes silent.

Three layers, not one, because each blocks a different failure:

| Layer | Blocks | When it saves you |
| --- | --- | --- |
| A — agent context | Agent does not know its own boundaries | Every turn |
| B — instructions | Agent knows but not how to say it | When the user asks out of scope |
| C — wildcard render | Agent invents a tool call outright | When A and B both miss |

Layer C is a **safety net**, not the main line. It is the second item on the cut list
(§6 of the source design).

## Files

**Create**
- `src/constants/capabilities.ts` — the single source of data
- `src/hooks/use-capabilities-context.ts` — layer A
- `src/mastra/instructions/unsupported.ts` — layer B
- `src/components/chat/UnsupportedActionCard.tsx` — layer C

**Modify**
- `src/mastra/instructions/index.ts` — add the new section to the join array
- `src/routes/DashboardPage.tsx` — call `useCapabilitiesContext()` and
  `useDefaultRenderTool`

## Design

### Keeping the three layers in sync — never write the prose twice

This is the real design decision here. All three layers say the same thing; written
by hand three times, they will contradict each other after two edits, and no test
catches that kind of contradiction.

`src/constants/capabilities.ts` holds **structured data, not sentences**:

```ts
export interface Capability {
  id: string;
  summary: string;
}

export const CAPABILITIES: Capability[] = [...];
export const NON_CAPABILITIES: Capability[] = [...];  // id + why it is not possible
```

- **Layer B generates** its instruction section from these two arrays via a template
- **Layer A passes** the two arrays straight through as the context value
- **Layer C needs no list** — it catches by negation: any tool outside the three
  registered ones

Adding or removing a capability means editing exactly **one** file.

This file is plain TS (no React, no Mastra imports), so it imports cleanly from both
`src/mastra/` (server bundle) and `src/hooks/` (client bundle) — exactly the
cross-boundary case that justifies `src/constants/` in `conventions.md`.

### Layer A — agent context

`useAgentContext` injects client state into the agent's context **every turn** — quite
different from putting it in the system prompt (the system prompt is fixed, context is
live).

Real capabilities: classify git logs / PRs, draft release notes, edit a draft, produce
variants for other platforms, compare them, export, publish to Slack.

Non-capabilities, stated plainly: cannot read the repo directly, cannot create git
tags, cannot deploy, cannot call the GitHub or App Store Connect APIs, cannot edit
code.

The negative list matters more than the positive one — models infer capability from
context far better than they infer limits.

### Layer B — instructions

A new section registered in `instructions/index.ts` (joined with `\n\n---\n\n` like
the existing sections).

The rules, written into the instructions:
- User asks for something off the list → say what the app cannot do **in one sentence**
- Then suggest the nearest feasible action
- No lengthy apology, and no promises about the future ("this feature is coming")

That last rule matters: models love to promise. An agent's promise about a roadmap is
misinformation emitted by the app.

### Layer C — wildcard catch

`useDefaultRenderTool` catches any invented tool call outside
`showEntryList` / `renderReleaseNotesPreview` / `confirmSlackPublish`.

`UnsupportedActionCard.tsx` shows: the action the agent tried to call, one line
explaining the app has no such action, and an alternative.

Show the real tool name rather than "something went wrong" — it gives the user a clue
for rephrasing, and the developer a clue for where to tune the instructions.

## Acceptance criteria

- [ ] Ask "deploy this to staging" → a clear one-sentence refusal plus the nearest
      feasible suggestion, with no promise of future support
- [ ] Ask "what can this app do?" → the real capability list, nothing invented
- [ ] `CAPABILITIES` / `NON_CAPABILITIES` are the single source; layers A and B both
      read from it, with no duplicated prose
- [ ] Add a fake non-capability to the constant → it appears in both the context and
      the instructions with no other file edited
- [ ] Agent invents a tool call → `UnsupportedActionCard` renders instead of silence
- [ ] Lint + build clean

## Out of scope

- Hard server-side enforcement (the agent can still misspeak — this is a soft fence)
- Telemetry counting out-of-scope questions

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| All three layers speak up → redundant, repetitive answers | Medium | Layer A supplies **data** only; layer B owns **tone**. If it still repeats, trim layer B's prose rather than dropping layer A |
| `useDefaultRenderTool` also catches the three registered tools | Low | Run the normal flow before merging; if it over-catches, filter by name |
| The capability list drifts from the real code over time | Medium | Not solvable by design. Record it in the DoD: adding a tool means updating `capabilities.ts` |
