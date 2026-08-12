# `SplitPane` — Component Spec

Date: 2026-08-12
Status: Approved
Part of: [UI Component Library overview](./00-overview-design.md)

## Responsibility

Generic two-column grid with a configurable left/right width ratio. Powers the
Dashboard's Workspace/Copilot-sidebar split; generic enough for any future list/detail
split. Knows nothing about what's rendered in either pane.

## Files

- Create: `src/layouts/SplitPane.tsx`

## API

```ts
interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidthPercent?: number;
}

const SplitPane = ({ left, right, leftWidthPercent = 65 }: SplitPaneProps) =>
  JSX.Element;
export default SplitPane;
```

`leftWidthPercent` default `65` matches the Dashboard's Workspace/Copilot-sidebar ratio
in the Figma mock.

## Markup shape

```tsx
<div
  className="grid gap-6"
  style={{
    gridTemplateColumns: `${leftWidthPercent}% ${100 - leftWidthPercent}%`,
  }}
>
  <div>{left}</div>
  <div>{right}</div>
</div>
```

Inline `style` for the ratio (not a Tailwind class) — `leftWidthPercent` is a runtime
number, not one of a fixed set of Tailwind grid-template values, so there's no token to
reference.

## Composes

Nothing beyond its own props — pure layout primitive, no `cn` needed (no conditional
classes).

## Verification

- `pnpm lint` and `pnpm build` clean.
- Manual visual check: render with two placeholder blocks, default ratio — confirm left
  pane is visibly ~65% width and right ~35%. Pass `leftWidthPercent={50}`, confirm the
  split becomes even.
