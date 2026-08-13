# `cn` util — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Single shared classname-join helper used by every component in this library. Wraps
`clsx` (conditional class composition — filters falsy values, accepts arrays/objects)
and `tailwind-merge` (resolves conflicting Tailwind utility classes, last one wins) so
callers can pass a caller-supplied `className` alongside a component's own classes
without producing duplicate/conflicting utilities in the DOM.

## Files

- Create: `src/lib/cn.ts`

## API

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...classes: ClassValue[]): string => twMerge(clsx(classes));
```

No default export (utility, not a component) — named export per
`.agents/rules/code-style.md`.

## Composes

`clsx` and `tailwind-merge` — the library's only two runtime dependencies beyond React
itself.

## Out of scope

N/A — `clsx`/`tailwind-merge` are now in use (see overview "Out of scope" — decision
reversed 2026-08-12 at the user's explicit request during implementation).

## Verification

- `pnpm lint` and `pnpm build` clean.
- No visual check possible (pure function) — confirm via a throwaway
  `console.log(cn('a', false, 'b', undefined, 'c'))` → `'a b c'` in a scratch file, not
  committed.
