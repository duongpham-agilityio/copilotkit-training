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

## Structure

- Full folder-responsibility rules (what belongs in `src/lib/git/`, `src/lib/pr/`,
  `src/mastra/tools/`, `src/services/`, `src/types/`, etc.) live in the
  `release-notes-copilot` skill — load it for any work touching those folders instead
  of re-deriving structure here.
