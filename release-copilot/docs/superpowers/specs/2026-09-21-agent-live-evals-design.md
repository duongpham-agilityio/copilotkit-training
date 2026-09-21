# Agent live evals — design

Date: 2026-09-21
Status: approved in chat, pending written-spec review

## Goal

Add live evaluation to `releaseCopilotAgent` so every sampled chat reply is scored
automatically. Scores are stored in `mastra_scorers` (existing Turso storage) and are
browsable in Mastra Studio. Scope is deliberately small: live scorers only.

## Non-goals

- `runEvals` scripts, gates, thresholds, CI runs
- Datasets and experiments
- Custom deterministic scorers (platform char limits, section order)
- Faithfulness scorer (static `context` only, cannot take per-turn context)
- Toxicity scorer (prompt-injection and PII guardrails already run on input)

## Decisions

| Topic | Decision | Reason |
| --- | --- | --- |
| Scope | Live scorers only | Smallest change, matches "basic Mastra" goal of this project |
| Scorers | Answer relevancy + hallucination | Relevancy is cheap and generic; hallucination catches invented changes not in the pasted log |
| Judge model | New `RELEASE_COPILOT_JUDGE_MODEL` env | Follows `requireModelEnv` pattern; a capable judge is needed for hallucination and should not be the agent's own model |
| Sampling | Relevancy `1.0`, hallucination `0.5` | Hallucination re-sends the whole pasted log to the judge, so it costs more per call |
| Faithfulness | Dropped | Only `createHallucinationScorer` has the dynamic `getContext` hook |

## Changes

### 1. Dependency

`pnpm add @mastra/evals`. Check the installed version's peer range against
`@mastra/core@1.57.0`.

### 2. Judge model env

- `src/constants/models/model-name.ts`: add
  `RELEASE_COPILOT_JUDGE_MODEL = requireModelEnv('RELEASE_COPILOT_JUDGE_MODEL')`.
- `.env.example`: add `RELEASE_COPILOT_JUDGE_MODEL` with a short comment (judge should
  differ from `RELEASE_COPILOT_MODEL` to avoid self-grading bias). The value is an
  OpenAI model stronger than the `gpt-5.4-nano` guardrail model; the exact id is
  checked with the `mastra` skill's `scripts/provider-registry.mjs` at implementation
  time, not guessed.
- Prod and any CI env must also set it. A missing var throws at import, like the other
  model vars.

### 3. Scorer keys

New `src/constants/agent-tools/scorers-name.ts`, sibling of `tools-name.ts`:

- `ANSWER_RELEVANCY_SCORER_NAME`
- `HALLUCINATION_SCORER_NAME`

Shared by the agent's `scorers` block and `Mastra({ scorers })` in `index.ts`.

### 4. Scorers

New `src/mastra/scorers/release-copilot-scorers.ts`, named exports:

- `answerRelevancyScorer = createAnswerRelevancyScorer({ model: RELEASE_COPILOT_JUDGE_MODEL })`
- `hallucinationScorer = createHallucinationScorer({ model: RELEASE_COPILOT_JUDGE_MODEL, options: { getContext } })`

Imports come from `@mastra/evals/scorers/prebuilt` (path confirmed against the
installed package after install).

#### Hallucination context

Ground truth for a turn is the log or PR text the user pasted. The last user message is
not enough: an edit turn ("make it shorter") does not re-paste the log, so every claim in
the edited draft would be flagged.

`getContext` returns all user-role message text in the run input, including remembered
messages. `memory.options.lastMessages: 10` bounds it.

**Verification step:** the exact `GetContextParams` and `run.input` shape were not
visible before install. Read `@mastra/evals` type definitions right after install and
adapt the extraction. If the shape cannot supply user messages, stop and revisit this
design rather than falling back to last-message-only.

Score semantics: hallucination score high = bad, low = good. No live threshold, it is a
Studio signal only.

### 5. Agent

`src/mastra/agents/release-copilot-agent.ts`: add

```ts
scorers: {
  [ANSWER_RELEVANCY_SCORER_NAME]: {
    scorer: answerRelevancyScorer,
    sampling: { type: 'ratio', rate: 1 },
  },
  [HALLUCINATION_SCORER_NAME]: {
    scorer: hallucinationScorer,
    sampling: { type: 'ratio', rate: 0.5 },
  },
},
```

Sampling rates stay inline (used once, no cross-module contract).

### 6. Registry

`src/mastra/index.ts`: add `scorers: { [ANSWER_RELEVANCY_SCORER_NAME]: answerRelevancyScorer, [HALLUCINATION_SCORER_NAME]: hallucinationScorer }`
to the `Mastra` config, satisfying the "register every scorer" rule and enabling Studio
scorer list and trace scoring.

## Behaviour and errors

- Live scorers run async after the reply. They never block or fail a chat turn.
- A failed judge call loses that one score only.
- Storage: results land in `mastra_scorers` via the existing `LibSQLFactoryStorage`.
- Observability already exports traces to storage, so historical trace scoring works.

## Verification

Project rule: lint + build only, no unit tests.

1. `pnpm lint` and `pnpm build` clean.
2. Manual smoke: `pnpm dev:mastra`, send a draft request in Studio or the app, confirm
   both scores appear under Scorers in Studio.
3. Confirm an edit turn without re-pasted log does not produce an inflated hallucination
   score.

## Git

Implement on a feature branch (e.g. `feat/agent-live-evals`), not `v2-dev` directly. No
commits unless the user asks.
