# `IconButton` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

32×32 icon-only button — reuses `Button`'s variant coloring so icon buttons and text
buttons stay visually consistent without duplicating the color map.

## Depends on

`Button.tsx` (unit 5) must already exist — imports `ButtonVariant` and
`BUTTON_VARIANT_CLASSES` from it.

## Files

- Create: `src/components/common/IconButton.tsx`

## API

```ts
import { ButtonVariant, BUTTON_VARIANT_CLASSES } from './Button.tsx';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: ButtonVariant;
}

const IconButton = ({
  icon,
  variant = ButtonVariant.Ghost,
  className,
  ...rest
}: IconButtonProps) => JSX.Element;
export default IconButton;
```

`aria-label` is required (not optional) — an icon-only button has no visible text, so a
missing label is an accessibility bug, not an edge case to silently allow. Default
variant is `Ghost` (icon buttons are usually secondary chrome actions, e.g. header
icons), overridable per call site.

## Base shape

`w-8 h-8`, `rounded-xl`, `inline-flex items-center justify-center`,
`disabled:opacity-50 disabled:pointer-events-none` — same disabled/transition treatment
as `Button`, sized square instead of padded.

## Composes

`cn`, `ButtonVariant`, `BUTTON_VARIANT_CLASSES` (from `Button.tsx`).

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render an `IconButton` with a placeholder SVG icon, confirm it's
  a 32×32 square, confirm `Ghost` variant background stays transparent until hover.
