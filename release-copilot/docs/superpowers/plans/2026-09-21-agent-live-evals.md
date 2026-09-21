# Agent Live Evals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Score every sampled `releaseCopilotAgent` reply automatically with two live LLM-judge scorers (answer relevancy, hallucination), stored in `mastra_scorers` and visible in Mastra Studio.

**Architecture:** Two prebuilt scorers from `@mastra/evals` share one new judge-model env var. The hallucination scorer resolves ground truth at run time from the user-role messages of the turn (remembered + current). Scorers are attached to the agent with sampling and also registered on the `Mastra` instance.

**Tech Stack:** Mastra (`@mastra/core@1.57.0`), `@mastra/evals@1.10.2`, LibSQL storage (existing), TypeScript strict, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-21-agent-live-evals-design.md`

## Global Constraints

- Verification is `pnpm lint` and `pnpm build` clean, plus a manual Studio smoke test. No unit tests, no Storybook (project decision).
- No commits, pushes or PRs by the executor unless the user asks in that turn. Work on a feature branch, never `v2-dev` or `main` directly.
- Never commit `.env`. The new env var goes in `.env.example` (committed) and local `.env` (ignored).
- Sampling: answer relevancy `{ type: 'ratio', rate: 1 }`, hallucination `{ type: 'ratio', rate: 0.5 }`. Rates stay inline in the agent file.
- Judge model env var name is exactly `RELEASE_COPILOT_JUDGE_MODEL`. It must differ from `RELEASE_COPILOT_MODEL` (no self-grading).
- Scorer keys are constants in `src/constants/agent-tools/scorers-name.ts`, shared by the agent and `src/mastra/index.ts`.
- Code style: arrow functions only, `const` by default, named exports, single quotes, semicolons, 2-space indent, trailing commas on multiline, `import type` for type-only imports, no `any`, destructure when reading 2+ fields of an object.
- Relative imports inside `src/mastra/**` and `src/constants/**` omit the file extension, matching every existing file there (`'./agents/release-copilot-agent'`). Do not add `.ts`.
- The project runs on a hard $5 credits cap. Do not pick a judge model pricier than `openai/gpt-5.6-luna` class without asking.
- Out of scope: `runEvals`, datasets/experiments, custom format scorers, faithfulness, toxicity.

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `package.json`, `pnpm-lock.yaml` | Modify | Add `@mastra/evals` |
| `src/constants/models/model-name.ts` | Modify | Export `RELEASE_COPILOT_JUDGE_MODEL` |
| `.env.example` | Modify | Document `RELEASE_COPILOT_JUDGE_MODEL` |
| `src/constants/agent-tools/scorers-name.ts` | Create | Scorer registry keys |
| `src/mastra/scorers/release-copilot-scorers.ts` | Create | The two scorers + user-only hallucination context |
| `src/mastra/agents/release-copilot-agent.ts` | Modify | Attach scorers with sampling |
| `src/mastra/index.ts` | Modify | Register scorers |

---

### Task 1: Dependency and judge model config

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (via `pnpm add`)
- Modify: `src/constants/models/model-name.ts`
- Modify: `.env.example`
- Modify: `.env` (local, not committed)

**Interfaces:**
- Consumes: existing `requireModelEnv` in `src/constants/models/model-name.ts` (not exported, module-local).
- Produces: `export const RELEASE_COPILOT_JUDGE_MODEL: string` from `src/constants/models/model-name.ts`; package `@mastra/evals` importable.

- [ ] **Step 1: Create the feature branch**

Run: `git switch -c feat/agent-live-evals`
Expected: `Switched to a new branch 'feat/agent-live-evals'`. The spec and plan files under `docs/superpowers/` are untracked and carry over. Do not commit.

- [ ] **Step 2: Install `@mastra/evals`**

Run: `pnpm add @mastra/evals@^1.10.2`
Expected: added to `dependencies`. `vitest` is an optional peer, so no peer warning is required to be resolved. The peer range on `@mastra/core` is `>=1.0.0-0 <2.0.0-0` and `1.57.0` satisfies it.

- [ ] **Step 3: Verify the judge model id exists**

Run: `node .claude/skills/mastra/scripts/provider-registry.mjs --provider openai | grep -x "  gpt-5.4-mini"`
Expected: prints `  gpt-5.4-mini`. This is the chosen judge: stronger than the `gpt-5.4-nano` guardrail model, different from the `gpt-5.6-luna` agent model. If the line is missing, stop and ask the user for another model.

- [ ] **Step 4: Add the env export**

Append to `src/constants/models/model-name.ts`:

```ts

export const RELEASE_COPILOT_JUDGE_MODEL = requireModelEnv(
  'RELEASE_COPILOT_JUDGE_MODEL',
);
```

- [ ] **Step 5: Document the env var in `.env.example`**

Insert after the `RELEASE_COPILOT_GUARDRAIL_MODEL=openai/gpt-5.4-nano` line (before `VITE_COPILOTKIT_RUNTIME_URL`):

```
# Judge model for the live eval scorers (answer relevancy + hallucination in
# src/mastra/scorers/release-copilot-scorers.ts). Runs async after each sampled reply,
# so it never blocks a chat turn. Must differ from RELEASE_COPILOT_MODEL — an agent
# grading its own output biases scores upward. Hallucination re-sends the pasted log
# to the judge, so keep this cheaper than the fallback model given the $5 credits cap.
RELEASE_COPILOT_JUDGE_MODEL=openai/gpt-5.4-mini

```

- [ ] **Step 6: Add the var to local `.env`**

Append `RELEASE_COPILOT_JUDGE_MODEL=openai/gpt-5.4-mini` to `.env` (do not print or commit the file). Without it, importing `model-name.ts` throws `Missing required env var: RELEASE_COPILOT_JUDGE_MODEL` on server start.

- [ ] **Step 7: Verify**

Run: `pnpm build`
Expected: PASS (`tsc -b && vite build`). Nothing imports the new export yet, so this only confirms the install resolves.

- [ ] **Step 8: Checkpoint**

No commit. Leave changes in the working tree.

---

### Task 2: Scorer keys and scorers

**Files:**
- Create: `src/constants/agent-tools/scorers-name.ts`
- Create: `src/mastra/scorers/release-copilot-scorers.ts`

**Interfaces:**
- Consumes: `RELEASE_COPILOT_JUDGE_MODEL` from Task 1; `createAnswerRelevancyScorer`, `createHallucinationScorer` from `@mastra/evals/scorers/prebuilt`; `getTextContentFromMastraDBMessage`, `isScorerRunInputForAgent` from `@mastra/evals/scorers/utils`; type `MastraDBMessage` from `@mastra/core/agent`.
- Produces:
  - `export const ANSWER_RELEVANCY_SCORER_NAME = 'answerRelevancy'`
  - `export const HALLUCINATION_SCORER_NAME = 'hallucination'`
  - `export const answerRelevancyScorer` and `export const hallucinationScorer` (both `MastraScorer` instances)

Facts verified against the installed `@mastra/evals@1.10.2` types:
- `createHallucinationScorer({ model, options: { getContext } })`, where `getContext({ run, results, score, step })` returns `string[] | Promise<string[]>`. `run.input` is `ScorerRunInputForLLMJudge | undefined`.
- For agent scoring, `run.input` is `{ inputMessages: MastraDBMessage[], rememberedMessages: MastraDBMessage[], systemMessages, taggedSystemMessages }`.
- `getConversationHistoryFromRunInput` is NOT used: it renders a `role: text` transcript that includes assistant turns, which would make earlier assistant drafts count as ground truth.

- [ ] **Step 1: Create the scorer keys**

Create `src/constants/agent-tools/scorers-name.ts`:

```ts
export const ANSWER_RELEVANCY_SCORER_NAME = 'answerRelevancy';

export const HALLUCINATION_SCORER_NAME = 'hallucination';
```

- [ ] **Step 2: Create the scorers file**

Create `src/mastra/scorers/release-copilot-scorers.ts`:

```ts
import type { MastraDBMessage } from '@mastra/core/agent';
import {
  createAnswerRelevancyScorer,
  createHallucinationScorer,
} from '@mastra/evals/scorers/prebuilt';
import {
  getTextContentFromMastraDBMessage,
  isScorerRunInputForAgent,
} from '@mastra/evals/scorers/utils';
import { RELEASE_COPILOT_JUDGE_MODEL } from '../../constants/models/model-name';

const getUserMessageTexts = (messages: MastraDBMessage[]): string[] =>
  messages
    .filter(({ role }) => role === 'user')
    .map(getTextContentFromMastraDBMessage)
    .filter((text) => text.length > 0);

export const answerRelevancyScorer = createAnswerRelevancyScorer({
  model: RELEASE_COPILOT_JUDGE_MODEL,
});

// Ground truth for "did the reply invent a change" is what the user pasted. Edit turns
// ("make it shorter") don't re-paste the log, so the context is every user message the
// agent saw (remembered history + current turn), not just the last one. Assistant
// messages are excluded on purpose: an earlier draft must not vouch for itself.
// High score = more hallucination (bad); there is no live threshold, it is a Studio signal.
export const hallucinationScorer = createHallucinationScorer({
  model: RELEASE_COPILOT_JUDGE_MODEL,
  options: {
    getContext: ({ run }) => {
      const { input } = run;
      if (!isScorerRunInputForAgent(input)) {
        return [];
      }
      const { rememberedMessages, inputMessages } = input;
      return getUserMessageTexts([...rememberedMessages, ...inputMessages]);
    },
  },
});
```

- [ ] **Step 3: Verify types**

Run: `pnpm build`
Expected: PASS. If `tsc` rejects a subpath import (`@mastra/evals/scorers/utils`), confirm the package `exports` map has `./scorers/utils` (it does in 1.10.2) and that `tsconfig.node.json` / the Mastra tsconfig uses `moduleResolution: bundler`; do not weaken tsconfig. If `getContext`'s `run.input` type does not satisfy `isScorerRunInputForAgent(input: unknown)`, that is a real type error to investigate, not to cast around with `any`.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: PASS, no new warnings.

- [ ] **Step 5: Checkpoint**

No commit.

---

### Task 3: Attach to agent, register, smoke test

**Files:**
- Modify: `src/mastra/agents/release-copilot-agent.ts`
- Modify: `src/mastra/index.ts`

**Interfaces:**
- Consumes: `answerRelevancyScorer`, `hallucinationScorer` (from `../scorers/release-copilot-scorers`), `ANSWER_RELEVANCY_SCORER_NAME`, `HALLUCINATION_SCORER_NAME` (from `../../constants/agent-tools/scorers-name`).
- Produces: agent with live sampled scoring; `Mastra` instance with scorers in its registry.

- [ ] **Step 1: Wire the agent**

In `src/mastra/agents/release-copilot-agent.ts`, add imports after the `guardrail-processors` import:

```ts
import {
  ANSWER_RELEVANCY_SCORER_NAME,
  HALLUCINATION_SCORER_NAME,
} from '../../constants/agent-tools/scorers-name';
import {
  answerRelevancyScorer,
  hallucinationScorer,
} from '../scorers/release-copilot-scorers';
```

Add a `scorers` key after `inputProcessors: [promptInjectionDetector, piiDetector],`:

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

- [ ] **Step 2: Register on the Mastra instance**

In `src/mastra/index.ts`, add imports next to the existing constants imports:

```ts
import {
  ANSWER_RELEVANCY_SCORER_NAME,
  HALLUCINATION_SCORER_NAME,
} from '../constants/agent-tools/scorers-name';
import {
  answerRelevancyScorer,
  hallucinationScorer,
} from './scorers/release-copilot-scorers';
```

Add after the `tools: { ... },` block inside `new Mastra({ ... })`:

```ts
  scorers: {
    [ANSWER_RELEVANCY_SCORER_NAME]: answerRelevancyScorer,
    [HALLUCINATION_SCORER_NAME]: hallucinationScorer,
  },
```

- [ ] **Step 3: Lint and build**

Run: `pnpm lint && pnpm build`
Expected: both PASS clean.

- [ ] **Step 4: Smoke test scores are produced**

Run: `pnpm dev:mastra` (sets `MASTRA_AUTH_MODE=simple`, no Supabase needed). Open `http://localhost:4111`, open the Release Builder agent and chat:
1. Paste a short git log with 3 conventional commits and send `Draft release notes for GitHub`.
2. Send a follow-up without re-pasting: `Make it shorter`.
3. Send 2 to 3 more short follow-ups (hallucination is sampled at 0.5).

Expected: after a few seconds each turn, Studio's Scorers section lists `answerRelevancy` and `hallucination` with scores and reasons; `answerRelevancy` appears for every turn, `hallucination` for roughly half. Server log shows no scorer errors.

- [ ] **Step 5: Smoke test edit-turn context**

Open a `hallucination` score row for the `Make it shorter` turn (if that turn was sampled; otherwise repeat step 4 with new edit prompts until one is). Expected: score low (near 0, no "hallucinated" verdicts for claims that appear in the pasted log). A score near 1 means user messages from `rememberedMessages` are not reaching `getContext`; stop and debug `getContext` input via a temporary log line, then remove it.

- [ ] **Step 6: Stop the dev server, report**

Stop `pnpm dev:mastra`. Report to the user: lint/build results, the two smoke-test outcomes, and reminders that (a) `RELEASE_COPILOT_JUDGE_MODEL` must be added to prod/CI env, (b) nothing has been committed.

---

## Self-review

- **Spec coverage:** dependency (T1.2), judge env + `.env.example` + prod note (T1.4-1.6, T3.6), scorer keys (T2.1), scorers file with user-only context (T2.2), agent block with rates 1 / 0.5 (T3.1), registry (T3.2), verification lint/build + Studio smoke + edit-turn check (T3.3-3.5), feature branch and no commit (T1.1, constraints).
- **Placeholders:** none. The judge model id is fixed to `openai/gpt-5.4-mini` and verified against the registry in T1.3.
- **Type consistency:** `ANSWER_RELEVANCY_SCORER_NAME`, `HALLUCINATION_SCORER_NAME`, `answerRelevancyScorer`, `hallucinationScorer`, `RELEASE_COPILOT_JUDGE_MODEL` are named identically across all tasks.
