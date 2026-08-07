# Conventions

## MUST

- Register every agent, tool, workflow, and scorer in `src/mastra/index.ts`. This is
  the most-violated rule — a resource that exists but isn't registered doesn't run.

## SHOULD

- Files: kebab-case for everything — `weather-tool.ts`, `platform-selector.tsx` —
  matching existing folders (`platform-selector/`, `release-notes/`).
- Components / Types / Interfaces: PascalCase.
- Variables / functions: camelCase.
- Mastra resource ids (`id: 'get-weather'` etc.): kebab-case, verb-first for tools.

## Structure

- Full folder-responsibility rules (what belongs in `src/lib/git/`, `src/lib/pr/`,
  `src/mastra/tools/`, `src/services/`, `src/types/`, etc.) live in the
  `release-notes-copilot` skill — load it for any work touching those folders instead
  of re-deriving structure here.
