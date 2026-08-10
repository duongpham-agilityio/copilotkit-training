# Conventions

## MUST

- Register every agent, tool, workflow, and scorer in `src/mastra/index.ts`. This is
  the most-violated rule — a resource that exists but isn't registered doesn't run.

## SHOULD

- Folders: kebab-case, always — `platform-selector/`, `release-notes/`, `lib/git/`.
  No exception (PascalCase never applies to folder names, even when the folder holds
  a PascalCase component file).
- Files: kebab-case by default — `weather-tool.ts`, `parse-git-log.ts`. Applies to
  every non-`.tsx` file regardless of what it exports (`.ts` tools, hooks, types,
  lib functions, config).
- `.tsx` files that default-export a React component: PascalCase filename matching
  the component identifier — `AppProviders.tsx`, `PlatformSelector.tsx`,
  `CommitList.tsx`. Applies per-file, not per-folder: a `platform-selector/` folder
  can contain `PlatformSelector.tsx` (the component) alongside kebab-case
  non-component files.
- `.tsx` files that do NOT default-export a component (route config objects, etc.):
  kebab-case, same as any other file — e.g. `router.tsx` exports `router`
  (a `createBrowserRouter` config, not a component), so it stays kebab-case.
- `main.tsx` is a fixed exception (Vite entrypoint convention, not a component file).
- Components / Types / Interfaces (the identifier, always — regardless of filename
  case): PascalCase.
- Variables / functions: camelCase.
- Mastra resource ids (`id: 'get-weather'` etc.): kebab-case, verb-first for tools.
- Exported constants (`src/constants/*`): SCREAMING_SNAKE_CASE, unlike the camelCase
  rule for ordinary variables.

## Constants (`src/constants/`)

- Extract a hardcoded literal into `src/constants/` when it is duplicated across ≥2
  files, OR when it forms an implicit contract between two otherwise-decoupled layers
  that the compiler can't verify — e.g. a string passed as a React prop on one side
  and used as an object key or backend route param on the other (a rename on one side
  fails silently at runtime, not at build time). Example: `WEATHER_AGENT_ID` in
  `src/constants/agents.ts`, shared between the Mastra agent registry key in
  `src/mastra/index.ts` and the `agentId` prop on `ChatSidebar.tsx`.
- Do NOT extract a literal used in exactly one place with no cross-module coupling
  risk just because it "looks like config" (e.g. a one-off CORS origin, a logger
  name) — that's indirection without payoff and violates the no-premature-abstraction
  rule in `.agents/rules/code-style.md`. Prefer extracting it anyway only when a
  reviewer would otherwise have to hunt through the file to find the value to tune it
  (deploy-time config, security-sensitive defaults) — use judgment, not the letter of
  this rule.
- One file per concern/purpose, not one catch-all `constants.ts` — filename mirrors
  what the constants are *for*, not what module imports them:
  `src/constants/agents.ts`, `src/constants/copilotkit.ts`,
  `src/constants/storage.ts`, `src/constants/server.ts`. Follow the kebab-case file
  rule above.
- These files are plain TS modules (no React, no Mastra imports) importable from both
  `src/mastra/` (server bundle) and `src/components/`/`src/providers/` (Vite client
  bundle) — that cross-boundary import is exactly what makes them useful for the
  shared-contract case above.

## Structure

- Full folder-responsibility rules (what belongs in `src/lib/git/`, `src/lib/pr/`,
  `src/mastra/tools/`, `src/services/`, `src/types/`, etc.) live in the
  `release-notes-copilot` skill — load it for any work touching those folders instead
  of re-deriving structure here.
