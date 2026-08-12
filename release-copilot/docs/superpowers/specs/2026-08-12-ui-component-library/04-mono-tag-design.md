# `MonoTag` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Small monospace chip for short fixed-width tokens — currently only commit hashes
(`#a1b2c3d`). No variant prop: single fixed style, per `theme.md`'s mono-tag spec.

## Files

- Create: `src/components/common/MonoTag.tsx`

## API

```ts
interface MonoTagProps {
  children: string;
}

const MonoTag = ({ children }: MonoTagProps) => JSX.Element;
export default MonoTag;
```

`children: string` (not `React.ReactNode`) — a mono tag always renders a short literal
string (the hash), never nested elements.

## Styling

`font-mono`, `text-label-sm`, `bg-surface-container`, `text-on-surface-variant`,
`rounded-md`, `px-2 py-0.5` (per `theme.md` tokens — JetBrains Mono via the already
Google-Fonts-imported `font-mono` utility in `src/index.css`).

## Composes

Nothing beyond Tailwind utilities — no `cn` needed (no conditional classes, single fixed
class string).

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render `<MonoTag>a1b2c3d</MonoTag>` — confirm JetBrains Mono
  font renders (distinct from the Inter UI font elsewhere on the page).
