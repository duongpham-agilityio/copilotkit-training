# Code Style

## MUST

- TypeScript strict. Don't weaken `tsconfig.app.json` (`noUnusedLocals`,
  `noUnusedParameters`, `verbatimModuleSyntax`) to silence an error — fix the code.
  Exception already made deliberately: `erasableSyntaxOnly` is off so fixed-set values
  can use `const enum` — see next bullet. Don't extend this exception to justify
  further weakening.
- Where a fixed set of values is needed as both a type and a runtime value (e.g. a
  `variant`/`size`/`emphasis` prop, a status/mode constant referenced elsewhere in
  code), use `const enum`, not a string-literal union — one place to add/rename a
  member instead of updating every literal call site. Note: this project's bundler
  (esbuild, via Vite) doesn't support cross-file const-enum inlining — it compiles
  `const enum` to the same runtime object as a plain `enum` — so pick `const enum` for
  the "declared as read-only, one canonical definition" intent, not for a code-size
  win. Plain string-literal unions are still fine for values that are only ever a type
  (never constructed or compared as a runtime value, e.g. narrowing an API response
  field).
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
