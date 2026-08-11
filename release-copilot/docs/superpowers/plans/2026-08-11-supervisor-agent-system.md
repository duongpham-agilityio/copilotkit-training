# Supervisor Multi-Agent System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Supervisor multi-agent system for Release Notes Copilot: 5 Mastra agents (Supervisor, Support, Analyze/Clean Input, Build Release, Check Grammar), 3 filesystem Skills carrying domain rules, and strict env-driven per-agent model config — no tools/workflows/UI wiring yet.

**Architecture:** A parent `supervisorAgent` holds the other 4 as subagents via the `agents` property and routes chat turns by delegation (Mastra's current subagent pattern, not the deprecated `.network()`). Each subagent that needs domain rules gets a filesystem `SKILL.md` skill; Check Grammar and the Supervisor use plain `instructions` only. Every agent's model comes from a required env var (`src/constants/models.ts`) — missing env throws at module load instead of silently defaulting.

**Tech Stack:** `@mastra/core` (Agent, Skills), `@mastra/memory` (Memory), Groq models via Mastra's model router (`groq/<model-id>` strings, `GROQ_API_KEY` already in `.env`). No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-11-supervisor-agent-system-design.md` — read it if anything below is ambiguous.
- Tools (`src/mastra/tools/`), pure lib logic (`src/lib/git`, `src/lib/pr`, `src/lib/format`, `src/lib/export`), workflows, and UI wiring are **out of scope**. Analyze/Clean Input and Build Release run on model reasoning + skill instructions only this pass.
- Model env vars have **no fallback** — `requireModelEnv()` throws `Missing required env var: <KEY>` if unset. `.env.example` documents the chosen defaults but the code never falls back to them.
- Relative imports inside `src/mastra/**` and from `src/mastra/**` into `src/constants/**` **omit the `.ts` extension**, matching the existing `weather-agent.ts` / `index.ts` pattern in this exact directory tree — this deliberately diverges from the repo-wide "explicit `.ts` extensions" rule in `.agents/rules/code-style.md`, because that rule is only proven to work on the Vite/React side (`src/main.tsx` etc.); the Mastra-tree scaffold code already omits extensions consistently and there's no evidence Mastra's own bundler (`mastra build`/`mastra dev`, separate from `vite build`) handles extensioned specifiers. Don't introduce a new convention inside a directory that already has one.
- No new `*_AGENT_ID` constants in `src/constants/agents.ts` this pass — each of the 5 new registry keys is used in exactly one place (`index.ts`), so per the project's constants rule (`.agents/rules/conventions.md`) it doesn't qualify for extraction. Each `Agent` gets a hardcoded kebab-case `id` matching its filename; `index.ts` registers all of them via object shorthand.
- Skill paths in each agent's `skills: [...]` array resolve relative to `process.cwd()` (Mastra's `LocalSkillSource` default base path), **not** relative to the agent file — always write them as `'./src/mastra/skills/<name>'`.
- Build Release always renders all 3 platforms (GitHub, App Store/TestFlight, Google Play) in one pass, regardless of which platform is selected in the UI.
- Check Grammar always runs automatically right after Build Release, on every draft and every edit — the Supervisor's instructions must never skip it.
- `pnpm lint` and `pnpm build` (`tsc -b && vite build`) must pass clean — this is the project's required gate (`.agents/rules/code-style.md`). Neither script invokes `mastra build`/`mastra dev`, so this plan doesn't require a live Mastra server to verify types.
- No test framework is installed in this repo (no vitest/jest). Verification uses `pnpm build`/`pnpm lint` (type/lint correctness) plus targeted `node --experimental-strip-types` runtime checks for real logic (`requireModelEnv`), matching how `docs/superpowers/plans/2026-08-07-project-scaffold.md` verified its own non-code-logic tasks.

---

### Task 1: Model env config

**Files:**

- Create: `src/constants/models.ts`
- Modify: `.env.example`

**Interfaces:**

- Consumes: nothing
- Produces: `requireModelEnv(key: string): string` (throws if unset) and 5 exported string constants — `SUPERVISOR_MODEL`, `SUPPORT_MODEL`, `ANALYZE_INPUT_MODEL`, `BUILD_RELEASE_MODEL`, `CHECK_GRAMMAR_MODEL` — consumed by every agent file in Tasks 3–7.

