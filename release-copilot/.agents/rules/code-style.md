# Code Style

## MUST

- TypeScript strict. Don't weaken `tsconfig.app.json` (`noUnusedLocals`,
  `noUnusedParameters`, `verbatimModuleSyntax`) to silence an error — fix the code.
- `import type` for type-only imports (required by `verbatimModuleSyntax`).
- Explicit `.ts`/`.tsx` extensions on relative imports (bundler resolution style,
  already used in `src/main.tsx`).
- No `any`. Use `unknown` + narrowing, or a proper type/interface.
- Zod schema required on every Mastra tool's `inputSchema`/`outputSchema` — no bare
  `z.any()`.
- Use the `dev` and `build` scripts from `package.json` instead of running
  `mastra dev` / `mastra build` directly.
- `pnpm lint` and `pnpm build` (runs `tsc -b`) must both pass clean before calling work
  done.

## SHOULD

- Single quotes, semicolons, 2-space indent, trailing commas on multiline. Repo is
  currently mixed (Vite scaffold vs Mastra scaffold) — new code follows this; don't
  mass-reformat untouched files in an unrelated change. Doc-only — no Prettier/ESLint
  stylistic rule enforces this yet.
- Named exports for everything except React components, which keep default export
  (matches `App.tsx`).

## ES6

Doc-only, not tool-enforced. Applies to new code going forward — existing
`function App()` (`src/App.tsx`) and `function getWeatherCondition()`
(`src/mastra/tools/weather-tool.ts`) are not being retrofitted.

- Arrow function only — no `function` declaration/expression, including React
  components: `const Foo = () => {...}; export default Foo;`.
- `const` by default, `let` only when reassigned, never `var`.
- Destructure when reading 2+ fields from the same object instead of repeated dot
  access.
- Template literals for string interpolation, never `+` concatenation.
