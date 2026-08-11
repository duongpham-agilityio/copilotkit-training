# Supervisor Multi-Agent System Design

Date: 2026-08-11
Status: Approved

## Purpose

Replace the single "release-notes agent" concept (documented in the
`release-notes-copilot` skill as one agent orchestrating all tools) with a Supervisor
multi-agent system, per Mastra's current recommended pattern (`agents` property on a
parent `Agent` + `.stream()`/`.generate()` — `Agent.network()` is deprecated).

This is a practice/demo project for learning CopilotKit + Mastra. The design favors
demonstrating Mastra's subagent and Skills features clearly over minimizing agent
count.

## Scope

**In scope (this pass):**

- 5 agent definitions: Supervisor, Support, Analyze/Clean Input, Check Grammar, Build
  Release
- 3 filesystem Mastra Skills (`SKILL.md`) carrying domain rules
- Per-agent model configured via env var, required (no silent fallback)
- Agent ID constants
- Registration of all 5 agents in `src/mastra/index.ts`

**Out of scope (deferred to a later pass):**

- Mastra tools (`src/mastra/tools/`) and their backing pure logic (`src/lib/git/`,
  `src/lib/pr/`, `src/lib/format/`, `src/lib/export/`) — Analyze/Clean Input and Build
  Release run on model reasoning + skill instructions only for now, no real
  parsing/formatting code wired up yet
- Workflows (`src/mastra/workflows/`)
- Any UI wiring (`ChatSidebar.tsx` stays on `weatherAgent`; swapping it to
  `supervisorAgent` is a later integration pass)
- Removing/replacing the weather-agent demo

## Architecture

```
Supervisor agent (SUPERVISOR_MODEL)
├── Support agent          (SUPPORT_MODEL)
├── Analyze/Clean Input    (ANALYZE_INPUT_MODEL)
├── Build Release          (BUILD_RELEASE_MODEL)
└── Check Grammar          (CHECK_GRAMMAR_MODEL)
```

Supervisor holds `agents: { supportAgent, analyzeInputAgent, buildReleaseAgent,
checkGrammarAgent }` and `memory: new Memory()` (same pattern as `weather-agent.ts`).
Subagents don't get their own `Memory` instance — Mastra isolates each delegation to a
fresh thread automatically (per subagent docs).

## Agent responsibilities

**Supervisor agent** — routes chat messages, does not touch pipeline logic directly.
Delegation rules (in `instructions`):

- Raw git-log/PR text pasted → delegate to Analyze/Clean Input → return the classified
  commit list (for the commit-list UI to render; no further delegation yet)
- "Draft release notes" (commits already selected) → delegate to Build Release → then
  always delegate to Check Grammar on the result → return
- Edit instruction on an existing draft ("make it shorter", "less technical"...) →
  delegate to Build Release (edit-in-place, does not re-run classification) → then
  Check Grammar → return
- General app-usage question → delegate to Support agent only, no pipeline involved

**Support agent** — app FAQ only (how to export, character limits, how commit
selection works). Scoped away from the draft/edit pipeline entirely. Backed by the
`app-usage-faq` skill.

**Analyze/Clean Input agent** — takes raw git-log or PR text, parses and classifies
each entry per the `commit-classification` skill (feat/fix/breaking/excluded, PR
keyword fallback, Breaking > Feature > Fix priority). Returns a structured, badged
commit list. (Tool wiring to `src/lib/git`/`src/lib/pr` deferred — see Out of scope.)

**Build Release agent** — takes the selected/classified commits and always renders
**all 3 platforms in one pass** (GitHub Markdown, App Store/TestFlight plain text ≤
4000 chars, Google Play plain text ≤ 500 chars), per the `release-note-formatting`
skill. The platform-selector UI is view-only against this output — it does not trigger
a separate per-platform generation. Also handles edit-in-place requests against an
existing draft, re-rendering all 3 platforms. (Tool wiring to a future
`src/lib/format/` deferred.)

