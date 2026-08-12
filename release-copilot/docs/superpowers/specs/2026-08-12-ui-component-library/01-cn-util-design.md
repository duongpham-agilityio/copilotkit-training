# `cn` util — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Single shared classname-join helper used by every component in this library. Filters
out falsy values (`false`/`null`/`undefined`) so conditional Tailwind classes can be
written inline without a template-literal mess.

## Files

- Create: `src/lib/cn.ts`

## API

```ts
type ClassValue = string | false | null | undefined;
export const cn = (...classes: ClassValue[]): string =>
  classes.filter(Boolean).join(' ');
```

No default export (utility, not a component) — named export per
`.agents/rules/code-style.md`.

## Composes

Nothing — leaf utility, zero dependencies.

## Out of scope

`clsx` / `tailwind-merge` are not used — see overview "Out of scope" for why. Do not add
class-conflict resolution here; components that need to avoid conflicting utility
strings (e.g. `Card`) use an explicit variant prop instead.

## Verification

- `pnpm lint` and `pnpm build` clean.
- No visual check possible (pure function) — confirm via a throwaway
  `console.log(cn('a', false, 'b', undefined, 'c'))` → `'a b c'` in a scratch file, not
  committed.