- [ ] **Step 1: Write `src/constants/models.ts`**

```ts
const requireModelEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const SUPERVISOR_MODEL = requireModelEnv('SUPERVISOR_MODEL');
export const SUPPORT_MODEL = requireModelEnv('SUPPORT_MODEL');
export const ANALYZE_INPUT_MODEL = requireModelEnv('ANALYZE_INPUT_MODEL');
export const BUILD_RELEASE_MODEL = requireModelEnv('BUILD_RELEASE_MODEL');
export const CHECK_GRAMMAR_MODEL = requireModelEnv('CHECK_GRAMMAR_MODEL');
```

- [ ] **Step 2: Add the 5 keys to `.env.example`**

Read `.env.example` first, then append after the existing `GROQ_API_KEY=` line (before `MASTRA_PLATFORM_ACCESS_TOKEN`), so the file reads:

```
GROQ_API_KEY=
SUPERVISOR_MODEL=groq/openai/gpt-oss-120b
SUPPORT_MODEL=groq/llama-3.1-8b-instant
ANALYZE_INPUT_MODEL=groq/llama-3.1-8b-instant
BUILD_RELEASE_MODEL=groq/openai/gpt-oss-20b
CHECK_GRAMMAR_MODEL=groq/llama-3.1-8b-instant
MASTRA_PLATFORM_ACCESS_TOKEN=
MASTRA_PROJECT_ID=
VITE_COPILOTKIT_RUNTIME_URL=http://localhost:4111/copilotkit
```

- [ ] **Step 3: Add the same 5 keys to your local `.env`**

Read `.env` first (never print its values), then append the same 5 keys with the same values shown in Step 2 (the chosen Groq model strings) — without these, `pnpm dev:mastra` will throw on startup once agents import `models.ts`.

- [ ] **Step 4: Verify `requireModelEnv` throws when unset**

Run:

```bash
env -u SUPERVISOR_MODEL -u SUPPORT_MODEL -u ANALYZE_INPUT_MODEL -u BUILD_RELEASE_MODEL -u CHECK_GRAMMAR_MODEL \
node --experimental-strip-types -e "
import('file://' + process.cwd() + '/src/constants/models.ts')
  .then(() => console.log('NO ERROR — BUG'))
  .catch(e => console.log('THROWN:', e.message));
" 2>&1 | tail -1
```

Expected: `THROWN: Missing required env var: SUPERVISOR_MODEL` (the first constant evaluated) — confirms the throw fires when env vars are absent. `env -u` guarantees they're unset for this one command regardless of what's exported in your shell; the `-e` subprocess doesn't load `.env` either way (no dotenv loader in this bare invocation).

- [ ] **Step 5: Verify it resolves once env vars are set**

Run:

```bash
SUPERVISOR_MODEL=groq/openai/gpt-oss-120b SUPPORT_MODEL=groq/llama-3.1-8b-instant \
ANALYZE_INPUT_MODEL=groq/llama-3.1-8b-instant BUILD_RELEASE_MODEL=groq/openai/gpt-oss-20b \
CHECK_GRAMMAR_MODEL=groq/llama-3.1-8b-instant \
node --experimental-strip-types -e "
import('file://' + process.cwd() + '/src/constants/models.ts')
  .then(m => console.log(m.SUPERVISOR_MODEL, m.CHECK_GRAMMAR_MODEL))
  .catch(e => console.log('THROWN:', e.message));
"
```

Expected: `groq/openai/gpt-oss-120b groq/llama-3.1-8b-instant`

- [ ] **Step 6: Type-check**

Run: `pnpm build`
Expected: exits 0 (only this new file exists so far; no other code references it yet)

- [ ] **Step 7: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 2: Skills

**Files:**

- Create: `src/mastra/skills/commit-classification/SKILL.md`
- Create: `src/mastra/skills/release-note-formatting/SKILL.md`
- Create: `src/mastra/skills/app-usage-faq/SKILL.md`

**Interfaces:**

- Consumes: classification and formatting rules from `.claude/skills/release-notes-copilot/SKILL.md` (already in this repo)
- Produces: 3 skill directories at fixed paths, consumed by Tasks 3–5 via each agent's `skills: ['./src/mastra/skills/<name>']`

