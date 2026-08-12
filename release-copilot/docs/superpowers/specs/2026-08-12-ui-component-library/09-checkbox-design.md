# `Checkbox` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Custom-styled checkbox (native checkbox visually hidden, a styled box + SVG checkmark
rendered instead) — used for the commit pre-filter selection in `CommitListItem`.

## Files

- Create: `src/components/common/Checkbox.tsx`

## API

```ts
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label': string;
}

const Checkbox = ({ checked, onChange, ...rest }: CheckboxProps) => JSX.Element;
export default Checkbox;
```

`aria-label` required — the visible box carries no text, same rationale as
`IconButton`'s required `aria-label`.

## Markup

```tsx
<label className="inline-flex cursor-pointer items-center">
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onChange(e.target.checked)}
    className="peer sr-only"
    aria-label={ariaLabel}
  />
  <span
    className={cn(
      'border-outline-variant flex h-5 w-5 items-center justify-center rounded-md border',
      checked && 'bg-primary border-primary',
    )}
  >
    {checked && (
      <svg
        viewBox="0 0 16 16"
        className="stroke-on-primary h-3 w-3 fill-none stroke-2"
      >
        <path d="M3 8l3 3 7-7" />
      </svg>
    )}
  </span>
</label>
```

Real, native `<input type="checkbox">` visually hidden via `sr-only` (keeps keyboard/
screen-reader semantics) with the styled `<span>` reflecting `checked` state.

## Composes

`cn` for the conditional checked-state classes.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render one unchecked and one checked. Confirm checked state
  shows a violet-filled box with a white checkmark. Click to toggle, confirm `onChange`
  fires with the new boolean. Tab to the checkbox with keyboard, confirm it's focusable
  and togglable with Space (native input semantics, not a div-based fake).
