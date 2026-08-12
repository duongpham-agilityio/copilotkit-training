# `Input` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Bordered text input with an optional leading icon slot — used for the History screen's
search box.

## Files

- Create: `src/components/common/Input.tsx`

## API

```ts
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = ({ icon, className, ...rest }: InputProps) => JSX.Element;
export default Input;
```

Extends native input attributes (spread via `...rest`) — `value`, `onChange`,
`placeholder`, `type`, etc. all work without re-declaring them.

## Markup

```tsx
<div className="relative">
  {icon && (
    <span className="text-on-surface-variant absolute top-1/2 left-3 -translate-y-1/2">
      {icon}
    </span>
  )}
  <input
    className={cn(
      'border-outline-variant bg-surface-container-lowest w-full rounded-xl border',
      'text-body-md text-on-surface placeholder:text-on-surface-variant',
      'focus:ring-primary px-4 py-2 focus:ring-2 focus:outline-none',
      icon && 'pl-10',
      className,
    )}
    {...rest}
  />
</div>
```

## Composes

`cn` for the conditional left-padding (when `icon` is present) + passed-in `className`.

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render one `Input` without `icon` (placeholder text visible,
  standard padding) and one with a placeholder search-icon SVG (icon left-aligned,
  input text doesn't overlap it). Focus the input, confirm a visible violet focus ring.