- [ ] **Step 1: Write `src/mastra/skills/commit-classification/SKILL.md`**

```markdown
---
name: commit-classification
description: Use when classifying git-log commits or PR titles/descriptions into Feature, Fix, Breaking change, or excluded categories.
---

# Commit Classification

Classify each commit message or PR title using Conventional Commits prefixes:

- `feat:` / `feature:` → **Feature**
- `fix:` → **Fix**
- Any prefix followed by `!` (e.g. `feat!:`), or a `BREAKING CHANGE:` footer/section in
  the commit body or PR description → **Breaking change** (takes priority over its
  base type)
- `chore:`, `docs:`, `refactor:`, `test:` → excluded from release notes entirely

## PR titles without a Conventional Commits prefix

Fall back to keyword heuristics on the title, then the description if present:

- Contains "fix", "bug", "resolve", "patch" → **Fix**
- Contains "add", "new", "support for", "introduce" → **Feature**
- Contains "remove support", "drop", "no longer", or an explicit "breaking" mention →
  **Breaking change**
- No match → **Feature** (default — a merged PR shipped something worth mentioning
  unless it was clearly filtered out above)

## Priority

A single entry can only land in one bucket: Breaking change > Feature > Fix, in that
priority order.
```

- [ ] **Step 2: Write `src/mastra/skills/release-note-formatting/SKILL.md`**

```markdown
---
name: release-note-formatting
description: Use when rendering a release-notes draft for GitHub, App Store/TestFlight, or Google Play from a classified commit list, or when editing an existing draft.
---

# Release Note Formatting

Render the same classified, selected commit list into all 3 platform formats every
time — never just the one currently shown in the UI.

| Platform               | Format     | Constraints                                                                                                                                                                                                                         |
| ---------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub                 | Markdown   | Headed sections (`## Features`, `## Fixes`, `## Breaking Changes`), bold section headers, one emoji-prefixed bullet per entry (`✨` feature, `🐛` fix, `💥` breaking), commit IDs as inline code (`` `abc1234` ``), no length limit |
| App Store / TestFlight | Plain text | 4000 character limit total ("What's New" field); no markdown syntax, no emoji bullets; short lines using `-` or `•`                                                                                                                 |
| Google Play            | Plain text | 500 character limit; no markdown; most impactful changes first since it may get truncated                                                                                                                                           |

## Truncation rule

When a platform's character limit would be exceeded, prioritize Breaking changes,
then Features, then Fixes, dropping lowest-priority items first rather than
truncating mid-sentence.

## Editing an existing draft

When asked to revise a draft in place (tone, length, wording), apply the edit to the
already-rendered text without re-running commit classification, then re-render all 3
platform outputs from the edited content.
```

- [ ] **Step 3: Write `src/mastra/skills/app-usage-faq/SKILL.md`**

```markdown
---
name: app-usage-faq
description: Use when answering questions about how to use the Release Notes Copilot app itself — input sources, commit selection, copy/export, platform limits.
---

# App Usage FAQ

## Input sources

Paste either raw `git log` output or a PR title (optionally with a description) into
the chat. Both feed the same classification pipeline; only the parsing step differs.

## Commit selection

After classification, every entry appears in a commit list (author, relative
timestamp, hash, Feature/Fix/Breaking badge) with filter tabs (All/Feat/Fix) and a
per-entry checkbox. Only checked entries are used for drafting. Unchecking a commit
removes it from the pipeline entirely, not just from display. Changing the selection
re-triggers drafting on the new subset.

## Copy and export

The rendered draft for each platform can be copied with one click, or exported to
Markdown (`.md`), plain text (`.txt`), or JSON (structured, machine-readable). Export
always operates on the currently generated draft — it doesn't re-run classification.

## Platform character limits

- GitHub: no limit
- App Store/TestFlight: 4000 characters
- Google Play: 500 characters
```

- [ ] **Step 4: Verify all 3 files exist with valid frontmatter**

Run:

```bash
for f in commit-classification release-note-formatting app-usage-faq; do
  echo "== $f =="
  head -4 "src/mastra/skills/$f/SKILL.md"