**Check Grammar agent** — polishes generated text for grammar/clarity. Runs
automatically after every Build Release call (draft or edit), across all 3 rendered
platform outputs, before the Supervisor returns to the user. Plain `instructions`, no
skill needed (task is simple enough not to warrant a packaged skill).

## Skills (Mastra filesystem `SKILL.md`)

| Skill directory                                      | Attached to         | Content                                                                                                                                                         |
| ---------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/mastra/skills/commit-classification/SKILL.md`   | Analyze/Clean Input | Classification rules from the `release-notes-copilot` skill: prefix rules, PR keyword fallback, Breaking > Feature > Fix priority                               |
| `src/mastra/skills/release-note-formatting/SKILL.md` | Build Release       | Per-platform format table: GitHub Markdown/emoji/headers, App Store/TestFlight 4000-char plain text, Google Play 500-char plain text, truncation priority order |
| `src/mastra/skills/app-usage-faq/SKILL.md`           | Support             | How to use the app: input sources, commit selection/filtering, copy, export formats (MD/TXT/JSON)                                                               |

Loaded via each agent's `skills: ['./skills/<name>']` (filesystem path skill, per
Mastra's Agent Skills spec — same format already used for `.agents/skills/` elsewhere
in this repo).

## Model configuration

New `src/constants/models.ts`. One constant per agent, read strictly from env — no
default fallback. A missing env var throws at startup instead of silently picking a
model:

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

`.env.example` gets all 5 keys pre-filled with the chosen defaults (documentation, not
a code fallback), so a fresh clone works after `cp .env.example .env`:

```
SUPERVISOR_MODEL=groq/openai/gpt-oss-120b
SUPPORT_MODEL=groq/llama-3.1-8b-instant
ANALYZE_INPUT_MODEL=groq/llama-3.1-8b-instant
BUILD_RELEASE_MODEL=groq/openai/gpt-oss-20b
CHECK_GRAMMAR_MODEL=groq/llama-3.1-8b-instant
```

`GROQ_API_KEY` is already present in `.env` and matches the provider's
`apiKeyEnvVar` — no additional key needed to switch models within Groq.

## File layout

```
src/constants/
  agents.ts        — add SUPERVISOR_AGENT_ID, SUPPORT_AGENT_ID, ANALYZE_INPUT_AGENT_ID,
                      BUILD_RELEASE_AGENT_ID, CHECK_GRAMMAR_AGENT_ID
  models.ts         (new) — per-agent model env config, see above
src/mastra/agents/
  supervisor-agent.ts     (new)
  support-agent.ts        (new)
  analyze-input-agent.ts  (new)
  build-release-agent.ts  (new)
  check-grammar-agent.ts  (new)
src/mastra/skills/
  commit-classification/SKILL.md      (new)
  release-note-formatting/SKILL.md    (new)
  app-usage-faq/SKILL.md              (new)
src/mastra/index.ts        — register all 5 agents (weather-agent stays registered too;
                              not removed this pass)
.env.example                — add 5 model env keys, pre-filled with defaults
```

Agent IDs: kebab-case (`supervisor-agent`, `analyze-input-agent`, etc.), matching
`weather-agent`. Files: kebab-case `.ts` in `src/mastra/agents/`, matching
`weather-agent.ts`.

## Error handling / testing notes

- Missing model env var throws at module load (`requireModelEnv`), fails fast instead
  of running with an unintended model.
- No new runtime error paths introduced beyond that — agents without tools can't fail
  on tool-call errors yet; that risk surface opens in the tools pass.
- `pnpm lint` + `pnpm build` (`tsc -b`) must pass clean, per project rules.
- Manual verification via Mastra Studio (`npm run dev` → `localhost:4111`): exercise
  each of the 4 Supervisor delegation branches (paste git log, draft, edit, ask a
  support question) and confirm routing goes to the right subagent.
