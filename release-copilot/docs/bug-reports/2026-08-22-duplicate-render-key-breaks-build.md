---
date: 2026-08-22
branch: practice-one
commit: (uncommitted)
files: [src/hooks/use-show-entry-list-tool.tsx]
severity: high
---

# Duplicate `render` key in `useShowEntryListTool` breaks `tsc -b`

## Summary

`useShowEntryListTool` passed two properties named `render` to the same
`useFrontendTool` object literal, which is a TypeScript grammar error (TS1117).
`pnpm build` fails at the `tsc -b` step, so the branch cannot produce a
production bundle.

## Root Cause

`src/hooks/use-show-entry-list-tool.tsx:60` and
`src/hooks/use-show-entry-list-tool.tsx:70` both declare a `render` key inside the
single object literal passed to `useFrontendTool`.

The first `render` (lines 60-69) is a leftover from the pre-fix version of this
hook. Commit `3a89953` ("fix: sync entry list in an effect instead of during tool
render") introduced the new JSX-returning `render` that delegates the state write
to an `EntryListSync` effect component, and stripped the `onEntryListShown(...)`
call out of the old `render` body — but never deleted the now-purposeless old
`render`. What remained was a string-returning stub with no side effect and no
reachable caller.

## Explanation

In a JavaScript object literal, a duplicated key is last-one-wins, so at runtime
the intended JSX `render` (line 70) is the one that survives — the behaviour
shipped by `3a89953` is in fact correct. The failure is purely at compile time:
TypeScript rejects duplicate properties in an object literal outright with TS1117,
and `tsc -b` exits non-zero before `vite build` ever runs.

It was not caught earlier because `3a89953` was merged without `pnpm build` passing,
and `tsc -b` is the only gate that can catch this class of error. ESLint cannot:
although `no-dupe-keys` ships enabled in `js.configs.recommended`,
`tseslint.configs.recommended` explicitly turns it back off for TS files on the
grounds that the compiler already reports it. `npx eslint --print-config` on this
file confirms `no-dupe-keys` resolves to `[0]`, and running ESLint against the
buggy file reports no problems. So neither `pnpm lint` nor the `eslint --fix`
lint-staged pre-commit hook could ever have flagged it.

## Solution

Delete the dead first `render` and keep the JSX one. This is the minimal correct
direction because the surviving `render` is already the intended post-`3a89953`
behaviour; merging the two would mean re-introducing the render-phase side effect
that `3a89953` deliberately removed.

## Solution Details

Removed lines 60-69 of `src/hooks/use-show-entry-list-tool.tsx`:

```tsx
    render: ({ args }) => {
      const result = EntryListToolSchema.safeParse(args);

      if (!result.success) {
        console.warn('[showEntryList] received invalid args', result.error);
        return 'Invalid entry list — state left unchanged.';
      }

      return 'Entry list displayed to the user.';
    },
```

Nothing else changed. The remaining `render` still validates `props.args` with
`EntryListToolSchema.safeParse` and still logs the same `[showEntryList] received
invalid args` warning on a parse failure, so no validation or diagnostic coverage
was lost with the deleted block. This is a real fix rather than a workaround: the
deleted code was unreachable under JavaScript's last-key-wins semantics, so removing
it changes zero runtime behaviour while making the file legal TypeScript.

## Verification

- `npx tsc -b --force` — exit code 0, no diagnostics. Before the fix the same
  command reported:
  `src/hooks/use-show-entry-list-tool.tsx(70,5): error TS1117: An object literal cannot have multiple properties with the same name.`
- `npx vite build` — succeeded, `✓ built in 1.41s`, emitted
  `dist/assets/index-BN8GUYJ8.js` (891.17 kB, gzip 269.47 kB). Only the pre-existing
  "chunks larger than 500 kB" advisory was printed.
- `npx eslint src .storybook eslint.config.js vite.config.ts` — 1 error, and it is
  pre-existing and unrelated: `no-empty` at
  `src/services/publish-to-slack.ts:43:13`. No error in the file changed here.

## Prevention

Three gaps let a build-breaking commit land, all worth closing:

1. **Gate merges on `pnpm build`, not just the pre-commit hook.** `.husky/pre-commit`
   runs `lint-staged`, which per `.lintstagedrc.json` runs `eslint --fix` and
   `prettier --write` on staged `*.{ts,tsx}`; `.husky/commit-msg` runs commitlint.
   Nothing runs a whole-program type-check, and as shown in Explanation ESLint is
   structurally incapable of catching a duplicate key in TS. `tsc -b` is the only
   thing that catches this, so it needs to run in CI or in a pre-push hook.
2. **Enable `strict` in `tsconfig.app.json`.** It is currently absent, which
   contradicts the "TypeScript strict" MUST in `.agents/rules/code-style.md`. This
   was measured, not assumed: with the duplicate key removed,
   `tsc` under `{ "extends": "./tsconfig.app.json", "compilerOptions": { "strict": true } }`
   reports 0 errors, as does the same config plus `noUncheckedIndexedAccess`. The
   flag can be turned on with no code changes.
3. **Repair `pnpm lint`, which is separately broken.** `eslint.config.js:11`
   declares `globalIgnores(['dist'])` only. ESLint flat config does not read
   `.gitignore`, so the lint run walks the gitignored `.mastra/` build output —
   including a 6.7 MB `.mastra/output/studio/assets/main-tYRi5VOV.js` and a 4.2 MB
   `.mastra/.build/entry-1.mjs` — and dies with
   `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`.
   Adding `.mastra`, `.vercel`, and `storybook-static` to `globalIgnores` restores
   the run; scoped to real source it finishes in seconds. This would not have caught
   the bug above, but it does mean the repo's `pnpm lint` MUST rule currently cannot
   be satisfied at all.