done
```

Expected: each block starts with `---`, then a `name:` line matching the directory
name, then `description:`, then `---`.

- [ ] **Step 5: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 3: Support agent

**Files:**

- Create: `src/mastra/agents/support-agent.ts`

**Interfaces:**

- Consumes: `SUPPORT_MODEL` from `../../constants/models` (Task 1), `./src/mastra/skills/app-usage-faq` (Task 2)
- Produces: `export const supportAgent: Agent`, id `'support-agent'` — consumed by Task 7 (`supervisorAgent`'s `agents` property and `index.ts` registration)

- [ ] **Step 1: Write `src/mastra/agents/support-agent.ts`**

```ts
import { Agent } from '@mastra/core/agent';
import { SUPPORT_MODEL } from '../../constants/models';

export const supportAgent = new Agent({
  id: 'support-agent',
  name: 'Support Agent',
  description:
    'Answers questions about how to use the Release Notes Copilot app — input sources, commit selection, copy/export, platform character limits. Does not classify commits or draft/edit release notes.',
  instructions: `You are the support agent for Release Notes Copilot. Answer questions about how to use the app: pasting git-log or PR text, selecting commits with the filter tabs and checkboxes, copying the rendered draft, exporting to Markdown/plain text/JSON, and platform character limits. Use the app-usage-faq skill for exact details. Do not draft or edit release notes yourself — that is out of scope for you; tell the user the Supervisor will route drafting requests elsewhere.`,
  model: SUPPORT_MODEL,
  skills: ['./src/mastra/skills/app-usage-faq'],
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: exits 0

- [ ] **Step 3: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 4: Analyze/Clean Input agent

**Files:**

- Create: `src/mastra/agents/analyze-input-agent.ts`

**Interfaces:**

- Consumes: `ANALYZE_INPUT_MODEL` from `../../constants/models` (Task 1), `./src/mastra/skills/commit-classification` (Task 2)
- Produces: `export const analyzeInputAgent: Agent`, id `'analyze-input-agent'` — consumed by Task 7

- [ ] **Step 1: Write `src/mastra/agents/analyze-input-agent.ts`**

```ts
import { Agent } from '@mastra/core/agent';
import { ANALYZE_INPUT_MODEL } from '../../constants/models';

export const analyzeInputAgent = new Agent({
  id: 'analyze-input-agent',
  name: 'Analyze/Clean Input Agent',
  description:
    'Parses raw git-log output or a PR title/description and classifies each entry as Feature, Fix, Breaking change, or excluded. Returns a structured, badged commit list. Does not draft or format release notes.',
  instructions: `You receive raw git-log output or a PR title (optionally with a description). Parse it into individual commit/PR entries, then classify each one using the commit-classification skill. Return a structured list where each entry keeps its original message/title plus its classification badge (Feature, Fix, Breaking change) or a note that it was excluded and why. Do not draft release notes or apply platform formatting — that is the Build Release agent's job.`,
  model: ANALYZE_INPUT_MODEL,
  skills: ['./src/mastra/skills/commit-classification'],
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: exits 0

- [ ] **Step 3: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 5: Build Release agent

**Files:**

- Create: `src/mastra/agents/build-release-agent.ts`

**Interfaces:**

- Consumes: `BUILD_RELEASE_MODEL` from `../../constants/models` (Task 1), `./src/mastra/skills/release-note-formatting` (Task 2)
- Produces: `export const buildReleaseAgent: Agent`, id `'build-release-agent'` — consumed by Task 7

- [ ] **Step 1: Write `src/mastra/agents/build-release-agent.ts`**

```ts
import { Agent } from '@mastra/core/agent';
import { BUILD_RELEASE_MODEL } from '../../constants/models';

export const buildReleaseAgent = new Agent({
  id: 'build-release-agent',
  name: 'Build Release Agent',
  description:
    'Renders a release-notes draft for all 3 platforms (GitHub, App Store/TestFlight, Google Play) from a classified, selected commit list, and applies edit-in-place instructions to an existing draft. Does not classify commits itself.',
  instructions: `You receive a list of classified, selected commit/PR entries (Feature, Fix, or Breaking change) and render a release-notes draft for all 3 platforms at once, using the release-note-formatting skill: GitHub (Markdown), App Store/TestFlight (plain text, <= 4000 characters), Google Play (plain text, <= 500 characters). Always produce all 3, even if only one is currently shown in the UI. When asked to edit an existing draft (tone, length, wording), apply the edit to the existing text without re-classifying the source commits, then re-render all 3 platforms from the edited content. Do not check grammar yourself — that happens after you return control to the Supervisor.`,
  model: BUILD_RELEASE_MODEL,
  skills: ['./src/mastra/skills/release-note-formatting'],
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: exits 0

- [ ] **Step 3: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 6: Check Grammar agent

**Files:**

- Create: `src/mastra/agents/check-grammar-agent.ts`

**Interfaces:**

- Consumes: `CHECK_GRAMMAR_MODEL` from `../../constants/models` (Task 1)
- Produces: `export const checkGrammarAgent: Agent`, id `'check-grammar-agent'` — consumed by Task 7

- [ ] **Step 1: Write `src/mastra/agents/check-grammar-agent.ts`**

```ts
import { Agent } from '@mastra/core/agent';
import { CHECK_GRAMMAR_MODEL } from '../../constants/models';

export const checkGrammarAgent = new Agent({
  id: 'check-grammar-agent',
  name: 'Check Grammar Agent',
  description:
    'Polishes grammar and clarity of already-rendered release-notes text for all 3 platforms, without changing meaning, structure, or platform formatting rules.',
  instructions: `You receive rendered release-notes text for one or more platforms (GitHub Markdown, App Store/TestFlight plain text, Google Play plain text). Fix grammar, spelling, and awkward phrasing only. Do not change the meaning, add or remove bullet points, change section structure, or violate the platform's character limit or format (Markdown vs plain text). Return the corrected text for each platform you were given, in the same structure you received it.`,
  model: CHECK_GRAMMAR_MODEL,
});
```

No `skills` — this task is simple enough not to warrant a packaged skill (per the
design spec).

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: exits 0

- [ ] **Step 3: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 7: Supervisor agent + registration

**Files:**

- Create: `src/mastra/agents/supervisor-agent.ts`
- Modify: `src/mastra/index.ts`

**Interfaces:**

- Consumes: `SUPERVISOR_MODEL` from `../../constants/models` (Task 1); `supportAgent`, `analyzeInputAgent`, `buildReleaseAgent`, `checkGrammarAgent` (Tasks 3–6)
- Produces: `export const supervisorAgent: Agent`, id `'supervisor-agent'`; `index.ts` registers all 6 agents (5 new + existing `weatherAgent`)

- [ ] **Step 1: Write `src/mastra/agents/supervisor-agent.ts`**

```ts
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { supportAgent } from './support-agent';
import { analyzeInputAgent } from './analyze-input-agent';
import { buildReleaseAgent } from './build-release-agent';
import { checkGrammarAgent } from './check-grammar-agent';
import { SUPERVISOR_MODEL } from '../../constants/models';

export const supervisorAgent = new Agent({
  id: 'supervisor-agent',
  name: 'Supervisor Agent',
  instructions: `You coordinate the Release Notes Copilot chat using 4 specialized agents. You never parse, classify, format, or grammar-check text yourself — always delegate.

Available agents:
- analyzeInputAgent: parses raw git-log/PR text and classifies each entry (Feature/Fix/Breaking/excluded). Use when the user pastes raw git-log or PR text.
- buildReleaseAgent: renders a release-notes draft for all 3 platforms (GitHub, App Store/TestFlight, Google Play) from selected classified commits, or edits an existing draft in place. Use when the user asks to draft release notes, or asks to edit/revise an existing draft.
- checkGrammarAgent: polishes grammar on already-rendered text. Always call this immediately after buildReleaseAgent finishes, on its output, before replying to the user.
- supportAgent: answers questions about how to use the app itself (input sources, commit selection, copy/export, character limits). Use for general/how-to questions unrelated to drafting or editing.

Delegation strategy:
1. Raw git-log/PR text pasted -> delegate to analyzeInputAgent, return its classified commit list.
2. "Draft release notes" with commits already selected -> delegate to buildReleaseAgent, then delegate to checkGrammarAgent on the result, then return the polished 3-platform draft.
3. An edit instruction on an existing draft -> delegate to buildReleaseAgent for the edit, then checkGrammarAgent, then return.
4. A general app-usage question -> delegate to supportAgent only.

Success criteria: the user always gets a response from the right specialist, every draft or edit is grammar-checked before it reaches the user, and you never skip checkGrammarAgent after buildReleaseAgent.`,
  model: SUPERVISOR_MODEL,
  agents: {
    supportAgent,
    analyzeInputAgent,
    buildReleaseAgent,
    checkGrammarAgent,
  },
  memory: new Memory(),
});
```

- [ ] **Step 2: Register all 5 new agents in `src/mastra/index.ts`**

Read `src/mastra/index.ts` first. Add these imports after the existing
`import { weatherAgent } from './agents/weather-agent';` line:

```ts
import { supervisorAgent } from './agents/supervisor-agent';
import { supportAgent } from './agents/support-agent';
import { analyzeInputAgent } from './agents/analyze-input-agent';
import { buildReleaseAgent } from './agents/build-release-agent';
import { checkGrammarAgent } from './agents/check-grammar-agent';
```

Then change the `agents:` field of the `Mastra` constructor from:

```ts
  agents: { [WEATHER_AGENT_ID]: weatherAgent },
```

to:

```ts
  agents: {
    [WEATHER_AGENT_ID]: weatherAgent,
    supervisorAgent,
    supportAgent,
    analyzeInputAgent,
    buildReleaseAgent,
    checkGrammarAgent,
  },
```

- [ ] **Step 3: Type-check**

Run: `pnpm build`
Expected: exits 0

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: exits 0

- [ ] **Step 5: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 8: Full verification

**Files:** none (verification only)

**Interfaces:**

- Consumes: everything from Tasks 1–7
- Produces: nothing — this is the plan's final gate

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: exits 0, no TypeScript errors across the whole project

- [ ] **Step 2: Full lint**

Run: `pnpm lint`
Expected: exits 0, no new lint errors

- [ ] **Step 3: Confirm all 6 agents are registered**

Run: `grep -A8 "agents: {" src/mastra/index.ts`
Expected: shows `[WEATHER_AGENT_ID]: weatherAgent`, `supervisorAgent`, `supportAgent`,
`analyzeInputAgent`, `buildReleaseAgent`, `checkGrammarAgent` — all 6.

- [ ] **Step 4: Confirm every new agent file has a unique kebab-case `id`**

Run:

```bash
grep -h "^  id: " src/mastra/agents/{supervisor,support,analyze-input,build-release,check-grammar}-agent.ts
```

Expected: 5 lines, each a distinct kebab-case id matching its filename
(`'supervisor-agent'`, `'support-agent'`, `'analyze-input-agent'`,
`'build-release-agent'`, `'check-grammar-agent'`).

- [ ] **Step 5: Manual smoke test via Mastra Studio**

Run: `npm run dev:mastra` (ensure `.env` has all 5 model keys from Task 1, Step 3),
open `http://localhost:4111`, select `supervisorAgent`, and try 4 messages in
sequence:

1. Paste a small fake git log (e.g. `feat: add login\nfix: crash on submit`) — expect
   delegation to `analyzeInputAgent` and a classified list back.
2. "Draft release notes for these" — expect delegation to `buildReleaseAgent` then
   `checkGrammarAgent`, and a 3-platform draft back.
3. "Make it shorter" — expect an edit-in-place delegation, still through
   `checkGrammarAgent`.
4. "How do I export as JSON?" — expect delegation to `supportAgent` only, no drafting.

Stop the dev server afterward (`Ctrl+C`) — this step is informational, not a hard
gate (per the design spec, tool wiring isn't done yet, so classification/formatting
quality may be rough; the point is confirming routing goes to the right subagent).

- [ ] **Step 6: Final review of full change set**

Run: `git status --porcelain`
Expected: only files this plan created/modified appear — `src/constants/models.ts`,
`.env.example`, the 3 `SKILL.md` files under `src/mastra/skills/`, the 5 new agent
files under `src/mastra/agents/`, `src/mastra/index.ts`, plus this plan/spec under
`docs/superpowers/`. `.env` itself should NOT appear (already gitignored). No
unrelated changes.

- [ ] **Step 7: Save a checkpoint**

Save this working increment per your project's version control workflow.
