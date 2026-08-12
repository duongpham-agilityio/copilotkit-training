# `Card` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

White `rounded-3xl` container, the base surface for panels/list items throughout the
app. Takes an explicit `emphasis` enum instead of letting callers override shadow via
`className` — a className override would silently conflict with the default shadow
utility (which utility wins depends on Tailwind's internal layer order, not usage
order — a known footgun). `emphasis` removes the conflict entirely.

## Files

- Create: `src/components/common/Card.tsx`

## API

```ts
export const enum CardEmphasis {
  Raised = 'raised',
  Outlined = 'outlined',
}

interface CardProps {
  emphasis?: CardEmphasis;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const Card = ({
  emphasis = CardEmphasis.Raised,
  className,
  onClick,
  children,
}: CardProps) => JSX.Element;

interface CardHeaderProps {
  children: React.ReactNode;
}

const CardHeader = ({ children }: CardHeaderProps) => JSX.Element;

Card.Header = CardHeader;
export default Card;
```

`Card.Header` is a compound sub-component (attached as a static property on `Card`), not
a separately-imported component — usage is `<Card><Card.Header>...</Card.Header>...
</Card>`.

## Emphasis → classes

| `CardEmphasis` | Classes                                     |
| -------------- | ------------------------------------------- |
| `Raised`       | `shadow-xl border-none`                     |
| `Outlined`     | `shadow-none border border-outline-variant` |

Shared base: `bg-surface-container-lowest`, `rounded-3xl`, `p-6`. When `onClick` is
passed, the root `<div>` also gets `cursor-pointer` (added unconditionally via `cn` —
`onClick && 'cursor-pointer'`) and forwards `onClick` directly; when omitted, the div
has no click handler and no pointer cursor. `ReleaseHistoryListItem` (unit 20) is the
first consumer of this.

`CardHeader` base: `border-b border-outline-variant pb-4 mb-4` (bordered header slot,
per `theme.md` card spec).

## Composes

`cn` for base + emphasis + passed-in `className` (className here only ever adds
non-conflicting utilities like spacing/width overrides — never a competing
shadow/border utility, since `emphasis` already owns that).

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render one `Raised` card and one `Outlined` card side by side.
  Confirm `Raised` has a visible drop shadow and no border; confirm `Outlined` has a
  visible 1px border and no shadow. Render one with a `Card.Header` child — confirm the
  header's bottom border renders and content below is offset by `mb-4`.
