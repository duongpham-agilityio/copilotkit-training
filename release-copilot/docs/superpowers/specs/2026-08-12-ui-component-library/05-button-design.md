# `Button` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Primary/secondary/ghost action button. Exports the variant enum and its class map as
named exports so `IconButton` (next unit) can reuse the exact same variant styling
without duplicating the color logic.

## Files

- Create: `src/components/common/Button.tsx`

## API

```ts
export const enum ButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
  Ghost = 'ghost',
}

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  [ButtonVariant.Primary]: 'bg-primary text-on-primary hover:bg-primary/90',
  [ButtonVariant.Secondary]:
    'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80',
  [ButtonVariant.Ghost]: 'bg-transparent text-primary hover:bg-primary/10',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const Button = ({
  variant = ButtonVariant.Primary,
  className,
  ...rest
}: ButtonProps) => JSX.Element;
export default Button;
```

`ButtonProps` extends the native button attributes (spread via `...rest`) so `onClick`,
`disabled`, `type`, etc. work without re-declaring them.

## Base shape

`rounded-xl`, `px-4 py-2`, `text-label-md`, `font-medium`, `transition-colors`,
`disabled:opacity-50 disabled:pointer-events-none` (per `theme.md` button spec).

## Composes

`cn` (`src/lib/cn.ts`) to join base shape + `BUTTON_VARIANT_CLASSES[variant]` +
any passed-in `className`.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render all 3 variants. Confirm `Primary` background is the
  violet `--color-primary` (`#630ed4`), not the Figma mock's orange. Confirm `disabled`
  state visibly dims and the button stops responding to click.
