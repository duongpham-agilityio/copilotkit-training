# `Badge` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Generic colored pill. Purely presentational — it knows nothing about commit types or
release statuses. The feature layer (`commit-list/`, `history/`) maps its own domain
enum (`CommitType`, `ReleaseStatus`) to a `BadgeVariant` before rendering this.

## Files

- Create: `src/components/common/Badge.tsx`

## API

```ts
export const enum BadgeVariant {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Neutral = 'neutral',
}

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const Badge = ({ variant, children }: BadgeProps) => JSX.Element;
export default Badge;
```

`const enum`, not a string-literal union — per `.agents/rules/code-style.md`, so
`BadgeVariant` works as both the prop type and `BadgeVariant.Success` etc. as a value.

## Variant → token mapping

Per `docs/design/theme.md` (violet accent system, not the Figma mock's orange):

| Variant                | Background              | Text                      |
| ---------------------- | ----------------------- | ------------------------- |
| `BadgeVariant.Success` | `bg-success-emerald/10` | `text-success-emerald`    |
| `BadgeVariant.Error`   | `bg-error-rose/10`      | `text-error-rose`         |
| `BadgeVariant.Warning` | `bg-warning-purple/10`  | `text-warning-purple`     |
| `BadgeVariant.Neutral` | `bg-surface-container`  | `text-on-surface-variant` |

Shape: `rounded-full`, `px-3 py-1`, `text-label-sm` (per `theme.md` pill spec).

## Composes

`cn` (`src/lib/cn.ts`) for the base shape classes + variant classes.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check (see overview): render all 4 variants side by side ad hoc. Confirm
  `Success` renders emerald, not the Figma mock's orange; confirm `Warning` renders
  `warning-purple`, not amber/yellow (a plausible but wrong guess for "warning").
