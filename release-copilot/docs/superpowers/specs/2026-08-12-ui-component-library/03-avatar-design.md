# `Avatar` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Circular avatar. Renders `src` as an image when provided; otherwise falls back to the
first letter of `name` on a token-colored background (initials avatar) — used for commit
author and the header user.

## Files

- Create: `src/components/common/Avatar.tsx`

## API

```ts
export const enum AvatarSize {
  Sm = 'sm',
  Md = 'md',
}

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
}

const Avatar = ({ name, src, size = AvatarSize.Md }: AvatarProps) =>
  JSX.Element;
export default Avatar;
```

## Sizing

| `AvatarSize` | Dimensions | Text size (initials) |
| ------------ | ---------- | -------------------- |
| `Sm`         | `w-6 h-6`  | `text-label-sm`      |
| `Md`         | `w-8 h-8`  | `text-label-md`      |

Shape: `rounded-full`, `object-cover` on the `<img>` variant. Initials fallback:
`bg-secondary-container text-on-secondary-container`, first character of `name`
uppercased, centered.

## Composes

`cn` for size + shape classes.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render one `Avatar` with `src` (real image loads, circular, no
  stretch), one without `src` (initials letter centered, background is
  `secondary-container` token, not a hardcoded gray).
